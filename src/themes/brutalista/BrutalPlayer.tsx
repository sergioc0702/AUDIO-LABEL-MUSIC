import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {
  ChevronDown,
  FileText,
  Heart,
  ListMusic,
  Repeat,
  Repeat1,
  Shuffle,
  X,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { RepeatMode } from 'react-native-track-player';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { createStyles, useColors } from '../../theme/theme';
import { formatTime } from '../../utils/formatTime';
import {
  DragHeader,
  SeekArea,
  useTrackChange,
  usePlayerKit,
  type PlayerKit,
  type SkinProps,
} from '../../player/kit/playerKit';

/** Every cell of the grid shares rules this thick. */
const RULE = 3;
const SEGMENTS = 18;
const BAR_HEIGHTS = [
  18, 30, 14, 36, 24, 16, 34, 27, 12, 32, 22, 36, 19, 29, 15, 33, 25, 17, 35,
  21,
];
const TYPE_MS = 55;
/** Anton capitals are about this wide, as a share of the font size. */
const CAP_WIDTH = 0.47;

const two = (value: number) => String(value).padStart(2, '0');

/* ───────── cover cell ───────── */

/**
 * The cover fills its cell. It is drawn once and only moves on the UI thread:
 * a short sideways jolt when the song changes.
 */
function CoverCell({ kit, width }: { kit: PlayerKit; width: number }) {
  const { colors } = useColors();
  const styles = useStyles();
  const reduced = useReducedMotion();
  const jolt = useSharedValue(0);
  useTrackChange(kit.track?.id, () => {
    if (reduced) return;
    jolt.value = withSequence(
      withTiming(10, { duration: 60, easing: Easing.linear }),
      withTiming(-10, { duration: 60, easing: Easing.linear }),
      withTiming(6, { duration: 60, easing: Easing.linear }),
      withTiming(0, { duration: 60, easing: Easing.linear }),
    );
  });
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: jolt.value }],
  }));
  const { hot, onHot, paper } = colors.skin;
  const artwork = kit.track?.artwork ?? null;
  return (
    <View pointerEvents="none" style={[styles.coverCell, { width }]}>
      <Animated.View style={[StyleSheet.absoluteFill, style]}>
        {artwork ? (
          <Image
            resizeMode="cover"
            source={{ uri: artwork }}
            style={StyleSheet.absoluteFill}
          />
        ) : (
          <View
            style={[StyleSheet.absoluteFill, { backgroundColor: colors.text }]}
          >
            <View
              style={[
                styles.blockCircle,
                {
                  width: width * 0.9,
                  height: width * 0.9,
                  borderRadius: width * 0.45,
                  backgroundColor: hot,
                },
              ]}
            />
            <View style={[styles.blockPost, { backgroundColor: paper }]} />
          </View>
        )}
      </Animated.View>
      <Text style={[styles.stamp, { backgroundColor: hot, color: onHot }]}>
        {kit.isPlaying ? 'Sonando' : 'Pausa'}
      </Text>
    </View>
  );
}

/* ───────── headline ───────── */

/**
 * The title set like a magazine headline, over several lines. It types itself
 * in when a new song starts; only this small piece re-renders while it types.
 */
function Headline({ kit, size }: { kit: PlayerKit; size: number }) {
  const { colors } = useColors();
  const styles = useStyles();
  const reduced = useReducedMotion();
  const title = kit.track?.title ?? '';
  const [typed, setTyped] = useState<number | null>(null);
  useTrackChange(kit.track?.id, () => {
    if (!reduced) setTyped(0);
  });
  useEffect(() => {
    if (typed === null) return;
    if (typed >= title.length) {
      const done = setTimeout(() => setTyped(null), 400);
      return () => clearTimeout(done);
    }
    const timer = setTimeout(() => setTyped(typed + 1), TYPE_MS);
    return () => clearTimeout(timer);
  }, [title.length, typed]);
  const typing = typed !== null;
  return (
    <Text
      accessibilityLabel={title}
      accessibilityRole="header"
      ellipsizeMode="tail"
      numberOfLines={5}
      style={[
        styles.headline,
        { fontSize: size, lineHeight: Math.round(size * 1.14) },
      ]}
    >
      {typing ? title.slice(0, typed) : title}
      {typing ? (
        <Text style={{ backgroundColor: colors.skin.hot }}>{' '}</Text>
      ) : null}
    </Text>
  );
}

/* ───────── signal bars ───────── */

/** One bar of the signal row; it hammers in steps while the music plays. */
function Bar({
  playing,
  height,
  index,
  color,
}: {
  playing: boolean;
  height: number;
  index: number;
  color: string;
}) {
  const styles = useStyles();
  const reduced = useReducedMotion();
  const scale = useSharedValue(0.4);
  useEffect(() => {
    if (playing && !reduced) {
      const duration = 340 + (index % 5) * 70;
      scale.value = 0.15 + ((index * 7) % 10) / 12;
      scale.value = withRepeat(
        withSequence(
          withTiming(1, { duration, easing: Easing.steps(3) }),
          withTiming(0.15, { duration, easing: Easing.steps(3) }),
        ),
        -1,
      );
    } else {
      cancelAnimation(scale);
      scale.value = withTiming(0.4, { duration: 120 });
    }
  }, [index, playing, reduced, scale]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scaleY: scale.value }],
  }));
  return (
    <Animated.View
      style={[styles.bar, { height, backgroundColor: color }, style]}
    />
  );
}

/* ───────── keys ───────── */

/** A grid cell that acts as a key; it darkens while pressed. */
function Key({
  label,
  onPress,
  disabled,
  selected,
  style,
  children,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  selected?: boolean;
  style: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const styles = useStyles();
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[style, disabled && styles.dim]}
    >
      {({ pressed }) => (
        <>
          {children}
          {pressed ? (
            <View pointerEvents="none" style={styles.pressShade} />
          ) : null}
        </>
      )}
    </Pressable>
  );
}

type IconProps = { color: string; size: number; strokeWidth: number };

/** Three square blocks: the brutalist "more" icon. */
function Blocks({ color, size }: IconProps) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path d="M3 10h4v4H3zM10 10h4v4h-4zM17 10h4v4h-4z" fill={color} />
    </Svg>
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
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const rows = [
    {
      key: 'sleep',
      label: 'Temporizador',
      value: kit.sleepOn ? kit.sleepCaption : 'Apagado',
      on: kit.sleepOn,
      onPress: kit.openSleep,
    },
    {
      key: 'speed',
      label: 'Velocidad',
      value: `${kit.rate}×`,
      on: kit.rate !== 1,
      onPress: kit.openSpeed,
    },
    {
      key: 'eq',
      label: 'Ecualizador',
      value: kit.equalizerOn ? 'Activado' : 'Apagado',
      on: kit.equalizerOn,
      onPress: kit.openEqualizer,
    },
    {
      key: 'menu',
      label: 'Más acciones de la canción',
      value: '›',
      on: false,
      onPress: kit.openMenu,
    },
  ];
  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable
        accessibilityLabel="Cerrar opciones"
        accessibilityRole="button"
        onPress={onClose}
        style={[StyleSheet.absoluteFill, styles.scrim]}
      />
      <View style={[styles.panel, { bottom: insets.bottom + 12 }]}>
        <View style={styles.panelHead}>
          <Text style={styles.panelTitle}>Más opciones</Text>
          <Pressable
            accessibilityLabel="Cerrar opciones"
            accessibilityRole="button"
            onPress={onClose}
            style={styles.panelClose}
          >
            <X color={colors.text} size={24} strokeWidth={3.2} />
          </Pressable>
        </View>
        {rows.map(row => {
          const color = row.on ? colors.skin.onHot : colors.text;
          return (
            <Pressable
              key={row.key}
              accessibilityLabel={`${row.label}: ${row.value}`}
              accessibilityRole="button"
              onPress={() => {
                onClose();
                row.onPress();
              }}
              style={[
                styles.panelRow,
                row.on && { backgroundColor: colors.skin.hot },
              ]}
            >
              <Text style={[styles.panelLabel, { color }]}>{row.label}</Text>
              <Text style={[styles.panelValue, { color }]}>{row.value}</Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}

/* ───────── player ───────── */

export function BrutalPlayer({ covered, headerGesture, onClose }: SkinProps) {
  const kit = usePlayerKit({ covered });
  const { colors } = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [more, setMore] = useState(false);
  useEffect(() => {
    if (covered) setMore(false);
  }, [covered]);

  if (!kit.track) return null;
  const track = kit.track;
  // The frame is 12 pt from each edge; its rules take 3 pt on each side.
  const inner = width - 24 - RULE * 2;
  const coverWidth = Math.round(inner * 0.6);
  const headlineWidth = inner - coverWidth - RULE - 20;
  const longest = Math.max(
    4,
    ...track.title.split(/\s+/).map(word => word.length),
  );
  const headSize = Math.round(
    Math.max(24, Math.min(48, headlineWidth / (longest * CAP_WIDTH))),
  );
  const filled = kit.progress * SEGMENTS;
  const { hot, onHot } = colors.skin;
  const RepeatIcon = kit.repeatMode === RepeatMode.Track ? Repeat1 : Repeat;
  const moving = !kit.ready || kit.busy;
  const tools: {
    key: string;
    caption: string;
    label: string;
    active?: boolean;
    disabled?: boolean;
    Icon: ComponentType<IconProps>;
    onPress: () => void;
  }[] = [
    {
      key: 'queue',
      caption: 'Cola',
      label: `Abrir cola de reproducción con ${kit.queueCount} canciones`,
      Icon: ListMusic,
      onPress: kit.openQueue,
    },
    {
      key: 'lyrics',
      caption: 'Letras',
      label: `Abrir letras de ${track.title}`,
      Icon: FileText,
      onPress: kit.openLyrics,
    },
    {
      key: 'shuffle',
      caption: 'Mezcla',
      label: kit.shuffle ? 'Desactivar mezcla' : 'Activar mezcla',
      active: kit.shuffle,
      disabled: moving,
      Icon: Shuffle,
      onPress: kit.toggleShuffle,
    },
    {
      key: 'repeat',
      caption: 'Repetir',
      label: kit.repeatLabel,
      active: kit.repeatOn,
      disabled: !kit.ready,
      Icon: RepeatIcon,
      onPress: kit.cycleRepeat,
    },
    {
      key: 'more',
      caption: 'Más',
      label: 'Más opciones: temporizador, velocidad, ecualizador y acciones',
      active: more,
      Icon: Blocks,
      onPress: () => setMore(true),
    },
  ];

  return (
    <View
      style={[
        styles.player,
        { paddingTop: insets.top + 6, paddingBottom: insets.bottom + 12 },
      ]}
    >
      <View style={styles.frame}>
        <DragHeader
          gesture={headerGesture}
          style={[styles.row, styles.masthead]}
        >
          <Pressable
            accessibilityLabel="Cerrar reproductor"
            accessibilityRole="button"
            onPress={onClose}
            style={[styles.mastCell, styles.ruleRight]}
          >
            <ChevronDown color={colors.text} size={28} strokeWidth={3.5} />
          </Pressable>
          <View style={styles.mastTitle}>
            <Text numberOfLines={1} style={styles.brand}>
              Mi Música
            </Text>
            <Text style={styles.issue}>
              Nº {two(Math.max(1, kit.queueIndex + 1))}
              {'\n'}
              <Text style={styles.issueSub}>de {two(kit.queueCount)}</Text>
            </Text>
          </View>
          <Pressable
            accessibilityLabel={
              kit.favorite ? 'Quitar de favoritas' : 'Añadir a favoritas'
            }
            accessibilityRole="button"
            accessibilityState={{ selected: kit.favorite }}
            onPress={kit.toggleFavorite}
            style={[
              styles.mastCell,
              styles.ruleLeft,
              kit.favorite && { backgroundColor: hot },
            ]}
          >
            <Heart
              color={kit.favorite ? onHot : colors.text}
              fill={kit.favorite ? onHot : 'none'}
              size={24}
              strokeWidth={3}
            />
          </Pressable>
        </DragHeader>

        <View style={[styles.row, styles.hero]}>
          <CoverCell kit={kit} width={coverWidth} />
          <View style={styles.headCell}>
            <Text style={styles.kicker}>AHORA SUENA</Text>
            <Headline kit={kit} size={headSize} />
          </View>
        </View>

        <View style={[styles.row, styles.info]}>
          <View
            style={[styles.infoCell, styles.ruleRight, { width: coverWidth }]}
          >
            <Text style={styles.kicker}>ARTISTA</Text>
            <Text numberOfLines={1} style={styles.artist}>
              {track.artist}
            </Text>
          </View>
          <View style={styles.timeCell}>
            <Text style={styles.now}>{formatTime(kit.position)}</Text>
            <Text numberOfLines={1} style={styles.left}>
              −{formatTime(Math.max(0, kit.duration - kit.position))} ·{' '}
              {formatTime(kit.duration)}
            </Text>
          </View>
        </View>

        <View pointerEvents="none" style={[styles.row, styles.bars]}>
          {BAR_HEIGHTS.map((barHeight, index) => (
            <Bar
              key={index}
              color={index % 5 === 2 ? hot : colors.text}
              height={barHeight}
              index={index}
              playing={kit.lively}
            />
          ))}
        </View>

        <SeekArea kit={kit} style={[styles.row, styles.seek]}>
          {Array.from({ length: SEGMENTS }, (_, index) => (
            <View
              key={index}
              style={[
                styles.segment,
                index < Math.floor(filled)
                  ? { backgroundColor: colors.text }
                  : index === Math.floor(filled)
                  ? { backgroundColor: hot }
                  : null,
              ]}
            />
          ))}
        </SeekArea>

        <View style={[styles.row, styles.transport]}>
          <Key
            disabled={moving}
            label="Canción anterior"
            onPress={kit.previous}
            style={[styles.skip, styles.ruleRight]}
          >
            <Svg height={30} viewBox="0 0 24 24" width={30}>
              <Path d="M5 4h3v16H5zM20 4v16L9 12z" fill={colors.text} />
            </Svg>
            <Text style={styles.skipText}>ANT.</Text>
          </Key>
          <Key
            disabled={!kit.ready}
            label={kit.isPlaying ? 'Pausar' : 'Reproducir'}
            onPress={kit.toggle}
            style={[styles.play, { backgroundColor: hot }]}
          >
            <Svg height={36} viewBox="0 0 24 24" width={36}>
              <Path
                d={
                  kit.isPlaying ? 'M5 4h5v16H5zM14 4h5v16h-5z' : 'M6 3v18l15-9z'
                }
                fill={onHot}
              />
            </Svg>
            <Text style={[styles.playText, { color: onHot }]}>
              {kit.isPlaying ? 'Pausa' : 'Play'}
            </Text>
          </Key>
          <Key
            disabled={moving}
            label="Siguiente canción"
            onPress={kit.next}
            style={[styles.skip, styles.ruleLeft]}
          >
            <Svg height={30} viewBox="0 0 24 24" width={30}>
              <Path d="M16 4h3v16h-3zM4 4l11 8-11 8z" fill={colors.text} />
            </Svg>
            <Text style={styles.skipText}>SIG.</Text>
          </Key>
        </View>

        <View style={styles.tools}>
          {tools.map((tool, index) => {
            const color = tool.active ? colors.background : colors.text;
            return (
              <Key
                key={tool.key}
                disabled={tool.disabled}
                label={tool.label}
                onPress={tool.onPress}
                selected={tool.active}
                style={[
                  styles.tool,
                  index < tools.length - 1 && styles.ruleRight,
                  tool.active && { backgroundColor: colors.text },
                ]}
              >
                <tool.Icon color={color} size={20} strokeWidth={2.8} />
                <Text numberOfLines={1} style={[styles.toolText, { color }]}>
                  {tool.caption}
                </Text>
              </Key>
            );
          })}
        </View>
      </View>

      {more ? <MoreOptions kit={kit} onClose={() => setMore(false)} /> : null}
    </View>
  );
}

const useStyles = createStyles(colors => {
  const display = colors.design.fonts.display;
  const label = colors.design.fonts.label;
  const body = colors.design.fonts.body;
  const rule = colors.text;
  return {
    player: {
      flex: 1,
      paddingHorizontal: 12,
      backgroundColor: colors.background,
    },
    frame: { flex: 1, borderWidth: RULE, borderColor: rule },
    row: { borderBottomWidth: RULE, borderColor: rule },
    ruleRight: { borderRightWidth: RULE, borderColor: rule },
    ruleLeft: { borderLeftWidth: RULE, borderColor: rule },
    masthead: { flexDirection: 'row', height: 52 },
    mastCell: { width: 50, alignItems: 'center', justifyContent: 'center' },
    mastTitle: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
    },
    brand: {
      flexShrink: 1,
      color: colors.text,
      fontFamily: display,
      fontSize: 26,
      lineHeight: 32,
      textTransform: 'uppercase',
    },
    issue: {
      color: colors.text,
      fontFamily: label,
      fontSize: 11,
      lineHeight: 14,
      textAlign: 'right',
    },
    issueSub: { fontFamily: body },
    hero: { flex: 1, minHeight: 190, flexDirection: 'row' },
    coverCell: {
      overflow: 'hidden',
      borderRightWidth: RULE,
      borderColor: rule,
      backgroundColor: colors.text,
    },
    blockCircle: { position: 'absolute', left: '-15%', top: '20%' },
    blockPost: {
      position: 'absolute',
      left: '70%',
      top: 0,
      bottom: 0,
      width: '16%',
    },
    stamp: {
      position: 'absolute',
      left: 0,
      bottom: 0,
      paddingHorizontal: 8,
      paddingVertical: 3,
      fontFamily: display,
      fontSize: 14,
      lineHeight: 20,
      textTransform: 'uppercase',
    },
    headCell: {
      flex: 1,
      paddingHorizontal: 10,
      paddingTop: 10,
      paddingBottom: 8,
      justifyContent: 'space-between',
      overflow: 'hidden',
    },
    kicker: {
      color: colors.text,
      fontFamily: body,
      fontSize: 10,
      letterSpacing: 1.4,
    },
    headline: {
      color: colors.text,
      fontFamily: display,
      textTransform: 'uppercase',
    },
    info: { flexDirection: 'row', height: 76 },
    infoCell: {
      paddingHorizontal: 12,
      justifyContent: 'center',
      gap: 4,
    },
    artist: {
      color: colors.text,
      fontFamily: display,
      fontSize: 24,
      lineHeight: 30,
      textTransform: 'uppercase',
    },
    timeCell: {
      flex: 1,
      paddingHorizontal: 10,
      justifyContent: 'center',
      gap: 2,
    },
    now: {
      color: colors.text,
      fontFamily: display,
      fontSize: 30,
      lineHeight: 34,
      fontVariant: ['tabular-nums'],
    },
    left: {
      color: colors.text,
      fontFamily: body,
      fontSize: 12,
      fontVariant: ['tabular-nums'],
    },
    bars: {
      height: 50,
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 3,
      paddingHorizontal: 10,
      paddingTop: 6,
    },
    bar: { flex: 1, transformOrigin: 'bottom' },
    seek: {
      height: 44,
      flexDirection: 'row',
      gap: 3,
      paddingHorizontal: 10,
      paddingVertical: 7,
    },
    segment: { flex: 1, borderWidth: 2, borderColor: rule },
    transport: { flexDirection: 'row', height: 112 },
    skip: { width: 80, alignItems: 'center', justifyContent: 'center', gap: 6 },
    skipText: {
      color: colors.text,
      fontFamily: label,
      fontSize: 11,
      letterSpacing: 1.3,
    },
    play: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    playText: {
      fontFamily: display,
      fontSize: 32,
      lineHeight: 40,
      textTransform: 'uppercase',
    },
    tools: { flexDirection: 'row', height: 66 },
    tool: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 5 },
    toolText: {
      fontFamily: label,
      fontSize: 10,
      letterSpacing: 0.6,
      textTransform: 'uppercase',
    },
    pressShade: {
      ...StyleSheet.absoluteFill,
      backgroundColor: 'rgba(0,0,0,0.15)',
    },
    dim: { opacity: 0.45 },
    scrim: { backgroundColor: colors.scrim },
    panel: {
      position: 'absolute',
      left: 12,
      right: 12,
      borderWidth: RULE,
      borderColor: rule,
      backgroundColor: colors.background,
    },
    panelHead: {
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: RULE,
      borderColor: rule,
    },
    panelTitle: {
      flex: 1,
      paddingHorizontal: 14,
      color: colors.text,
      fontFamily: display,
      fontSize: 24,
      lineHeight: 30,
      textTransform: 'uppercase',
    },
    panelClose: {
      width: 54,
      height: 54,
      alignItems: 'center',
      justifyContent: 'center',
      borderLeftWidth: RULE,
      borderColor: rule,
    },
    panelRow: {
      minHeight: 54,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: RULE,
      borderColor: rule,
    },
    panelLabel: { fontFamily: label, fontSize: 15, textTransform: 'uppercase' },
    panelValue: {
      fontFamily: display,
      fontSize: 18,
      lineHeight: 24,
      textTransform: 'uppercase',
    },
  };
});
