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
  withDelay,
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
} from './kit';

const SEGMENTS = 18;
const BAR_HEIGHTS = [
  26, 38, 19, 44, 31, 22, 42, 35, 17, 40, 29, 44, 24, 36, 21, 33,
];
const TYPE_MS = 55;
const LINE = 3;
const SHADOW = 6;
/** Clear space between the cover strip (and its tape) and the title. */
const TITLE_ROOM_TOP = 20;

const two = (value: number) => String(value).padStart(2, '0');

/* ───────── cover strip ───────── */

/**
 * The album art as a wide strip pasted on the page. It is drawn once and
 * only moves on the UI thread: a short sideways jolt when the song changes.
 */
function CoverStrip({
  kit,
  width,
  height,
}: {
  kit: PlayerKit;
  width: number;
  height: number;
}) {
  const { colors } = useColors();
  const styles = useStyles();
  const reduced = useReducedMotion();
  const jolt = useSharedValue(0);
  useTrackChange(kit.track?.id, () => {
    if (reduced) return;
    jolt.value = withSequence(
      withTiming(14, { duration: 60, easing: Easing.linear }),
      withTiming(-14, { duration: 60, easing: Easing.linear }),
      withTiming(8, { duration: 60, easing: Easing.linear }),
      withTiming(0, { duration: 60, easing: Easing.linear }),
    );
  });
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: jolt.value }],
  }));
  const { hot, onHot, paper } = colors.skin;
  const artwork = kit.track?.artwork ?? null;
  return (
    <View pointerEvents="none" style={{ width: width + SHADOW, height }}>
      <Animated.View
        style={[
          styles.strip,
          {
            width,
            height,
            boxShadow: `${SHADOW}px ${SHADOW}px 0 ${colors.text}`,
          },
          style,
        ]}
      >
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
                  width: height * 1.3,
                  height: height * 1.3,
                  borderRadius: height * 0.65,
                  top: -height * 0.4,
                  backgroundColor: hot,
                },
              ]}
            />
            <View style={[styles.blockPost, { backgroundColor: paper }]} />
            <View style={[styles.blockBar, { backgroundColor: paper }]} />
          </View>
        )}
        <Text
          style={[
            styles.stamp,
            { backgroundColor: hot, color: onHot, borderColor: onHot },
          ]}
        >
          {kit.isPlaying ? 'Sonando' : 'Pausa'}
        </Text>
      </Animated.View>
      <View
        style={[styles.tape, styles.tapeLeft, { backgroundColor: paper }]}
      />
      <View
        style={[styles.tape, styles.tapeRight, { backgroundColor: paper }]}
      />
    </View>
  );
}

/* ───────── title ───────── */

/**
 * The title, on one line. It types itself in when a new song starts and, if
 * it is wider than the screen, glides from side to side while the music plays.
 * Only this small piece re-renders while it types.
 */
function TypedTitle({
  kit,
  size,
  playing,
}: {
  kit: PlayerKit;
  size: number;
  playing: boolean;
}) {
  const { colors } = useColors();
  const styles = useStyles();
  const reduced = useReducedMotion();
  const title = kit.track?.title ?? '';
  const [typed, setTyped] = useState<number | null>(null);
  const [boxWidth, setBoxWidth] = useState(0);
  const [textWidth, setTextWidth] = useState(0);
  const x = useSharedValue(0);
  const typing = typed !== null;
  useTrackChange(kit.track?.id, () => {
    cancelAnimation(x);
    x.value = 0;
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
  // A title wider than the screen glides from side to side, on the UI thread.
  useEffect(() => {
    const overflow = boxWidth > 0 ? Math.max(0, textWidth - boxWidth) : 0;
    if (typing) {
      // Keep the cursor in view while the title types itself in.
      x.value = withTiming(-overflow, {
        duration: TYPE_MS * 1.5,
        easing: Easing.linear,
      });
      return;
    }
    if (overflow <= 0 || reduced || !playing) {
      cancelAnimation(x);
      x.value = withTiming(0, { duration: 300 });
      return;
    }
    const glide = {
      duration: Math.max(1200, overflow * 22),
      easing: Easing.inOut(Easing.quad),
    };
    x.value = withRepeat(
      withSequence(
        withDelay(1400, withTiming(-overflow, glide)),
        withDelay(1400, withTiming(0, glide)),
      ),
      -1,
    );
    return () => cancelAnimation(x);
  }, [boxWidth, playing, reduced, textWidth, typing, x]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));
  const line = size * 1.12;
  return (
    <View
      accessibilityLabel={title}
      accessibilityRole="header"
      accessible
      onLayout={event => setBoxWidth(event.nativeEvent.layout.width)}
      style={[styles.titleClip, { height: line }]}
    >
      <Animated.View style={[styles.titleRail, style]}>
        <Text
          numberOfLines={1}
          onLayout={event => setTextWidth(event.nativeEvent.layout.width)}
          style={[styles.title, { fontSize: size, lineHeight: line }]}
        >
          {typing ? title.slice(0, typed) : title}
          {typing ? (
            <Text style={{ backgroundColor: colors.skin.hot }}>{' '}</Text>
          ) : null}
        </Text>
      </Animated.View>
    </View>
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
      style={[
        { flex: 1, height, backgroundColor: color, transformOrigin: 'bottom' },
        style,
      ]}
    />
  );
}

/* ───────── buttons ───────── */

type IconProps = { color: string; size: number; strokeWidth: number };

/** Three square blocks: the brutalist "more" icon. */
function Blocks({ color, size }: IconProps) {
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path d="M3 10h4v4H3zM10 10h4v4h-4zM17 10h4v4h-4z" fill={color} />
    </Svg>
  );
}

/** A hard block with a flat shadow that sinks into the page when pressed. */
function Block({
  label,
  onPress,
  disabled,
  style,
  children,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const { colors } = useColors();
  const styles = useStyles();
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.block,
        style,
        pressed
          ? { transform: [{ translateX: SHADOW }, { translateY: SHADOW }] }
          : { boxShadow: `${SHADOW}px ${SHADOW}px 0 ${colors.text}` },
        disabled && styles.dim,
      ]}
    >
      {children}
    </Pressable>
  );
}

function Tool({
  label,
  caption,
  active,
  onPress,
  disabled,
  Icon,
}: {
  label: string;
  caption: string;
  active?: boolean;
  onPress: () => void;
  disabled?: boolean;
  Icon: ComponentType<IconProps>;
}) {
  const { colors } = useColors();
  const styles = useStyles();
  const color = active ? colors.skin.onHot : colors.text;
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[
        styles.tool,
        active && { backgroundColor: colors.skin.hot },
        disabled && styles.dim,
      ]}
    >
      <Icon color={color} size={21} strokeWidth={2.8} />
      <Text numberOfLines={1} style={[styles.toolText, { color }]}>
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
      <View
        style={[
          styles.panel,
          {
            bottom: insets.bottom + 16,
            boxShadow: `${SHADOW}px ${SHADOW}px 0 ${colors.text}`,
          },
        ]}
      >
        <View style={styles.panelHead}>
          <Text style={styles.panelTitle}>Más opciones</Text>
          <Pressable
            accessibilityLabel="Cerrar opciones"
            accessibilityRole="button"
            onPress={onClose}
            style={styles.panelClose}
          >
            <X color={colors.text} size={26} strokeWidth={3.5} />
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
  const { width, height } = useWindowDimensions();
  const [more, setMore] = useState(false);
  useEffect(() => {
    if (covered) setMore(false);
  }, [covered]);

  if (!kit.track) return null;
  const inner = width - 32;
  const stripWidth = inner - SHADOW;
  const stripHeight = Math.round(Math.max(110, Math.min(height * 0.19, 172)));
  const titleSize = Math.round(Math.max(40, Math.min(width * 0.15, 60)));
  const filled = kit.progress * SEGMENTS;
  const { hot, onHot, paper, ink } = colors.skin;
  const blockInk = ink ?? colors.text;
  const RepeatIcon = kit.repeatMode === RepeatMode.Track ? Repeat1 : Repeat;
  const moving = !kit.ready || kit.busy;

  return (
    <View
      style={[
        styles.player,
        { paddingTop: insets.top + 8, paddingBottom: insets.bottom + 12 },
      ]}
    >
      <DragHeader gesture={headerGesture} style={styles.top}>
        <Pressable
          accessibilityLabel="Cerrar reproductor"
          accessibilityRole="button"
          onPress={onClose}
          style={[styles.topCell, styles.topLeft]}
        >
          <ChevronDown color={colors.text} size={30} strokeWidth={3.5} />
        </Pressable>
        <Text numberOfLines={1} style={styles.counter}>
          Pista {two(kit.queueIndex + 1)} / {two(kit.queueCount)}
        </Text>
        <Pressable
          accessibilityLabel={
            kit.favorite ? 'Quitar de favoritas' : 'Añadir a favoritas'
          }
          accessibilityRole="button"
          accessibilityState={{ selected: kit.favorite }}
          onPress={kit.toggleFavorite}
          style={[
            styles.topCell,
            styles.topRight,
            kit.favorite && { backgroundColor: hot },
          ]}
        >
          <Heart
            color={kit.favorite ? onHot : colors.text}
            fill={kit.favorite ? onHot : 'none'}
            size={26}
            strokeWidth={3}
          />
        </Pressable>
      </DragHeader>

      <View style={styles.stripRow}>
        <CoverStrip height={stripHeight} kit={kit} width={stripWidth} />
      </View>

      <View
        style={[
          styles.titleBox,
          // One title line, the gap and the artist tag always fit below the cover.
          { minHeight: TITLE_ROOM_TOP + Math.ceil(titleSize * 1.12) + 44 },
        ]}
      >
        <TypedTitle kit={kit} playing={kit.lively} size={titleSize} />
        <Text numberOfLines={1} style={styles.artist}>
          {kit.track.artist}
        </Text>
      </View>

      <View style={styles.bars}>
        {BAR_HEIGHTS.map((barHeight, index) => (
          <Bar
            key={index}
            color={index % 4 === 2 ? hot : colors.text}
            height={barHeight}
            index={index}
            playing={kit.lively}
          />
        ))}
      </View>

      <View style={styles.times}>
        <Text style={styles.now}>{formatTime(kit.position)}</Text>
        <Text style={styles.left}>
          −{formatTime(Math.max(0, kit.duration - kit.position))}
        </Text>
      </View>
      <SeekArea kit={kit} style={styles.segments}>
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

      <Block
        disabled={!kit.ready}
        label={kit.isPlaying ? 'Pausar' : 'Reproducir'}
        onPress={kit.toggle}
        style={[styles.play, { backgroundColor: hot }]}
      >
        <Svg height={44} viewBox="0 0 24 24" width={44}>
          <Path
            d={kit.isPlaying ? 'M5 4h5v16H5zM14 4h5v16h-5z' : 'M6 3v18l15-9z'}
            fill={onHot}
          />
        </Svg>
        <Text style={[styles.playText, { color: onHot }]}>
          {kit.isPlaying ? 'Pausa' : 'Play'}
        </Text>
      </Block>

      <View style={styles.skips}>
        <Block
          disabled={moving}
          label="Canción anterior"
          onPress={kit.previous}
          style={[styles.skip, { backgroundColor: paper }]}
        >
          <Svg height={28} viewBox="0 0 24 24" width={28}>
            <Path d="M5 4h3v16H5zM20 4v16L9 12z" fill={blockInk} />
          </Svg>
          <Text style={[styles.skipText, { color: blockInk }]}>Ant.</Text>
        </Block>
        <Block
          disabled={moving}
          label="Siguiente canción"
          onPress={kit.next}
          style={[styles.skip, { backgroundColor: paper }]}
        >
          <Text style={[styles.skipText, { color: blockInk }]}>Sig.</Text>
          <Svg height={28} viewBox="0 0 24 24" width={28}>
            <Path d="M16 4h3v16h-3zM4 4l11 8-11 8z" fill={blockInk} />
          </Svg>
        </Block>
      </View>

      <View style={[styles.tools, { width: inner }]}>
        <Tool
          caption="Cola"
          Icon={ListMusic}
          label={`Abrir cola de reproducción con ${kit.queueCount} canciones`}
          onPress={kit.openQueue}
        />
        <Tool
          caption="Letras"
          Icon={FileText}
          label={`Abrir letras de ${kit.track.title}`}
          onPress={kit.openLyrics}
        />
        <Tool
          active={kit.shuffle}
          caption="Mezcla"
          disabled={moving}
          Icon={Shuffle}
          label={kit.shuffle ? 'Desactivar mezcla' : 'Activar mezcla'}
          onPress={kit.toggleShuffle}
        />
        <Tool
          active={kit.repeatOn}
          caption="Repetir"
          disabled={!kit.ready}
          Icon={RepeatIcon}
          label={kit.repeatLabel}
          onPress={kit.cycleRepeat}
        />
        <Tool
          active={more}
          caption="Más"
          Icon={Blocks}
          label="Más opciones: temporizador, velocidad, ecualizador y acciones"
          onPress={() => setMore(true)}
        />
      </View>

      {more ? <MoreOptions kit={kit} onClose={() => setMore(false)} /> : null}
    </View>
  );
}

const useStyles = createStyles(colors => {
  const display = colors.design.fonts.display;
  const label = colors.design.fonts.label;
  const border = { borderWidth: LINE, borderColor: colors.text };
  return {
    player: {
      flex: 1,
      paddingHorizontal: 16,
      gap: 12,
      backgroundColor: colors.background,
    },
    top: { flexDirection: 'row', height: 56, ...border },
    topCell: { width: 54, alignItems: 'center', justifyContent: 'center' },
    topLeft: { borderRightWidth: LINE, borderColor: colors.text },
    topRight: { borderLeftWidth: LINE, borderColor: colors.text },
    counter: {
      flex: 1,
      color: colors.text,
      fontFamily: display,
      fontSize: 22,
      textAlign: 'center',
      textAlignVertical: 'center',
      textTransform: 'uppercase',
      fontVariant: ['tabular-nums'],
    },
    stripRow: { alignItems: 'center', paddingTop: 6 },
    strip: { overflow: 'hidden', ...border },
    blockCircle: { position: 'absolute', left: '8%' },
    blockPost: {
      position: 'absolute',
      left: '62%',
      top: 0,
      bottom: 0,
      width: '12%',
    },
    blockBar: {
      position: 'absolute',
      left: 0,
      right: 0,
      bottom: 18,
      height: 14,
    },
    stamp: {
      position: 'absolute',
      right: 12,
      top: 12,
      paddingHorizontal: 8,
      paddingVertical: 1,
      borderWidth: LINE,
      fontFamily: display,
      fontSize: 18,
      textTransform: 'uppercase',
      transform: [{ rotate: '6deg' }],
    },
    tape: {
      position: 'absolute',
      width: 56,
      height: 20,
      opacity: 0.85,
      transform: [{ rotate: '-32deg' }],
    },
    tapeLeft: { left: -16, top: -12 },
    tapeRight: { right: -10, bottom: -12 },
    titleBox: {
      flex: 1,
      paddingTop: TITLE_ROOM_TOP,
      justifyContent: 'flex-end',
      alignItems: 'flex-start',
      gap: 8,
    },
    title: {
      color: colors.text,
      fontFamily: display,
      textTransform: 'uppercase',
    },
    titleClip: { alignSelf: 'stretch', overflow: 'hidden' },
    titleRail: {
      position: 'absolute',
      left: 0,
      top: 0,
      width: 4000,
      flexDirection: 'row',
      alignItems: 'flex-start',
    },
    artist: {
      paddingHorizontal: 10,
      paddingVertical: 4,
      backgroundColor: colors.text,
      color: colors.background,
      fontFamily: label,
      fontSize: 16,
      textTransform: 'uppercase',
    },
    bars: {
      height: 44,
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 4,
      borderBottomWidth: LINE,
      borderColor: colors.text,
    },
    times: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'baseline',
      marginBottom: -6,
    },
    now: {
      color: colors.text,
      fontFamily: display,
      fontSize: 24,
      fontVariant: ['tabular-nums'],
    },
    left: {
      color: colors.text,
      fontFamily: label,
      fontSize: 15,
      fontVariant: ['tabular-nums'],
    },
    segments: {
      height: 40,
      flexDirection: 'row',
      gap: 3,
      padding: 3,
      ...border,
    },
    segment: { flex: 1 },
    block: {
      ...border,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
    },
    dim: { opacity: 0.5 },
    play: { height: 78, gap: 16, marginRight: SHADOW },
    playText: { fontFamily: display, fontSize: 40, textTransform: 'uppercase' },
    skips: {
      flexDirection: 'row',
      gap: 12,
      height: 56,
      marginTop: 4,
      marginRight: SHADOW,
    },
    skip: { flex: 1, gap: 10 },
    skipText: { fontFamily: display, fontSize: 22, textTransform: 'uppercase' },
    tools: {
      flexDirection: 'row',
      marginTop: 10,
      borderTopWidth: LINE,
      borderLeftWidth: LINE,
      borderColor: colors.text,
    },
    tool: {
      flex: 1,
      height: 56,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
      borderRightWidth: LINE,
      borderBottomWidth: LINE,
      borderColor: colors.text,
    },
    toolText: { fontFamily: label, fontSize: 11, textTransform: 'uppercase' },
    scrim: { backgroundColor: colors.scrim },
    panel: {
      position: 'absolute',
      left: 16,
      right: 16 + SHADOW,
      backgroundColor: colors.background,
      ...border,
    },
    panelHead: {
      flexDirection: 'row',
      alignItems: 'center',
      borderBottomWidth: LINE,
      borderColor: colors.text,
    },
    panelTitle: {
      flex: 1,
      paddingHorizontal: 16,
      color: colors.text,
      fontFamily: display,
      fontSize: 26,
      textTransform: 'uppercase',
    },
    panelClose: {
      width: 56,
      height: 56,
      alignItems: 'center',
      justifyContent: 'center',
      borderLeftWidth: LINE,
      borderColor: colors.text,
    },
    panelRow: {
      minHeight: 58,
      paddingHorizontal: 16,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderBottomWidth: LINE,
      borderColor: colors.text,
    },
    panelLabel: { fontFamily: label, fontSize: 17, textTransform: 'uppercase' },
    panelValue: {
      fontFamily: display,
      fontSize: 20,
      textTransform: 'uppercase',
    },
  };
});
