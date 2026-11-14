import { useEffect, useState, type ComponentType } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import {
  ChevronDown,
  FileText,
  Heart,
  ListMusic,
  MoreHorizontal,
  Repeat,
  Repeat1,
  Shuffle,
  X,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
  ClipPath,
  Circle,
  Defs,
  G,
  Line,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';
import { RepeatMode } from 'react-native-track-player';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { createStyles, useColors } from '../../theme/theme';
import { Cover } from '../../ui/Cover';
import { formatTime } from '../../utils/formatTime';
import {
  DragHeader,
  SeekArea,
  useTrackChange,
  usePlayerKit,
  type PlayerKit,
  type SkinProps,
} from '../../player/kit/playerKit';

/** The cassette is drawn on a 306 × 192 grid and scaled to fit. */
const CW = 306;
const CH = 192;
const REEL_L = 95;
const REEL_R = 211;
const REEL_Y = 85;
const TAPE = '#3b2a1c';
const TILTS = [-3, 2, -1.5, 2.5, -2];

/* ───────── cassette ───────── */

/** A reel hub turning on the UI thread. */
function Hub({
  angle,
  x,
  scale,
  color,
  spoke,
}: {
  angle: SharedValue<number>;
  x: number;
  scale: number;
  color: string;
  spoke: string;
}) {
  const size = 26 * scale;
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${angle.value}deg` }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.abs,
        {
          left: x * scale - size / 2,
          top: REEL_Y * scale - size / 2,
          width: size,
          height: size,
        },
        style,
      ]}
    >
      <Svg height={size} viewBox="-13 -13 26 26" width={size}>
        <Circle fill={color} r="11" />
        <Path
          d="M0 -9v18M-7.8 -4.5l15.6 9M-7.8 4.5l15.6 -9"
          stroke={spoke}
          strokeWidth={3}
        />
      </Svg>
    </Animated.View>
  );
}

/**
 * The cassette behind the clear lid. The reels turn on the UI thread, each
 * one faster the less tape it holds, and spin fast while the tape winds to
 * another song; the cassette pops out and back in at the same time.
 */
function Cassette({ kit, width }: { kit: PlayerKit; width: number }) {
  const { colors } = useColors();
  const local = useStyles();
  const reduced = useReducedMotion();
  const s = width / CW;
  const height = CH * s;
  const { shell, label, ink, stripe, window: glass, edge, line } = colors.skin;
  const left = useSharedValue(0);
  const right = useSharedValue(0);
  const wind = useSharedValue(0);
  const eject = useSharedValue(0);
  const playing = useSharedValue(false);
  const leftPack = useSharedValue(1 - kit.progress);
  playing.value = kit.lively && !reduced;
  leftPack.value = 1 - kit.progress;

  const frame = useFrameCallback(info => {
    'worklet';
    const dt = Math.min(0.05, (info.timeSincePreviousFrame ?? 16) / 1000);
    const turn = ((playing.value ? 96 : 0) + wind.value * 1000) * dt;
    const packLeft = 14 + leftPack.value * 34;
    const packRight = 14 + (1 - leftPack.value) * 34;
    left.value = (left.value + turn * (30 / packLeft)) % 360;
    right.value = (right.value + turn * (30 / packRight)) % 360;
  }, false);
  useEffect(() => {
    frame.setActive(kit.visible && !reduced);
  }, [frame, kit.visible, reduced]);

  useTrackChange(kit.track?.id, () => {
    if (reduced) return;
    wind.value = withSequence(
      withTiming(1, { duration: 80 }),
      withTiming(0, { duration: 900 }),
    );
    eject.value = withSequence(
      withTiming(1, { duration: 160, easing: Easing.in(Easing.quad) }),
      withTiming(0, { duration: 420, easing: Easing.out(Easing.back(1.2)) }),
    );
  });
  const pop = useAnimatedStyle(() => ({
    transform: [{ translateY: -eject.value * height * 1.25 }],
  }));

  const packL = (14 + 34 * (1 - kit.progress)).toFixed(1);
  const packR = (14 + 34 * kit.progress).toFixed(1);
  const photo = 52 * s;
  const side = kit.queueIndex % 2 ? 'B' : 'A';

  return (
    <Animated.View pointerEvents="none" style={[{ width, height }, pop]}>
      <Svg height={height} viewBox={`0 0 ${CW} ${CH}`} width={width}>
        <Defs>
          <ClipPath id="tape-window">
            <Rect height="30" rx="15" width="122" x="92" y="70" />
          </ClipPath>
        </Defs>
        <Rect fill={shell} height={CH} rx="12" width={CW} />
        <Rect fill={label} height="104" rx="6" width="274" x="16" y="12" />
        <Rect fill={stripe} height="10" width="274" x="16" y="22" />
        <Line opacity={0.5} stroke={line} x1="28" x2="278" y1="58" y2="58" />
        <Line opacity={0.5} stroke={line} x1="28" x2="278" y1="80" y2="80" />
        <Rect fill={shell} height="46" rx="23" width="150" x="78" y="62" />
        <Rect
          fill={glass}
          height="30"
          opacity={0.85}
          rx="15"
          width="122"
          x="92"
          y="70"
        />
        <G clipPath="url(#tape-window)">
          <Circle cx={REEL_L} cy={REEL_Y} fill={TAPE} r={packL} />
          <Circle cx={REEL_R} cy={REEL_Y} fill={TAPE} r={packR} />
        </G>
        <Path
          d="M60 192 L82 150 L224 150 L246 192 Z"
          fill={edge}
          opacity={0.6}
        />
        <Circle cx="118" cy="172" fill={glass} r="5" />
        <Circle cx="188" cy="172" fill={glass} r="5" />
        {[
          [12, 12],
          [294, 12],
          [12, 180],
          [294, 180],
        ].map(([cx, cy]) => (
          <Circle key={`${cx}-${cy}`} cx={cx} cy={cy} fill={edge} r="3" />
        ))}
      </Svg>
      <Hub angle={left} color={label} scale={s} spoke={shell} x={REEL_L} />
      <Hub angle={right} color={label} scale={s} spoke={shell} x={REEL_R} />
      <Text
        style={[
          local.side,
          { left: 24 * s, top: 13 * s, fontSize: 20 * s, color: label },
        ]}
      >
        {side}
      </Text>
      <View
        style={[
          local.photo,
          {
            left: 22 * s,
            top: 37 * s,
            padding: 3 * s,
          },
        ]}
      >
        <Cover size={photo} uri={kit.track?.artwork ?? null} />
        <View
          style={[
            local.photoTape,
            { left: 14 * s, top: -8 * s, width: 30 * s, height: 12 * s },
          ]}
        />
      </View>
      <Text
        numberOfLines={1}
        style={[
          local.handTitle,
          {
            left: 86 * s,
            right: 22 * s,
            top: 28 * s,
            fontSize: 30 * s,
            lineHeight: 34 * s,
            color: ink,
          },
        ]}
      >
        {kit.track?.title}
      </Text>
    </Animated.View>
  );
}

/* ───────── controls ───────── */

/** A mechanical key; PLAY and STOP stay pushed in, like on a real walkman. */
function Key({
  caption,
  label,
  path,
  latched,
  onPress,
  disabled,
  height,
}: {
  caption: string;
  label: string;
  path: string;
  latched?: boolean;
  onPress: () => void;
  disabled?: boolean;
  height: number;
}) {
  const { colors } = useColors();
  const local = useStyles();
  const { key, keyInk, on, onInk, edge } = colors.skin;
  const fg = latched ? onInk : keyInk;
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected: latched, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => {
        const down = latched || pressed;
        return [
          local.key,
          {
            height,
            backgroundColor: latched ? on : key,
            boxShadow: `0 ${
              down ? 1 : 7
            }px 0 ${edge}, inset 0 2px 0 rgba(255,255,255,0.35)`,
            transform: [{ translateY: down ? 6 : 0 }],
          },
          disabled && local.dim,
        ];
      }}
    >
      <Svg height={26} viewBox="0 0 24 24" width={26}>
        <Path d={path} fill={fg} />
      </Svg>
      <Text style={[local.keyText, { color: fg }]}>{caption}</Text>
    </Pressable>
  );
}

type IconProps = { color: string; size: number; strokeWidth: number };

/** A sticker stuck on below the walkman. */
function Sticker({
  index,
  caption,
  label,
  active,
  onPress,
  disabled,
  Icon,
  height,
}: {
  height: number;
  index: number;
  caption: string;
  label: string;
  active?: boolean;
  onPress: () => void;
  disabled?: boolean;
  Icon: ComponentType<IconProps>;
}) {
  const { colors } = useColors();
  const local = useStyles();
  const { label: paper, m3, ink, on, onInk } = colors.skin;
  const bg = active ? on : index % 2 ? m3 : paper;
  const fg = active ? onInk : ink;
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        local.sticker,
        {
          height,
          backgroundColor: bg,
          transform: [
            { rotate: `${pressed ? 0 : TILTS[index]}deg` },
            { scale: pressed ? 0.94 : 1 },
          ],
        },
        disabled && local.dim,
      ]}
    >
      <Icon color={fg} size={22} strokeWidth={2.4} />
      <Text numberOfLines={1} style={[local.stickerText, { color: fg }]}>
        {caption}
      </Text>
    </Pressable>
  );
}

/** Timer, speed, equalizer and the song menu, kept out of the way. */
function MoreOptions({
  kit,
  onClose,
}: {
  kit: PlayerKit;
  onClose: () => void;
}) {
  const { colors } = useColors();
  const local = useStyles();
  const insets = useSafeAreaInsets();
  const { deck, deckInk, key, keyInk, edge } = colors.skin;
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
        style={[StyleSheet.absoluteFill, local.scrim]}
      />
      <View
        style={[
          local.panel,
          {
            bottom: insets.bottom + 16,
            backgroundColor: deck,
            boxShadow: `inset 0 0 0 3px ${edge}`,
          },
        ]}
      >
        <View style={local.panelHead}>
          <Text style={[local.panelTitle, { color: deckInk }]}>
            Más opciones
          </Text>
          <Pressable
            accessibilityLabel="Cerrar opciones"
            accessibilityRole="button"
            onPress={onClose}
            style={local.panelClose}
          >
            <X color={deckInk} size={22} strokeWidth={2.6} />
          </Pressable>
        </View>
        {rows.map(row => (
          <Pressable
            key={row.key}
            accessibilityLabel={`${row.label}: ${row.value}`}
            accessibilityRole="button"
            onPress={() => {
              onClose();
              row.onPress();
            }}
            style={({ pressed }) => [
              local.panelRow,
              { backgroundColor: key },
              pressed && local.pressed,
            ]}
          >
            <Text style={[local.panelLabel, { color: keyInk }]}>
              {row.label}
            </Text>
            <Text style={[local.panelValue, { color: keyInk }]}>
              {row.value}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/* ───────── player ───────── */

export function MixtapePlayer({ covered, headerGesture, onClose }: SkinProps) {
  const kit = usePlayerKit({ covered });
  const { colors } = useColors();
  const local = useStyles();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const [more, setMore] = useState(false);
  const glow = useSharedValue(0.5);
  useEffect(() => {
    if (covered) setMore(false);
  }, [covered]);
  useEffect(() => {
    if (kit.lively && !reduced) {
      glow.value = withRepeat(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
    } else {
      cancelAnimation(glow);
      glow.value = withTiming(0.25, { duration: 300 });
    }
  }, [glow, kit.lively, reduced]);
  const led = useAnimatedStyle(() => ({ opacity: glow.value }));

  if (!kit.track) return null;
  const track = kit.track;
  const {
    deck,
    deckInk,
    edge,
    window: glass,
    counter,
    counterInk,
    on,
  } = colors.skin;
  const body = width - 28;
  const cassette = body - 28 - 26;
  const keyHeight = Math.round(Math.max(76, Math.min(128, height * 0.135)));
  const stickerHeight = Math.round(Math.max(72, Math.min(100, height * 0.105)));
  const moving = !kit.ready || kit.busy;
  const digits = String(Math.floor(kit.position) % 1000).padStart(3, '0');
  const side = kit.queueIndex % 2 ? 'B' : 'A';
  const RepeatIcon = kit.repeatMode === RepeatMode.Track ? Repeat1 : Repeat;

  return (
    <View
      style={[
        local.player,
        { paddingTop: insets.top, paddingBottom: insets.bottom + 12 },
      ]}
    >
      <DragHeader gesture={headerGesture} style={local.top}>
        <Pressable
          accessibilityLabel="Cerrar reproductor"
          accessibilityRole="button"
          onPress={onClose}
          style={local.topButton}
        >
          <ChevronDown color={colors.text} size={26} strokeWidth={2.6} />
        </Pressable>
        <Text numberOfLines={1} style={local.topTitle}>
          LADO {side} · PISTA {String(kit.queueIndex + 1).padStart(2, '0')}
        </Text>
        <Pressable
          accessibilityLabel={
            kit.favorite ? 'Quitar de favoritas' : 'Añadir a favoritas'
          }
          accessibilityRole="button"
          accessibilityState={{ selected: kit.favorite }}
          onPress={kit.toggleFavorite}
          style={local.topButton}
        >
          <Heart
            color={colors.text}
            fill={kit.favorite ? colors.text : 'none'}
            size={24}
            strokeWidth={2.4}
          />
        </Pressable>
      </DragHeader>

      <View style={local.stage}>
        <View
          style={[
            local.body,
            {
              backgroundColor: deck,
              boxShadow: `inset 0 0 0 3px ${edge}, inset 0 2px 0 rgba(255,255,255,0.12), 0 12px 26px rgba(0,0,0,0.3)`,
            },
          ]}
        >
          <View style={local.brandRow}>
            <View style={[local.screw, { backgroundColor: edge }]} />
            <Text style={[local.brand, { color: deckInk }]}>
              MIXTAPE · AUTO REVERSE
            </Text>
            <Animated.View
              style={[
                local.led,
                { backgroundColor: on, boxShadow: `0 0 8px ${on}` },
                led,
              ]}
            />
            <View style={[local.screw, { backgroundColor: edge }]} />
          </View>

          <View
            style={[
              local.lid,
              { backgroundColor: glass, boxShadow: `inset 0 0 0 2px ${edge}` },
            ]}
          >
            <Cassette kit={kit} width={cassette} />
            <Svg pointerEvents="none" style={StyleSheet.absoluteFill}>
              <Defs>
                <LinearGradient id="glass" x1="0" x2="1" y1="0" y2="0.6">
                  <Stop offset="0" stopColor="#ffffff" stopOpacity={0.28} />
                  <Stop offset="0.32" stopColor="#ffffff" stopOpacity={0} />
                  <Stop offset="0.66" stopColor="#ffffff" stopOpacity={0} />
                  <Stop offset="0.78" stopColor="#ffffff" stopOpacity={0.12} />
                  <Stop offset="0.9" stopColor="#ffffff" stopOpacity={0} />
                </LinearGradient>
              </Defs>
              <Rect fill="url(#glass)" height="100%" width="100%" />
            </Svg>
          </View>

          <View style={local.infoRow}>
            <View
              accessibilityLabel={`Contador de cinta ${formatTime(
                kit.position,
              )}`}
              accessibilityRole="image"
              accessible
              style={[local.counter, { backgroundColor: counter }]}
            >
              {digits.split('').map((digit, index) => (
                <Text key={index} style={[local.digit, { color: counterInk }]}>
                  {digit}
                </Text>
              ))}
            </View>
            <View style={local.meta}>
              <Text
                numberOfLines={1}
                style={[local.artist, { color: deckInk }]}
              >
                {track.artist}
              </Text>
              <Text numberOfLines={1} style={[local.album, { color: deckInk }]}>
                {track.album}
              </Text>
            </View>
          </View>

          <View>
            <SeekArea kit={kit} style={local.seek}>
              <View style={[local.tape, { backgroundColor: deckInk }]} />
              <View
                style={[
                  local.tapeFill,
                  { width: `${kit.progress * 100}%`, backgroundColor: deckInk },
                ]}
              />
              <View
                style={[
                  local.marker,
                  { left: `${kit.progress * 100}%`, backgroundColor: on },
                ]}
              />
            </SeekArea>
            <View style={local.times}>
              <Text style={[local.time, { color: deckInk }]}>
                {formatTime(kit.position)}
              </Text>
              <Text style={[local.time, local.faint, { color: deckInk }]}>
                -{formatTime(Math.max(0, kit.duration - kit.position))}
              </Text>
            </View>
          </View>

          <View style={local.keys}>
            <Key
              caption="REW"
              disabled={moving}
              height={keyHeight}
              label="Canción anterior"
              onPress={kit.previous}
              path="M11 6v12L3 12zM21 6v12l-8-6z"
            />
            <Key
              caption="PLAY"
              disabled={!kit.ready}
              height={keyHeight}
              label="Reproducir"
              latched={kit.isPlaying}
              onPress={() => {
                if (!kit.isPlaying) kit.toggle();
              }}
              path="M7 4v16l13-8z"
            />
            <Key
              caption="STOP"
              disabled={!kit.ready}
              height={keyHeight}
              label="Pausar"
              latched={!kit.isPlaying}
              onPress={() => {
                if (kit.isPlaying) kit.toggle();
              }}
              path="M6 6h12v12H6z"
            />
            <Key
              caption="FF"
              disabled={moving}
              height={keyHeight}
              label="Siguiente canción"
              onPress={kit.next}
              path="M3 6v12l8-6zM13 6v12l8-6z"
            />
          </View>
        </View>

        <View style={local.stickers}>
          <Sticker
            height={stickerHeight}
            Icon={ListMusic}
            caption="cola"
            index={0}
            label={`Abrir cola de reproducción con ${kit.queueCount} canciones`}
            onPress={kit.openQueue}
          />
          <Sticker
            height={stickerHeight}
            Icon={FileText}
            caption="letras"
            index={1}
            label={`Abrir letras de ${track.title}`}
            onPress={kit.openLyrics}
          />
          <Sticker
            height={stickerHeight}
            Icon={Shuffle}
            active={kit.shuffle}
            caption="mezcla"
            disabled={moving}
            index={2}
            label={kit.shuffle ? 'Desactivar mezcla' : 'Activar mezcla'}
            onPress={kit.toggleShuffle}
          />
          <Sticker
            height={stickerHeight}
            Icon={RepeatIcon}
            active={kit.repeatOn}
            caption="repetir"
            disabled={!kit.ready}
            index={3}
            label={kit.repeatLabel}
            onPress={kit.cycleRepeat}
          />
          <Sticker
            height={stickerHeight}
            Icon={MoreHorizontal}
            active={more}
            caption="más"
            index={4}
            label="Más opciones: temporizador, velocidad, ecualizador y acciones"
            onPress={() => setMore(true)}
          />
        </View>
      </View>

      {more ? <MoreOptions kit={kit} onClose={() => setMore(false)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({ abs: { position: 'absolute' } });

const useStyles = createStyles(colors => {
  const hand = colors.design.fonts.display;
  const bold = colors.design.fonts.title;
  const semi = colors.design.fonts.label;
  const medium = colors.design.fonts.body;
  return {
    player: {
      flex: 1,
      paddingHorizontal: 14,
      gap: 12,
      backgroundColor: colors.background,
    },
    top: { flexDirection: 'row', alignItems: 'center', minHeight: 52 },
    topButton: {
      width: 48,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    topTitle: {
      flex: 1,
      textAlign: 'center',
      color: colors.text,
      fontFamily: semi,
      fontSize: 16,
      letterSpacing: 1,
    },
    body: { borderRadius: 26, padding: 14, gap: 14 },
    brandRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
    screw: { width: 8, height: 8, borderRadius: 4 },
    brand: {
      flex: 1,
      fontFamily: semi,
      fontSize: 12,
      letterSpacing: 2.4,
      opacity: 0.75,
    },
    led: { width: 8, height: 8, borderRadius: 4 },
    lid: {
      borderRadius: 16,
      paddingHorizontal: 13,
      paddingVertical: 24,
      overflow: 'hidden',
      alignItems: 'center',
    },
    side: { position: 'absolute', fontFamily: hand },
    photo: {
      position: 'absolute',
      backgroundColor: '#ffffff',
      boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
      transform: [{ rotate: '-5deg' }],
    },
    photoTape: {
      position: 'absolute',
      backgroundColor: 'rgba(255,255,255,0.65)',
      transform: [{ rotate: '8deg' }],
    },
    handTitle: {
      position: 'absolute',
      fontFamily: hand,
      transform: [{ rotate: '-1.5deg' }],
    },
    infoRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
    counter: {
      flexDirection: 'row',
      gap: 3,
      paddingHorizontal: 10,
      paddingVertical: 5,
      borderRadius: 6,
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5)',
    },
    digit: {
      width: 22,
      textAlign: 'center',
      fontFamily: bold,
      fontSize: 24,
      fontVariant: ['tabular-nums'],
      backgroundColor: 'rgba(0,0,0,0.3)',
      borderRadius: 3,
    },
    meta: { flex: 1, minWidth: 0 },
    artist: { fontFamily: bold, fontSize: 19 },
    album: { fontFamily: medium, fontSize: 14, opacity: 0.7 },
    keys: { flexDirection: 'row', gap: 8, paddingBottom: 8 },
    key: {
      flex: 1,
      borderTopLeftRadius: 8,
      borderTopRightRadius: 8,
      borderBottomLeftRadius: 12,
      borderBottomRightRadius: 12,
      alignItems: 'center',
      justifyContent: 'flex-end',
      paddingBottom: 14,
      gap: 6,
    },
    keyText: { fontFamily: semi, fontSize: 13, letterSpacing: 1.3 },
    dim: { opacity: 0.45 },
    pressed: { opacity: 0.7 },
    seek: { height: 34, justifyContent: 'center' },
    tape: { height: 10, borderRadius: 2, opacity: 0.25 },
    tapeFill: { position: 'absolute', left: 0, height: 10, borderRadius: 2 },
    marker: {
      position: 'absolute',
      marginLeft: -3,
      width: 6,
      height: 26,
      borderRadius: 3,
    },
    times: { flexDirection: 'row', justifyContent: 'space-between' },
    time: {
      color: colors.text,
      fontFamily: semi,
      fontSize: 15,
      fontVariant: ['tabular-nums'],
    },
    faint: { opacity: 0.75 },
    stage: { flex: 1, justifyContent: 'space-evenly', gap: 12 },
    stickers: { flexDirection: 'row', gap: 8, paddingBottom: 4 },
    sticker: {
      flex: 1,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      boxShadow: '0 3px 0 rgba(0,0,0,0.25)',
    },
    stickerText: { fontFamily: hand, fontSize: 22, lineHeight: 24 },
    scrim: { backgroundColor: colors.scrim },
    panel: {
      position: 'absolute',
      left: 14,
      right: 14,
      borderRadius: 22,
      padding: 12,
      gap: 6,
    },
    panelHead: { flexDirection: 'row', alignItems: 'center' },
    panelTitle: {
      flex: 1,
      paddingHorizontal: 8,
      fontFamily: hand,
      fontSize: 30,
    },
    panelClose: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    panelRow: {
      minHeight: 54,
      borderRadius: 10,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    panelLabel: { fontFamily: semi, fontSize: 18 },
    panelValue: { fontFamily: bold, fontSize: 18 },
  };
});
