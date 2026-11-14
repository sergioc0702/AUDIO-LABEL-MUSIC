/**
 * Bloques: the cover builds itself out of falling pieces while the song
 * plays, and the tower collapses when the song changes.
 *
 * Every position comes from the approved 360×820 prototype and is scaled to
 * the phone: x by width / 360, y by the usable height / 820.
 *
 * What runs where:
 * - The board's cells change only when a piece lands (about 25 times a
 *   song), so they are plain views re-rendered from JS.
 * - The falling piece, the bump, the shine and the collapse move on the UI
 *   thread from the scene clock, with transforms and opacity only.
 * - Worklets only read shared values and numbers; they never call JS
 *   functions (that crashed the Terror theme).
 */
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RepeatMode } from 'react-native-track-player';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { useColors } from '../../theme/theme';
import { Cover } from '../../ui/Cover';
import { formatTime } from '../../utils/formatTime';
import {
  BOARD_CELLS,
  blockPieces,
  piecesLanded,
  rowsCompleted,
} from './blockPieces';
import {
  DragHeader,
  SeekArea,
  usePlayerKit,
  type PlayerKit,
  type SkinProps,
} from '../../player/kit/playerKit';
import { Marquee } from '../../player/kit/Marquee';
import { useSceneClock, type SceneClock } from '../../player/kit/sceneClock';

const DISPLAY = 'RubikMonoOne-Regular';
const BODY = 'Rubik-Medium';
const BOLD = 'Rubik-Bold';

/** The prototype's canvas. */
const PW = 360;
const PH = 820;
const SEGMENTS = 20;

/** Song change: 0 to 1 while the old tower falls (change goes from 1 to 0). */
function changePhase(change: number) {
  'worklet';
  return change > 0 ? 1 - change : 1;
}

/** The five piece colors of the palette, with the ink that reads on each. */
function usePieceColors() {
  const { colors } = useColors();
  const s = colors.skin;
  return [
    { fill: s.p1, ink: s.onP1 },
    { fill: s.p2, ink: s.onP2 },
    { fill: s.p3, ink: s.onP3 },
    { fill: s.p4, ink: s.onP4 },
    { fill: s.p5, ink: s.onP5 },
  ];
}

/** The piece that falls now, from above the board to where it lands. */
function FallingPiece({
  clock,
  landed,
  cell,
}: {
  clock: SceneClock;
  landed: number;
  cell: number;
}) {
  const pieceColors = usePieceColors();
  const piece = blockPieces[landed];
  const minX = piece ? Math.min(...piece.map(([c]) => c)) : 0;
  const minY = piece ? Math.min(...piece.map(([, r]) => r)) : 0;
  const maxX = piece ? Math.max(...piece.map(([c]) => c)) : 0;
  const maxY = piece ? Math.max(...piece.map(([, r]) => r)) : 0;

  // Shared values, so the worklet only reads numbers it was given.
  const index = useSharedValue(landed);
  const endY = useSharedValue(minY * cell);
  const startX = useSharedValue(minX * cell);
  const lastX = useSharedValue((BOARD_CELLS - 1 - maxX) * cell);
  useEffect(() => {
    index.value = landed;
    endY.value = minY * cell;
    startX.value = minX * cell;
    lastX.value = (BOARD_CELLS - 1 - maxX) * cell;
  }, [cell, endY, index, landed, lastX, maxX, minX, minY, startX]);

  const fall = useAnimatedStyle(() => {
    const share = clock.progress.value * blockPieces.length - index.value;
    const drop = Math.min(1, Math.max(0, share / 0.85));
    const ease = drop * drop;
    const top = -cell * 3;
    // It slides a cell or so from side to side, then lines up to land.
    const slide =
      drop < 0.6
        ? Math.max(
            -startX.value,
            Math.min(lastX.value, Math.round(Math.sin(drop * 9) * 1.4) * cell),
          )
        : 0;
    const turn = drop < 0.5 ? (Math.round(drop * 6) % 4) * 90 : 0;
    return {
      opacity: share < 0 ? 0 : 1,
      transform: [
        { translateX: startX.value + slide },
        { translateY: top + (endY.value - top) * ease },
        { rotate: `${turn}deg` },
      ],
    };
  });

  if (!piece) return null;
  const color = pieceColors[landed % pieceColors.length].fill;
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.piece,
        {
          width: (maxX - minX + 1) * cell,
          height: (maxY - minY + 1) * cell,
        },
        fall,
      ]}
    >
      {piece.map(([c, r]) => (
        <View
          key={`${c}-${r}`}
          style={[
            styles.pieceCell,
            {
              left: (c - minX) * cell,
              top: (r - minY) * cell,
              width: cell,
              height: cell,
              backgroundColor: color,
              boxShadow: `0 0 12px ${color}`,
            },
          ]}
        />
      ))}
    </Animated.View>
  );
}

/** The board: the cover under a grid of cells that open as pieces land. */
function Board({
  clock,
  kit,
  size,
}: {
  clock: SceneClock;
  kit: PlayerKit;
  size: number;
}) {
  const { colors } = useColors();
  const s = colors.skin;
  const cell = size / BOARD_CELLS;
  const landed = piecesLanded(kit.progress);
  const rows = rowsCompleted(landed);

  // Which cells are open (their piece has landed). Only changes on a landing.
  const open = useMemo(() => {
    const set = new Set<string>();
    blockPieces
      .slice(0, landed)
      .forEach(piece => piece.forEach(([c, r]) => set.add(`${c}-${r}`)));
    return set;
  }, [landed]);

  // A small bump when a piece lands, and a shine when two rows fill up.
  const bump = useSharedValue(0);
  const shine = useSharedValue(0);
  const lastLanded = useRef(landed);
  useEffect(() => {
    if (landed > lastLanded.current) {
      bump.value = withSequence(
        withTiming(3, { duration: 70 }),
        withTiming(0, { duration: 160 }),
      );
      if (landed % 5 === 0) {
        shine.value = withSequence(
          withTiming(1, { duration: 180 }),
          withTiming(0, { duration: 520 }),
        );
      }
    }
    lastLanded.current = landed;
  }, [bump, landed, shine]);
  const bumped = useAnimatedStyle(() => ({
    transform: [{ translateY: bump.value }],
  }));
  const shined = useAnimatedStyle(() => ({ opacity: shine.value }));

  // The old cover falls apart, column by column, when the song changes.
  const [rubble, setRubble] = useState<string | null | undefined>(undefined);
  const previous = useRef(kit.track?.artwork);
  const previousId = useRef(kit.track?.id);
  useEffect(() => {
    const id = kit.track?.id;
    if (previousId.current && id !== previousId.current && !clock.reduced) {
      setRubble(previous.current ?? null);
      const timer = setTimeout(() => setRubble(undefined), 1300);
      previous.current = kit.track?.artwork;
      previousId.current = id;
      return () => clearTimeout(timer);
    }
    previous.current = kit.track?.artwork;
    previousId.current = id;
  }, [clock.reduced, kit.track?.artwork, kit.track?.id]);

  const uri = kit.track?.artwork;
  const cells = [];
  for (let r = 0; r < BOARD_CELLS; r += 1) {
    for (let c = 0; c < BOARD_CELLS; c += 1) {
      const isOpen = open.has(`${c}-${r}`);
      cells.push(
        <View
          key={`${c}-${r}`}
          style={[
            styles.cell,
            {
              left: c * cell,
              top: r * cell,
              width: cell,
              height: cell,
            },
            isOpen
              ? styles.openCell
              : { backgroundColor: s.empty, borderColor: s.emptyLine },
          ]}
        />,
      );
    }
  }

  return (
    <Animated.View
      accessibilityLabel={`Portada de ${kit.track?.title ?? ''}`}
      accessibilityRole="image"
      accessible
      style={[
        styles.boardInner,
        { width: size, height: size, backgroundColor: s.board },
        bumped,
      ]}
    >
      {uri ? (
        <Image
          fadeDuration={0}
          resizeMethod="resize"
          source={{ uri }}
          style={{ width: size, height: size }}
        />
      ) : (
        <Svg height={size} viewBox="0 0 100 100" width={size}>
          <Rect fill={s.p2} height={100} width={100} />
          <Circle cx={64} cy={38} fill={s.p3} r={17} />
          <Path
            d="M0 72 L 20 56 L 34 64 L 50 46 L 66 60 L 82 48 L 100 58 L 100 100 L 0 100 Z"
            fill={s.p1}
          />
        </Svg>
      )}
      {cells}
      {kit.isPlaying || landed > 0 ? (
        <FallingPiece cell={cell} clock={clock} landed={landed} />
      ) : null}
      <Animated.View
        pointerEvents="none"
        style={[
          styles.shine,
          { top: (BOARD_CELLS - rows) * cell, height: cell * 2 },
          shined,
        ]}
      />
      {rubble !== undefined ? (
        <Rubble cell={cell} clock={clock} size={size} uri={rubble} />
      ) : null}
      {!kit.isPlaying ? (
        <View pointerEvents="none" style={styles.pause}>
          <Text style={styles.pauseText}>PAUSA</Text>
        </View>
      ) : null}
    </Animated.View>
  );
}

/** One falling column of the old cover. */
function RubbleColumn({
  clock,
  uri,
  column,
  cell,
  size,
}: {
  clock: SceneClock;
  uri: string | null;
  column: number;
  cell: number;
  size: number;
}) {
  const { colors } = useColors();
  const tilt = (column % 2 ? 1 : -1) * (10 + column * 4);
  const delay = column * 0.04;
  const style = useAnimatedStyle(() => {
    const p = changePhase(clock.change.value);
    const t = Math.min(1, Math.max(0, (p - delay) / 0.7));
    return {
      opacity: 1 - t,
      transform: [
        { translateY: t * t * size * 1.4 },
        { rotate: `${tilt * t}deg` },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        styles.column,
        { left: column * cell, width: cell, height: size },
        style,
      ]}
    >
      {uri ? (
        <Image
          fadeDuration={0}
          resizeMethod="resize"
          source={{ uri }}
          style={{ width: size, height: size, marginLeft: -column * cell }}
        />
      ) : (
        <View
          style={[StyleSheet.absoluteFill, { backgroundColor: colors.skin.p2 }]}
        />
      )}
    </Animated.View>
  );
}

function Rubble({
  clock,
  uri,
  cell,
  size,
}: {
  clock: SceneClock;
  uri: string | null;
  cell: number;
  size: number;
}) {
  return (
    <View pointerEvents="none" style={StyleSheet.absoluteFill}>
      {Array.from({ length: BOARD_CELLS }, (_, column) => (
        <RubbleColumn
          key={column}
          cell={cell}
          clock={clock}
          column={column}
          size={size}
          uri={uri}
        />
      ))}
    </View>
  );
}

/** A chunky block button with a light top edge and a dark bottom edge. */
function Block({
  label,
  color,
  style,
  disabled,
  selected,
  onPress,
  children,
}: {
  label: string;
  color: string;
  style: object;
  disabled?: boolean;
  selected?: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={selected === undefined ? undefined : { selected }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.block,
        style,
        {
          backgroundColor: color,
          opacity: disabled ? 0.5 : 1,
          transform: [{ translateY: pressed ? 3 : 0 }],
        },
      ]}
    >
      {children}
    </Pressable>
  );
}

/** Timer, speed, equalizer and the song menu. */
function MoreSheet({ kit, onClose }: { kit: PlayerKit; onClose: () => void }) {
  const { colors } = useColors();
  const s = colors.skin;
  const insets = useSafeAreaInsets();
  const rows = [
    {
      key: 'sleep',
      label: 'Temporizador',
      value: kit.sleepOn ? kit.sleepCaption : 'Apagado',
      onPress: kit.openSleep,
    },
    {
      key: 'speed',
      label: 'Velocidad',
      value: `${kit.rate}×`,
      onPress: kit.openSpeed,
    },
    {
      key: 'eq',
      label: 'Ecualizador',
      value: kit.equalizerOn ? 'Activado' : 'Apagado',
      onPress: kit.openEqualizer,
    },
    {
      key: 'menu',
      label: 'Más acciones de la canción',
      value: '›',
      onPress: kit.openMenu,
    },
  ];
  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable
        accessibilityLabel="Cerrar opciones"
        accessibilityRole="button"
        onPress={onClose}
        style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]}
      />
      <View
        style={[
          styles.sheet,
          {
            bottom: insets.bottom + 16,
            backgroundColor: s.panel,
            borderBottomColor: s.frameDark,
          },
        ]}
      >
        <Text style={[styles.sheetTitle, { color: s.ink }]}>MÁS OPCIONES</Text>
        {rows.map(row => (
          <Pressable
            key={row.key}
            accessibilityLabel={`${row.label}: ${row.value}`}
            accessibilityRole="button"
            onPress={() => {
              onClose();
              row.onPress();
            }}
            style={[styles.sheetRow, { borderTopColor: s.grid }]}
          >
            <Text style={[styles.sheetLabel, { color: s.ink }]}>
              {row.label}
            </Text>
            <Text style={[styles.sheetValue, { color: s.sub }]}>
              {row.value}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function BloquesPlayer({ covered, headerGesture, onClose }: SkinProps) {
  const kit = usePlayerKit({ covered });
  const clock = useSceneClock(kit, {
    boost: 0,
    changeSeconds: 1.2,
    baseWidth: PW,
  });
  const { width, height } = useWindowDimensions();
  const { colors } = useColors();
  const insets = useSafeAreaInsets();
  const pieceColors = usePieceColors();
  const [more, setMore] = useState(false);

  if (!kit.track) return null;
  const s = colors.skin;
  const H = height - insets.top - insets.bottom;
  const sx = width / PW;
  const y = (v: number) => (v / PH) * H;
  // The board stays square; it shrinks if the phone is short.
  const board = Math.min(280 * sx, y(280));
  const frame = board + 12;
  const landed = piecesLanded(kit.progress);
  const rows = rowsCompleted(landed);
  const lit = Math.round(kit.progress * SEGMENTS);
  const nextIndex = kit.queueIndex + 1;
  const upNext = kit.queue[nextIndex];
  const repeatOne = kit.repeatMode === RepeatMode.Track;
  const level = String(Math.max(1, kit.queueIndex + 1)).padStart(2, '0');
  const icon = (d: string, color: string) => (
    <Svg fill="none" height={20} viewBox="0 0 24 24" width={20}>
      <Path
        d={d}
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.2}
      />
    </Svg>
  );
  const tools = [
    {
      key: 'queue',
      caption: 'Cola',
      label: `Abrir cola de reproducción con ${kit.queueCount} canciones`,
      d: 'M4 6h12M4 12h12M4 18h8M18 18V9l3-1',
      on: undefined,
      onPress: kit.openQueue,
    },
    {
      key: 'lyrics',
      caption: 'Letras',
      label: `Abrir letras de ${kit.track.title}`,
      d: 'M5 4h10l4 4v12H5zM9 11h6M9 15h4',
      on: undefined,
      onPress: kit.openLyrics,
    },
    {
      key: 'shuffle',
      caption: 'Mezcla',
      label: kit.shuffle ? 'Desactivar mezcla' : 'Activar mezcla',
      d: 'M3 6h4l10 12h4M3 18h4l3-3.6M14 9.6L17 6h4M18 3l3 3-3 3M18 15l3 3-3 3',
      on: kit.shuffle,
      onPress: kit.toggleShuffle,
    },
    {
      key: 'repeat',
      caption: repeatOne ? 'Una' : 'Repetir',
      label: kit.repeatLabel,
      d: 'M4 11V9a3 3 0 0 1 3-3h11M15 3l3 3-3 3M20 13v2a3 3 0 0 1-3 3H6M9 21l-3-3 3-3',
      on: kit.repeatOn,
      onPress: kit.cycleRepeat,
    },
  ];

  return (
    <View
      style={[styles.player, { backgroundColor: s.bg, paddingTop: insets.top }]}
    >
      <DragHeader gesture={headerGesture} style={styles.header}>
        <Pressable
          accessibilityLabel="Cerrar reproductor"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.headerButton}
        >
          <Svg fill="none" height={24} viewBox="0 0 24 24" width={24}>
            <Path
              d="M5 9l7 7 7-7"
              stroke={s.ink}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.6}
            />
          </Svg>
        </Pressable>
        <View style={styles.headerInfo}>
          <Text numberOfLines={1} style={[styles.heading, { color: s.ink }]}>
            BLOQUES
          </Text>
          <Text numberOfLines={1} style={[styles.source, { color: s.sub }]}>
            Nivel {level} · {kit.sourceLabel} · {kit.queueCount} canciones
          </Text>
        </View>
        <Pressable
          accessibilityLabel={
            kit.favorite ? 'Quitar de favoritas' : 'Añadir a favoritas'
          }
          accessibilityRole="button"
          onPress={kit.toggleFavorite}
          style={styles.headerButton}
        >
          <Svg height={24} viewBox="0 0 24 24" width={24}>
            <Path
              d="M12 20s-7-4.4-9-9.2C1.7 7.4 4 4 7.3 4c2 0 3.6 1.1 4.7 2.8C13.1 5.1 14.7 4 16.7 4 20 4 22.3 7.4 21 10.8 19 15.6 12 20 12 20z"
              fill={kit.favorite ? s.accent : 'none'}
              stroke={kit.favorite ? s.accent : s.ink}
              strokeLinejoin="round"
              strokeWidth={2.2}
            />
          </Svg>
        </Pressable>
        <Pressable
          accessibilityLabel="Más opciones: temporizador, velocidad, ecualizador y acciones"
          accessibilityRole="button"
          onPress={() => setMore(true)}
          style={styles.headerButton}
        >
          <Svg height={24} viewBox="0 0 24 24" width={24}>
            <Rect fill={s.ink} height={5} rx={1.2} width={5} x={3} y={10} />
            <Rect fill={s.ink} height={5} rx={1.2} width={5} x={9.5} y={10} />
            <Rect fill={s.ink} height={5} rx={1.2} width={5} x={16} y={10} />
          </Svg>
        </Pressable>
      </DragHeader>

      <View
        onLayout={clock.onLayout}
        style={[
          styles.frame,
          {
            marginTop: y(10),
            width: frame,
            height: frame,
            backgroundColor: s.frame,
            borderBottomColor: s.frameDark,
          },
        ]}
      >
        <Board clock={clock} kit={kit} size={board} />
      </View>

      <View style={[styles.titleBox, { marginTop: y(12) }]}>
        <Marquee
          center
          clock={clock}
          height={30}
          style={[styles.title, { color: s.ink }]}
          text={kit.track.title}
        />
        <Text numberOfLines={1} style={[styles.artist, { color: s.sub }]}>
          {kit.track.artist}
        </Text>
      </View>

      <View style={[styles.score, { marginTop: y(12) }]}>
        <View
          style={[styles.tile, styles.rowsTile, { backgroundColor: s.panel }]}
        >
          <Text style={[styles.tileHead, { color: s.sub }]}>FILAS</Text>
          <Text numberOfLines={1} style={[styles.tileBig, { color: s.ink }]}>
            {String(rows).padStart(2, '0')}
            <Text style={[styles.tileSmall, { color: s.sub }]}>/10</Text>
          </Text>
        </View>
        {upNext ? (
          <Pressable
            accessibilityLabel={`Siguiente: ${upNext.title}`}
            accessibilityRole="button"
            onPress={() => kit.playQueueTrack(nextIndex)}
            style={[styles.tile, styles.nextTile, { backgroundColor: s.panel }]}
          >
            <Cover size={40} uri={upNext.artwork} />
            <View style={styles.nextText}>
              <Text style={[styles.tileHead, { color: s.sub }]}>SIGUIENTE</Text>
              <Text
                numberOfLines={1}
                style={[styles.nextTitle, { color: s.ink }]}
              >
                {upNext.title}
              </Text>
            </View>
          </Pressable>
        ) : (
          <View
            style={[styles.tile, styles.nextTile, { backgroundColor: s.panel }]}
          >
            <Text style={[styles.tileHead, { color: s.sub }]}>
              ÚLTIMA DE LA COLA
            </Text>
          </View>
        )}
        <View
          style={[styles.tile, styles.timeTile, { backgroundColor: s.panel }]}
        >
          <Text style={[styles.tileHead, { color: s.sub }]}>TIEMPO</Text>
          <Text numberOfLines={1} style={[styles.tileTime, { color: s.ink }]}>
            {formatTime(kit.position)}
          </Text>
        </View>
      </View>

      <SeekArea kit={kit} style={[styles.seek, { marginTop: y(8) }]}>
        <View pointerEvents="none" style={styles.segments}>
          {Array.from({ length: SEGMENTS }, (_, i) => (
            <View
              key={i}
              style={[
                styles.segment,
                i < lit
                  ? [
                      styles.segmentOn,
                      {
                        backgroundColor:
                          pieceColors[i % pieceColors.length].fill,
                      },
                    ]
                  : { backgroundColor: s.empty, borderColor: s.emptyLine },
              ]}
            />
          ))}
        </View>
      </SeekArea>
      <View style={styles.times}>
        <Text style={[styles.time, { color: s.sub }]}>
          {formatTime(kit.position)}
        </Text>
        <Text style={[styles.time, { color: s.sub }]}>
          {formatTime(kit.duration)}
        </Text>
      </View>

      <View style={styles.grow} />

      <View style={styles.transport}>
        <Block
          color={s.b2}
          disabled={!kit.ready || kit.busy}
          label="Canción anterior"
          onPress={kit.previous}
          style={styles.side}
        >
          <Svg height={22} viewBox="0 0 30 22" width={30}>
            <Path
              d="M14 2 L 3 11 L 14 20 Z M 27 2 L 16 11 L 27 20 Z"
              fill={s.onB2}
            />
          </Svg>
        </Block>
        <Block
          color={s.accent}
          disabled={!kit.ready}
          label={kit.isPlaying ? 'Pausar' : 'Reproducir'}
          onPress={kit.toggle}
          style={styles.play}
        >
          <Svg height={32} viewBox="0 0 30 30" width={32}>
            {kit.isPlaying ? (
              <>
                <Rect
                  fill={s.onAccent}
                  height={20}
                  rx={2}
                  width={7}
                  x={6}
                  y={5}
                />
                <Rect
                  fill={s.onAccent}
                  height={20}
                  rx={2}
                  width={7}
                  x={17}
                  y={5}
                />
              </>
            ) : (
              <Path d="M8 4 L 26 15 L 8 26 Z" fill={s.onAccent} />
            )}
          </Svg>
        </Block>
        <Block
          color={s.b3}
          disabled={!kit.ready || kit.busy}
          label="Siguiente canción"
          onPress={kit.next}
          style={styles.side}
        >
          <Svg height={22} viewBox="0 0 30 22" width={30}>
            <Path
              d="M3 2 L 14 11 L 3 20 Z M 16 2 L 27 11 L 16 20 Z"
              fill={s.onB3}
            />
          </Svg>
        </Block>
      </View>

      <View style={[styles.tools, { marginTop: y(14) }]}>
        {tools.map((tool, i) => {
          const on = tool.on === true;
          const color = pieceColors[i % pieceColors.length];
          const ink = on ? color.ink : s.ink;
          return (
            <Block
              key={tool.key}
              color={on ? color.fill : s.panel}
              label={tool.label}
              onPress={tool.onPress}
              selected={tool.on}
              style={styles.tool}
            >
              {icon(tool.d, ink)}
              <Text numberOfLines={1} style={[styles.toolText, { color: ink }]}>
                {tool.caption}
              </Text>
            </Block>
          );
        })}
      </View>

      <Text
        style={[
          styles.footer,
          { color: s.sub, marginBottom: insets.bottom + 8 },
        ]}
      >
        COMPLETA LA PORTADA
      </Text>

      {more ? <MoreSheet kit={kit} onClose={() => setMore(false)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  player: { flex: 1, alignItems: 'center' },
  header: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: 6,
    gap: 2,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: { flex: 1, minWidth: 0 },
  heading: { fontFamily: DISPLAY, fontSize: 15, lineHeight: 20 },
  source: { fontFamily: BODY, fontSize: 13, lineHeight: 16 },
  frame: {
    borderRadius: 14,
    borderBottomWidth: 6,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 10px 24px rgba(0,0,0,0.35)',
  },
  boardInner: { borderRadius: 8, overflow: 'hidden' },
  cell: { position: 'absolute', borderWidth: 1 },
  openCell: {
    borderTopWidth: 2,
    borderBottomWidth: 3,
    borderTopColor: 'rgba(255,255,255,0.35)',
    borderBottomColor: 'rgba(0,0,0,0.25)',
    borderLeftColor: 'rgba(0,0,0,0.15)',
    borderRightColor: 'rgba(0,0,0,0.15)',
  },
  piece: { position: 'absolute', left: 0, top: 0 },
  pieceCell: {
    position: 'absolute',
    borderRadius: 4,
    borderTopWidth: 3,
    borderBottomWidth: 4,
    borderTopColor: 'rgba(255,255,255,0.45)',
    borderBottomColor: 'rgba(0,0,0,0.25)',
  },
  shine: {
    position: 'absolute',
    left: 0,
    right: 0,
    backgroundColor: 'rgba(255,255,255,0.6)',
  },
  column: { position: 'absolute', top: 0, overflow: 'hidden' },
  pause: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  pauseText: {
    fontFamily: DISPLAY,
    fontSize: 28,
    lineHeight: 38,
    letterSpacing: 4,
    color: '#ffffff',
  },
  titleBox: {
    alignSelf: 'stretch',
    paddingHorizontal: 24,
    alignItems: 'center',
  },
  title: { fontFamily: DISPLAY, fontSize: 19, lineHeight: 30 },
  artist: { fontFamily: BODY, fontSize: 16, lineHeight: 21 },
  score: {
    alignSelf: 'stretch',
    marginHorizontal: 16,
    height: 62,
    flexDirection: 'row',
    gap: 8,
  },
  tile: { borderRadius: 10, paddingHorizontal: 10, paddingVertical: 7 },
  rowsTile: { width: 96 },
  nextTile: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  timeTile: { width: 78 },
  nextText: { flex: 1, minWidth: 0 },
  tileHead: { fontFamily: DISPLAY, fontSize: 10, lineHeight: 14 },
  tileBig: { fontFamily: DISPLAY, fontSize: 19, lineHeight: 30 },
  tileSmall: { fontFamily: DISPLAY, fontSize: 11 },
  tileTime: { fontFamily: DISPLAY, fontSize: 15, lineHeight: 30 },
  nextTitle: { fontFamily: BOLD, fontSize: 14, lineHeight: 18 },
  seek: { alignSelf: 'stretch', marginHorizontal: 16, height: 40 },
  segments: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
  },
  segment: { flex: 1, height: 18, borderRadius: 3, borderWidth: 1 },
  segmentOn: {
    borderWidth: 0,
    borderTopWidth: 2,
    borderBottomWidth: 3,
    borderTopColor: 'rgba(255,255,255,0.35)',
    borderBottomColor: 'rgba(0,0,0,0.25)',
  },
  times: {
    alignSelf: 'stretch',
    marginHorizontal: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  time: { fontFamily: BODY, fontSize: 13, lineHeight: 16 },
  grow: { flex: 1 },
  transport: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 14,
  },
  block: {
    alignItems: 'center',
    justifyContent: 'center',
    borderTopWidth: 4,
    borderBottomWidth: 7,
    borderTopColor: 'rgba(255,255,255,0.35)',
    borderBottomColor: 'rgba(0,0,0,0.25)',
  },
  side: { width: 76, height: 72, borderRadius: 14 },
  play: {
    width: 96,
    height: 92,
    borderRadius: 18,
    boxShadow: '0 8px 18px rgba(0,0,0,0.3)',
  },
  tools: {
    alignSelf: 'stretch',
    marginHorizontal: 16,
    height: 64,
    flexDirection: 'row',
    gap: 8,
  },
  tool: { flex: 1, minWidth: 0, borderRadius: 12, gap: 4 },
  toolText: { fontFamily: BOLD, fontSize: 12, lineHeight: 14 },
  footer: {
    marginTop: 14,
    fontFamily: DISPLAY,
    fontSize: 11,
    lineHeight: 16,
    letterSpacing: 2,
  },
  sheet: {
    position: 'absolute',
    left: 12,
    right: 12,
    borderRadius: 16,
    borderBottomWidth: 5,
    padding: 16,
    gap: 4,
  },
  sheetTitle: {
    fontFamily: DISPLAY,
    fontSize: 16,
    lineHeight: 22,
    paddingBottom: 6,
  },
  sheetRow: {
    minHeight: 52,
    borderTopWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sheetLabel: { fontFamily: BODY, fontSize: 17, lineHeight: 22, flexShrink: 1 },
  sheetValue: { fontFamily: BODY, fontSize: 14, lineHeight: 18 },
});
