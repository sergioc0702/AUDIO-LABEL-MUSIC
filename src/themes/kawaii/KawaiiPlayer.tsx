import { useEffect, useRef, useState, type ReactNode } from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import {
  ChevronDown,
  Heart,
  ListMusic,
  MoreHorizontal,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
  Volume1,
  Volume2,
  FileText,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { RepeatMode } from 'react-native-track-player';
import { useMediaVolume } from '../../hooks/useMediaVolume';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { createStyles, spacing, useColors } from '../../theme/theme';
import { Cover } from '../../ui/Cover';
import { Tap } from '../../ui/Tap';
import { formatTime } from '../../utils/formatTime';
import { PlayPauseIcon } from '../../player/PlayPauseIcon';
import { dogMood } from './dogMood';
import { ShihTzu } from './ShihTzu';
import {
  DragHeader,
  useTrackChange,
  usePlayerKit,
  type PlayerKit,
  type SkinProps,
} from '../../player/kit/playerKit';

const HEART =
  'M0 8 C -12 -2 -10 -13 -3 -13 C 0 -13 0 -9 0 -9 C 0 -9 0 -13 3 -13 C 10 -13 12 -2 0 8 Z';
const BONE =
  'M14 11 C 12 2 2 3 3 11 C -1 13 -1 23 3 25 C 2 33 12 34 14 25 L 38 25 C 40 34 50 33 49 25 C 53 23 53 13 49 11 C 50 3 40 2 38 11 Z';

/* ───────── stage ───────── */

/** A soft disc behind the dog that breathes with the music. */
function Glow({
  size,
  playing,
  color,
}: {
  size: number;
  playing: boolean;
  color: string;
}) {
  const reduced = useReducedMotion();
  const scale = useSharedValue(0.97);
  useEffect(() => {
    if (playing && !reduced) {
      scale.value = withRepeat(
        withTiming(1.03, { duration: 1150, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
    } else {
      cancelAnimation(scale);
      scale.value = withTiming(0.96, { duration: 600 });
    }
  }, [playing, reduced, scale]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: color,
        },
        style,
      ]}
    />
  );
}

/** A note that rises and fades on a loop while the music plays. */
function Note({
  playing,
  delay,
  x,
  bottom,
  size,
  color,
  glyph,
  rise,
}: {
  playing: boolean;
  delay: number;
  x: number;
  bottom: number;
  size: number;
  color: string;
  glyph: string;
  rise: number;
}) {
  const reduced = useReducedMotion();
  const t = useSharedValue(0);
  useEffect(() => {
    if (playing && !reduced) {
      t.value = 0;
      t.value = withDelay(
        delay,
        withRepeat(
          withTiming(1, { duration: 4200, easing: Easing.linear }),
          -1,
        ),
      );
    } else {
      cancelAnimation(t);
      t.value = 0;
    }
  }, [delay, playing, reduced, t]);
  const style = useAnimatedStyle(() => {
    const k = t.value;
    const fade = k < 0.15 ? k / 0.15 : k > 0.85 ? (1 - k) / 0.15 : 1;
    return {
      opacity: k === 0 ? 0 : 0.85 * fade,
      transform: [
        { translateX: Math.sin(k * Math.PI * 2) * 10 },
        { translateY: -k * rise },
        { rotate: `${Math.sin(k * 5 + delay) * 14}deg` },
      ],
    };
  });
  return (
    <Animated.Text
      pointerEvents="none"
      style={[
        {
          position: 'absolute',
          left: x,
          bottom,
          fontSize: size,
          color,
          fontWeight: '700',
        },
        style,
      ]}
    >
      {glyph}
    </Animated.Text>
  );
}

/** The album art as a sticker; it gives a little shake when the song changes. */
function Sticker({ kit, size }: { kit: PlayerKit; size: number }) {
  const styles = useStyles();
  const reduced = useReducedMotion();
  const tilt = useSharedValue(8);
  const scale = useSharedValue(1);
  useTrackChange(kit.track?.id, () => {
    if (reduced) return;
    tilt.value = withSequence(
      withTiming(-12, { duration: 120 }),
      withTiming(18, { duration: 140 }),
      withSpring(8, { damping: 6, stiffness: 160 }),
    );
    scale.value = withSequence(
      withTiming(1.22, { duration: 160 }),
      withSpring(1, { damping: 7 }),
    );
  });
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${tilt.value}deg` }, { scale: scale.value }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.sticker, { width: size, height: size }, style]}
    >
      <Cover size={size - 10} uri={kit.track?.artwork ?? null} />
    </Animated.View>
  );
}

/** Title and artist slide in when another song starts. */
function Titles({ kit }: { kit: PlayerKit }) {
  const { type } = useColors();
  const styles = useStyles();
  const reduced = useReducedMotion();
  const shift = useSharedValue(0);
  useTrackChange(kit.track?.id, () => {
    if (reduced) return;
    shift.value = 1;
    shift.value = withTiming(0, {
      duration: 420,
      easing: Easing.out(Easing.cubic),
    });
  });
  const style = useAnimatedStyle(() => ({
    opacity: 1 - shift.value * 0.8,
    transform: [{ translateY: shift.value * 16 }],
  }));
  if (!kit.track) return null;
  return (
    <Animated.View style={[styles.titles, style]}>
      <Text
        accessibilityRole="header"
        numberOfLines={1}
        style={[type.headline, styles.center]}
      >
        {kit.track.title}
      </Text>
      <Text numberOfLines={1} style={[type.secondary, styles.center]}>
        {kit.track.artist}
      </Text>
    </Animated.View>
  );
}

/* ───────── controls ───────── */

/** A slim bar with a heart; tap or drag to move through the song. */
function SeekBar({ kit }: { kit: PlayerKit }) {
  const { colors } = useColors();
  const styles = useStyles();
  const width = useSharedValue(1);
  const [preview, setPreview] = useState<number | null>(null);
  const shown = preview ?? kit.progress;
  const enabled = kit.ready && kit.duration > 0;
  const pan = Gesture.Pan()
    .enabled(enabled)
    .minDistance(0)
    .onBegin(event => {
      scheduleOnRN(setPreview, Math.max(0, Math.min(1, event.x / width.value)));
    })
    .onUpdate(event => {
      scheduleOnRN(setPreview, Math.max(0, Math.min(1, event.x / width.value)));
    })
    .onEnd(event => {
      scheduleOnRN(kit.seekTo, Math.max(0, Math.min(1, event.x / width.value)));
    })
    .onFinalize(() => {
      scheduleOnRN(setPreview, null);
    });
  return (
    <View>
      <GestureDetector gesture={pan}>
        <View
          accessible
          accessibilityActions={[
            { name: 'increment', label: 'Avanzar 10 segundos' },
            { name: 'decrement', label: 'Retroceder 10 segundos' },
          ]}
          accessibilityLabel="Cambiar la posición de la canción"
          accessibilityRole="adjustable"
          accessibilityValue={{ text: formatTime(kit.position) }}
          collapsable={false}
          onAccessibilityAction={event => {
            if (!enabled) return;
            const delta =
              event.nativeEvent.actionName === 'increment' ? 10 : -10;
            kit.seekTo((kit.position + delta) / kit.duration);
          }}
          onLayout={event => {
            width.value = Math.max(1, event.nativeEvent.layout.width);
          }}
          style={styles.seek}
        >
          <View style={styles.rail} />
          <View style={[styles.fill, { width: `${shown * 100}%` }]} />
          <View
            style={[
              styles.seekThumb,
              { left: `${shown * 100}%`, marginLeft: -shown * 30 },
            ]}
          >
            <Svg height={30} viewBox="-15 -15 30 30" width={30}>
              <Path
                d={HEART}
                fill="#ffffff"
                stroke={colors.accent}
                strokeLinejoin="round"
                strokeWidth={2.6}
              />
            </Svg>
          </View>
        </View>
      </GestureDetector>
      <View style={styles.times}>
        <Text style={[styles.time]}>
          {formatTime(preview !== null ? preview * kit.duration : kit.position)}
        </Text>
        <Text style={[styles.time]}>{formatTime(kit.duration)}</Text>
      </View>
    </View>
  );
}

/** The phone's media volume with a bone; the dog reacts to it. */
function VolumeLine({ volume }: { volume: ReturnType<typeof useMediaVolume> }) {
  const { colors, type } = useColors();
  const styles = useStyles();
  const width = useSharedValue(1);
  const last = useRef({ at: 0, level: volume.level });
  const send = (next: number) => {
    const now = Date.now();
    if (
      Math.abs(next - last.current.level) < 0.02 &&
      now - last.current.at < 120
    )
      return;
    last.current = { at: now, level: next };
    volume.change(next);
  };
  const drag = Gesture.Pan()
    .enabled(!volume.fixed)
    .minDistance(0)
    .onBegin(event => {
      scheduleOnRN(send, Math.max(0, Math.min(1, event.x / width.value)));
    })
    .onUpdate(event => {
      scheduleOnRN(send, Math.max(0, Math.min(1, event.x / width.value)));
    });
  const percent = Math.round(volume.level * 100);
  if (volume.fixed) {
    return (
      <Text style={[type.caption, styles.center]}>
        Volumen fijo en este teléfono
      </Text>
    );
  }
  return (
    <View style={styles.volume}>
      <Volume1 color={colors.textSecondary} size={20} strokeWidth={2.4} />
      <GestureDetector gesture={drag}>
        <View
          accessible
          accessibilityActions={[
            { name: 'increment', label: 'Subir volumen' },
            { name: 'decrement', label: 'Bajar volumen' },
          ]}
          accessibilityLabel="Volumen"
          accessibilityRole="adjustable"
          accessibilityValue={{
            min: 0,
            max: 100,
            now: percent,
            text: `${percent} %`,
          }}
          collapsable={false}
          onAccessibilityAction={event =>
            volume.change(
              volume.level +
                (event.nativeEvent.actionName === 'increment' ? 0.1 : -0.1),
            )
          }
          onLayout={event => {
            width.value = Math.max(1, event.nativeEvent.layout.width);
          }}
          style={styles.boneTrack}
        >
          <View style={styles.boneRail} />
          <View style={[styles.boneFill, { width: `${percent}%` }]} />
          <View
            style={[
              styles.bone,
              { left: `${percent}%`, marginLeft: -(percent / 100) * 34 },
            ]}
          >
            <Svg height={24} viewBox="0 0 52 36" width={34}>
              <Path
                d={BONE}
                fill="#ffffff"
                stroke={colors.text}
                strokeLinejoin="round"
                strokeWidth={3.4}
              />
            </Svg>
          </View>
        </View>
      </GestureDetector>
      <Volume2 color={colors.textSecondary} size={22} strokeWidth={2.4} />
    </View>
  );
}

function RoundIcon({
  label,
  active,
  onPress,
  disabled,
  children,
}: {
  label: string;
  active?: boolean;
  onPress: () => void;
  disabled?: boolean;
  children: ReactNode;
}) {
  const styles = useStyles();
  return (
    <Tap
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={onPress}
      pressedScale={0.9}
      style={[styles.iconButton, active && styles.iconButtonOn]}
    >
      {children}
    </Tap>
  );
}

function PlayButton({ kit }: { kit: PlayerKit }) {
  const { colors } = useColors();
  const styles = useStyles();
  const reduced = useReducedMotion();
  const beat = useSharedValue(1);
  useEffect(() => {
    if (kit.lively && !reduced) {
      beat.value = withRepeat(
        withTiming(1.04, { duration: 1150, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
    } else {
      cancelAnimation(beat);
      beat.value = withTiming(1, { duration: 300 });
    }
  }, [beat, kit.lively, reduced]);
  const style = useAnimatedStyle(() => ({
    transform: [{ scale: beat.value }],
  }));
  return (
    <Animated.View style={style}>
      <Tap
        accessibilityLabel={kit.isPlaying ? 'Pausar' : 'Reproducir'}
        accessibilityRole="button"
        disabled={!kit.ready}
        onPress={kit.toggle}
        pressedScale={0.9}
        style={styles.play}
      >
        <PlayPauseIcon
          color={colors.onControl}
          isPlaying={kit.isPlaying}
          size={34}
        />
      </Tap>
    </Animated.View>
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
  const { type } = useColors();
  const styles = useStyles();
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
        style={[StyleSheet.absoluteFill, styles.scrim]}
      />
      <View
        style={[styles.panel, { marginBottom: insets.bottom + spacing.sm }]}
      >
        <Text style={[type.title, styles.panelTitle]}>Más opciones</Text>
        {rows.map(row => (
          <Tap
            key={row.key}
            accessibilityLabel={`${row.label}: ${row.value}`}
            accessibilityRole="button"
            onPress={() => {
              onClose();
              row.onPress();
            }}
            pressedScale={0.97}
            style={styles.panelRow}
          >
            <Text style={type.bodyStrong}>{row.label}</Text>
            <Text style={[type.bodyStrong, styles.panelValue]}>
              {row.value}
            </Text>
          </Tap>
        ))}
      </View>
    </View>
  );
}

/* ───────── player ───────── */

export function KawaiiPlayer({ covered, headerGesture, onClose }: SkinProps) {
  const kit = usePlayerKit({ covered });
  const { colors, type } = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const volume = useMediaVolume(kit.visible);
  const [petted, setPetted] = useState(false);
  const [more, setMore] = useState(false);
  const favScale = useSharedValue(1);
  const stage = Math.max(
    200,
    Math.min(width - 2 * spacing.lg, height * 0.4, 380),
  );
  const dog = stage * 0.82;
  const mood = dogMood(
    kit.isPlaying,
    volume.fixed ? 0.5 : volume.level,
    petted,
  );
  const favStyle = useAnimatedStyle(() => ({
    transform: [{ scale: favScale.value }],
  }));

  useEffect(() => {
    if (!petted) return;
    const timer = setTimeout(() => setPetted(false), 1800);
    return () => clearTimeout(timer);
  }, [petted]);
  useEffect(() => {
    if (covered) setMore(false);
  }, [covered]);

  if (!kit.track) return null;
  const RepeatIcon = kit.repeatMode === RepeatMode.Track ? Repeat1 : Repeat;
  const iconColor = (on: boolean) => (on ? colors.onAccent : colors.text);
  const notes = [
    {
      x: stage * 0.06,
      glyph: '♫',
      size: 26,
      color: colors.skin.lazo ?? colors.accent,
      delay: 0,
    },
    {
      x: stage * 0.86,
      glyph: '♪',
      size: 22,
      color: colors.accent,
      delay: 1050,
    },
    {
      x: stage * 0.14,
      glyph: '♪',
      size: 20,
      color: colors.accent,
      delay: 2100,
    },
    {
      x: stage * 0.8,
      glyph: '♫',
      size: 28,
      color: colors.skin.lazo ?? colors.accent,
      delay: 3150,
    },
  ];

  return (
    <View
      style={[styles.player, { paddingBottom: insets.bottom + spacing.sm }]}
    >
      <DragHeader
        gesture={headerGesture}
        style={[styles.top, { paddingTop: insets.top }]}
      >
        <Tap
          accessibilityLabel="Cerrar reproductor"
          accessibilityRole="button"
          onPress={onClose}
          pressedScale={0.9}
          style={styles.topButton}
        >
          <ChevronDown color={colors.text} size={28} strokeWidth={2.6} />
        </Tap>
        <View style={styles.pill}>
          <Text numberOfLines={1} style={type.label}>
            Sonando · {kit.queueIndex + 1} de {kit.queueCount}
          </Text>
        </View>
        <Animated.View style={favStyle}>
          <Tap
            accessibilityLabel={
              kit.favorite ? 'Quitar de favoritas' : 'Añadir a favoritas'
            }
            accessibilityRole="button"
            accessibilityState={{ selected: kit.favorite }}
            onPress={() => {
              favScale.value = withSequence(
                withTiming(1.25, { duration: 120 }),
                withSpring(1, { damping: 6 }),
              );
              kit.toggleFavorite();
            }}
            pressedScale={0.9}
            style={styles.topButton}
          >
            <Heart
              color={kit.favorite ? colors.accent : colors.text}
              fill={kit.favorite ? colors.accent : 'none'}
              size={26}
              strokeWidth={2.4}
            />
          </Tap>
        </Animated.View>
      </DragHeader>

      <View style={styles.middle}>
        <View style={{ width: stage, height: stage }}>
          <View style={[styles.center, StyleSheet.absoluteFill]}>
            <Glow
              color={colors.skin.disc ?? colors.surface}
              playing={kit.lively}
              size={stage * 0.92}
            />
          </View>
          <View
            style={[
              styles.cushion,
              {
                width: stage * 0.72,
                height: stage * 0.16,
                left: stage * 0.14,
                top: stage * 0.7,
                backgroundColor: colors.skin.ring,
              },
            ]}
          />
          {notes.map(note => (
            <Note
              key={note.delay}
              bottom={stage * 0.3}
              playing={kit.lively}
              rise={stage * 0.62}
              {...note}
            />
          ))}
          <Pressable
            accessibilityHint="Toca al perrito para acariciarlo"
            accessibilityLabel="Acariciar al perrito"
            accessibilityRole="button"
            onPress={() => setPetted(true)}
            style={[styles.dog, { left: (stage - dog) / 2, top: stage * 0.02 }]}
          >
            <ShihTzu
              active={kit.visible}
              bow={colors.skin.lazo}
              mood={mood}
              size={dog}
            />
          </Pressable>
          <View style={[styles.stickerSpot, { top: stage * 0.02 }]}>
            <Sticker kit={kit} size={Math.round(stage * 0.22)} />
          </View>
        </View>
        <Titles kit={kit} />
      </View>

      <SeekBar kit={kit} />

      <View style={styles.transport}>
        <Tap
          accessibilityLabel="Canción anterior"
          accessibilityRole="button"
          disabled={!kit.ready || kit.busy}
          onPress={kit.previous}
          pressedScale={0.9}
          style={styles.soft}
        >
          <SkipBack color={colors.text} fill={colors.text} size={26} />
        </Tap>
        <PlayButton kit={kit} />
        <Tap
          accessibilityLabel="Siguiente canción"
          accessibilityRole="button"
          disabled={!kit.ready || kit.busy}
          onPress={kit.next}
          pressedScale={0.9}
          style={styles.soft}
        >
          <SkipForward color={colors.text} fill={colors.text} size={26} />
        </Tap>
      </View>

      <VolumeLine volume={volume} />

      <View style={styles.icons}>
        <RoundIcon
          active={kit.shuffle}
          disabled={!kit.ready || kit.busy}
          label={kit.shuffle ? 'Desactivar mezcla' : 'Activar mezcla'}
          onPress={kit.toggleShuffle}
        >
          <Shuffle color={iconColor(kit.shuffle)} size={23} strokeWidth={2.5} />
        </RoundIcon>
        <RoundIcon
          active={kit.repeatOn}
          disabled={!kit.ready}
          label={kit.repeatLabel}
          onPress={kit.cycleRepeat}
        >
          <RepeatIcon
            color={iconColor(kit.repeatOn)}
            size={23}
            strokeWidth={2.5}
          />
        </RoundIcon>
        <RoundIcon
          label={`Abrir cola de reproducción con ${kit.queueCount} canciones`}
          onPress={kit.openQueue}
        >
          <ListMusic color={colors.text} size={23} strokeWidth={2.5} />
        </RoundIcon>
        <RoundIcon
          label={`Abrir letras de ${kit.track.title}`}
          onPress={kit.openLyrics}
        >
          <FileText color={colors.text} size={23} strokeWidth={2.5} />
        </RoundIcon>
        <RoundIcon
          active={more}
          label="Más opciones: temporizador, velocidad, ecualizador y acciones"
          onPress={() => setMore(true)}
        >
          <MoreHorizontal color={iconColor(more)} size={23} strokeWidth={2.5} />
        </RoundIcon>
      </View>

      {more ? <MoreOptions kit={kit} onClose={() => setMore(false)} /> : null}
    </View>
  );
}

const useStyles = createStyles(colors => ({
  player: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  top: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    minHeight: 60,
  },
  topButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    flexShrink: 1,
    paddingHorizontal: spacing.md,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.surfaceHigh,
  },
  middle: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    textAlign: 'center',
  },
  cushion: { position: 'absolute', borderRadius: 999 },
  dog: { position: 'absolute' },
  stickerSpot: { position: 'absolute', right: 0 },
  sticker: {
    borderRadius: 22,
    borderWidth: 5,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    backgroundColor: '#ffffff',
  },
  titles: { alignSelf: 'stretch', gap: 2 },
  seek: { height: 44, justifyContent: 'center' },
  rail: {
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.skin.ring ?? colors.outline,
  },
  fill: {
    position: 'absolute',
    left: 0,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.accent,
  },
  seekThumb: { position: 'absolute' },
  times: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -6,
  },
  time: {
    color: colors.textSecondary,
    fontFamily: colors.design.fonts.label,
    fontSize: 14,
    fontVariant: ['tabular-nums'],
  },
  transport: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 30,
    paddingVertical: spacing.sm,
  },
  soft: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceHigh,
  },
  play: {
    width: 88,
    height: 88,
    borderRadius: 44,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.control,
    boxShadow: `0 8px 0 ${colors.skin.ring ?? colors.outline}`,
  },
  volume: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    minHeight: 44,
  },
  boneTrack: { flex: 1, height: 44, justifyContent: 'center' },
  boneRail: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.skin.ring ?? colors.outline,
  },
  boneFill: {
    position: 'absolute',
    left: 0,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textSecondary,
  },
  bone: { position: 'absolute' },
  icons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
  },
  iconButton: {
    width: 56,
    height: 52,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceHigh,
  },
  iconButtonOn: { backgroundColor: colors.accent },
  scrim: { backgroundColor: colors.scrim },
  panel: {
    position: 'absolute',
    left: spacing.sm,
    right: spacing.sm,
    bottom: 0,
    borderRadius: 28,
    padding: spacing.sm,
    gap: 6,
    backgroundColor: colors.skin.disc ?? colors.surface,
  },
  panelTitle: { paddingHorizontal: spacing.sm, paddingVertical: spacing.xs },
  panelRow: {
    minHeight: 56,
    borderRadius: 18,
    paddingHorizontal: spacing.md,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: colors.surfaceHigh,
  },
  panelValue: { color: colors.accent },
}));
