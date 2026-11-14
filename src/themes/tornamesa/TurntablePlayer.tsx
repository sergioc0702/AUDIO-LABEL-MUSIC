import { useEffect, useState, type ComponentType } from 'react';
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
  useFrameCallback,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import {
  ChevronDown,
  FileText,
  Heart,
  ListMusic,
  MoreHorizontal,
  X,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
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

/** Degrees per second at normal speed: about 33 rpm. */
const FULL_SPEED = 200;
/** Seconds of music for one full turn when the record is dragged by hand. */
const SECONDS_PER_TURN = 8;
const GROOVES = [120, 112, 104, 96, 88, 80, 72, 64, 56];
const SHADOW = 3;

/* ───────── the deck ───────── */

/**
 * The platter, record and tonearm. Everything moves on the UI thread: the
 * record coasts to a stop on pause, follows the finger when dragged (which
 * also seeks), and slides in with the arm lifted when the song changes.
 */
function Deck({ kit, size }: { kit: PlayerKit; size: number }) {
  const { colors } = useColors();
  const styles = useStyles();
  const reduced = useReducedMotion();
  const spin = useSharedValue(0);
  const speed = useSharedValue(0);
  const running = useSharedValue(false);
  const scrubbing = useSharedValue(false);
  const scrubbed = useSharedValue(0);
  const lastAngle = useSharedValue(0);
  const arm = useSharedValue(-4);
  const swap = useSharedValue(0);
  const glow = useSharedValue(0.4);
  const rate = useSharedValue(kit.rate);
  running.value = kit.lively && !reduced;
  rate.value = kit.rate;

  const frame = useFrameCallback(info => {
    'worklet';
    const dt = Math.min(0.05, (info.timeSincePreviousFrame ?? 16) / 1000);
    const target =
      running.value && !scrubbing.value ? FULL_SPEED * rate.value : 0;
    speed.value += (target - speed.value) * Math.min(1, dt * 1.6);
    spin.value = (spin.value + speed.value * dt) % 360;
  }, false);
  useEffect(() => {
    frame.setActive(kit.visible && !reduced);
  }, [frame, kit.visible, reduced]);

  // The arm rests off the record on pause and creeps inward as the song plays.
  const lifted = !kit.isPlaying;
  const armTarget = lifted ? -4 : 18 + kit.progress * 16;
  useEffect(() => {
    arm.value = withTiming(armTarget, {
      duration: reduced ? 0 : 700,
      easing: Easing.out(Easing.cubic),
    });
  }, [arm, armTarget, reduced]);

  useEffect(() => {
    if (kit.lively && !reduced) {
      glow.value = withRepeat(
        withTiming(1, { duration: 1200, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
    } else {
      cancelAnimation(glow);
      glow.value = withTiming(0.35, { duration: 300 });
    }
  }, [glow, kit.lively, reduced]);

  useTrackChange(kit.track?.id, () => {
    if (reduced) return;
    swap.value = withSequence(
      withTiming(1, { duration: 0 }),
      withTiming(0, { duration: 450, easing: Easing.out(Easing.cubic) }),
    );
    arm.value = withSequence(
      withTiming(-4, { duration: 180 }),
      withTiming(armTarget, {
        duration: 600,
        easing: Easing.out(Easing.cubic),
      }),
    );
  });

  const seekBy = (degrees: number) => {
    if (!kit.ready || kit.duration <= 0) return;
    const seconds = (degrees / 360) * SECONDS_PER_TURN;
    kit.seekTo((kit.position + seconds) / kit.duration);
  };
  const half = size / 2;
  const scratch = Gesture.Pan()
    .enabled(kit.ready && kit.duration > 0)
    .minDistance(4)
    .onBegin(event => {
      lastAngle.value =
        (Math.atan2(event.y - half, event.x - half) * 180) / Math.PI;
      scrubbed.value = 0;
    })
    .onStart(() => {
      scrubbing.value = true;
    })
    .onUpdate(event => {
      const angle =
        (Math.atan2(event.y - half, event.x - half) * 180) / Math.PI;
      let delta = angle - lastAngle.value;
      if (delta > 180) delta -= 360;
      if (delta < -180) delta += 360;
      lastAngle.value = angle;
      scrubbed.value += delta;
      spin.value = (spin.value + delta + 360) % 360;
    })
    .onEnd(() => {
      if (Math.abs(scrubbed.value) > 2) scheduleOnRN(seekBy, scrubbed.value);
    })
    .onFinalize(() => {
      scrubbing.value = false;
    });

  const record = useAnimatedStyle(() => ({
    transform: [
      { translateX: swap.value * size * 1.2 },
      { rotate: `${spin.value}deg` },
    ],
  }));
  // Strobe dots drift a little behind the record, like a real platter's.
  const strobe = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value * 0.97}deg` }],
  }));
  const armStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${arm.value}deg` }],
  }));
  const lamp = useAnimatedStyle(() => ({ opacity: glow.value }));

  const { mat, arm: armColor, keyEdge } = colors.skin;
  const k = size / 276;
  const disc = size - 20;
  const label = disc * 0.36;
  // The tonearm pivots just past the platter's top-right edge.
  const pivotX = size * 0.99;
  const pivotY = size * 0.11;

  return (
    <View style={{ width: size, height: size }}>
      <GestureDetector gesture={scratch}>
        <View
          collapsable={false}
          style={[
            styles.platter,
            {
              width: size,
              height: size,
              borderRadius: half,
              backgroundColor: mat,
            },
          ]}
        >
          <Animated.View style={[StyleSheet.absoluteFill, strobe]}>
            <Svg height={size} viewBox="0 0 276 276" width={size}>
              <Circle
                cx="138"
                cy="138"
                fill="none"
                r="133"
                stroke={colors.textSecondary}
                strokeDasharray="2 6"
                strokeWidth="5"
              />
              <Circle
                cx="138"
                cy="138"
                fill="none"
                opacity={0.6}
                r="125"
                stroke={colors.textSecondary}
                strokeDasharray="2 7"
                strokeWidth="3"
              />
            </Svg>
          </Animated.View>
          <Animated.View
            style={[
              styles.record,
              { width: disc, height: disc, borderRadius: disc / 2 },
              record,
            ]}
          >
            <Svg height={disc} viewBox="0 0 256 256" width={disc}>
              <Circle cx="128" cy="128" fill="#0e0e10" r="128" />
              {GROOVES.map(r => (
                <Circle
                  key={r}
                  cx="128"
                  cy="128"
                  fill="none"
                  r={r}
                  stroke="#24242a"
                  strokeWidth="1"
                />
              ))}
              <Path
                d="M128 4 A124 124 0 0 1 216 40 L170 86 A60 60 0 0 0 128 68 Z"
                fill="#ffffff"
                opacity={0.07}
              />
            </Svg>
            <View
              style={[
                styles.label,
                { width: label, height: label, borderRadius: label / 2 },
              ]}
            >
              <Cover round size={label} uri={kit.track?.artwork ?? null} />
              <View style={[styles.spindle, { backgroundColor: armColor }]} />
            </View>
          </Animated.View>
        </View>
      </GestureDetector>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.lamp,
          {
            backgroundColor: colors.accent,
            boxShadow: `0 0 14px 4px ${colors.accent}`,
          },
          lamp,
        ]}
      />
      <Animated.View
        pointerEvents="none"
        style={[
          styles.arm,
          {
            left: pivotX - 52 * k,
            top: pivotY - 36 * k,
            width: 90 * k,
            height: 270 * k,
            transformOrigin: `${52 * k}px ${36 * k}px`,
          },
          armStyle,
        ]}
      >
        <Svg height={270 * k} viewBox="0 0 90 270" width={90 * k}>
          <Circle cx="52" cy="36" fill={keyEdge} r="24" />
          <Circle cx="52" cy="36" fill={armColor} r="15" />
          <Rect fill={armColor} height="16" rx="3" width="16" x="44" y="0" />
          <Path
            d="M52 36 L52 210 L38 246"
            fill="none"
            stroke={armColor}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth="6"
          />
          <Rect
            fill={armColor}
            height="30"
            rx="4"
            transform="rotate(22 37 251)"
            width="22"
            x="26"
            y="236"
          />
        </Svg>
      </Animated.View>
    </View>
  );
}

/** The pitch fader beside the record; it shows the speed and opens the choices. */
function Pitch({ kit, height }: { kit: PlayerKit; height: number }) {
  const { colors } = useColors();
  const styles = useStyles();
  const travel = height - 22;
  const offset = Math.max(
    0,
    Math.min(travel, travel / 2 - (kit.rate - 1) * (travel / 2)),
  );
  const percent = Math.round((kit.rate - 1) * 100);
  const caption =
    percent === 0 ? '±0%' : `${percent > 0 ? '+' : '−'}${Math.abs(percent)}%`;
  return (
    <Pressable
      accessibilityLabel={`Velocidad de reproducción ${kit.rate}×`}
      accessibilityRole="button"
      onPress={kit.openSpeed}
      style={styles.pitch}
    >
      <Text style={styles.deckLabel}>PITCH</Text>
      <View style={[styles.pitchTrack, { height }]}>
        <View style={styles.pitchSlot} />
        <View
          style={[
            styles.pitchCap,
            {
              top: offset,
              backgroundColor: colors.skin.key,
              boxShadow: `0 2px 0 ${colors.skin.keyEdge}`,
            },
          ]}
        >
          <View style={[styles.pitchMark, { backgroundColor: colors.text }]} />
        </View>
      </View>
      <Text style={styles.deckLabel}>{caption}</Text>
    </Pressable>
  );
}

/* ───────── the mixer ───────── */

/** A rotary knob: each tap turns it to the next position, on the UI thread. */
function Knob({
  caption,
  value,
  label,
  step,
  steps,
  onPress,
  disabled,
}: {
  caption: string;
  value: string;
  label: string;
  step: number;
  steps: number;
  onPress: () => void;
  disabled?: boolean;
}) {
  const { colors } = useColors();
  const styles = useStyles();
  const reduced = useReducedMotion();
  const amount = steps > 1 ? step / (steps - 1) : 0;
  const turn = useSharedValue(-135 + 270 * amount);
  useEffect(() => {
    turn.value = withTiming(-135 + 270 * amount, {
      duration: reduced ? 0 : 250,
      easing: Easing.out(Easing.cubic),
    });
  }, [amount, reduced, turn]);
  const knob = useAnimatedStyle(() => ({
    transform: [{ rotate: `${turn.value}deg` }],
  }));
  const on = amount > 0;
  const arc = Math.max(0.1, 113 * amount);
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={[styles.knobBox, disabled && styles.dim]}
    >
      <View style={[styles.knobWell, { backgroundColor: colors.skin.mat }]}>
        <Svg height={54} style={StyleSheet.absoluteFill} width={54}>
          <Circle
            cx="27"
            cy="27"
            fill="none"
            r="24"
            stroke={on ? colors.accent : 'rgba(0,0,0,0.3)'}
            strokeDasharray={`${arc} 200`}
            strokeLinecap="round"
            strokeWidth="3"
            transform="rotate(150 27 27)"
          />
        </Svg>
        <Animated.View
          style={[
            styles.knobCap,
            {
              backgroundColor: colors.skin.key,
              boxShadow: `0 2px 0 ${colors.skin.keyEdge}`,
            },
            knob,
          ]}
        >
          <View
            style={[
              styles.knobMark,
              { backgroundColor: on ? colors.accent : colors.text },
            ]}
          />
        </Animated.View>
      </View>
      <Text numberOfLines={1} style={styles.knobCaption}>
        {caption}
      </Text>
      <Text numberOfLines={1} style={styles.knobValue}>
        {value}
      </Text>
    </Pressable>
  );
}

type IconProps = { color: string; size: number; strokeWidth: number };

/** A rubber key that sinks when pressed. */
function Key({
  label,
  onPress,
  disabled,
  wide,
  caption,
  Icon,
  icon,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  wide?: boolean;
  caption: string;
  Icon?: ComponentType<IconProps>;
  icon?: string;
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
        styles.key,
        wide ? styles.keyWide : styles.keyFlex,
        { backgroundColor: colors.skin.key },
        pressed
          ? { transform: [{ translateY: SHADOW }] }
          : { boxShadow: `0 ${SHADOW}px 0 ${colors.skin.keyEdge}` },
        disabled && styles.dim,
      ]}
    >
      {Icon ? <Icon color={colors.text} size={20} strokeWidth={2.2} /> : null}
      {icon ? (
        <Svg height={22} viewBox="0 0 24 24" width={22}>
          <Path d={icon} fill={colors.text} />
        </Svg>
      ) : null}
      <Text
        numberOfLines={1}
        style={[styles.keyText, wide && styles.keyWideText]}
      >
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
      <View style={[styles.panel, { bottom: insets.bottom + 16 }]}>
        <View style={styles.panelHead}>
          <Text style={styles.panelTitle}>Más opciones</Text>
          <Pressable
            accessibilityLabel="Cerrar opciones"
            accessibilityRole="button"
            onPress={onClose}
            style={styles.panelClose}
          >
            <X color={colors.text} size={22} strokeWidth={2.6} />
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
              styles.panelRow,
              {
                backgroundColor: colors.skin.key,
              },
              !pressed && { boxShadow: `0 2px 0 ${colors.skin.keyEdge}` },
            ]}
          >
            <Text style={styles.panelLabel}>{row.label}</Text>
            <Text style={[styles.panelLabel, { color: colors.accent }]}>
              {row.value}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/* ───────── player ───────── */

export function TurntablePlayer({
  covered,
  headerGesture,
  onClose,
}: SkinProps) {
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
  const track = kit.track;
  const plate = width - 24;
  // Room for the arm's base and the pitch fader beside the record.
  const platter = Math.round(
    Math.max(200, Math.min(plate - 100, height * 0.3)),
  );
  const moving = !kit.ready || kit.busy;
  const repeatStep =
    kit.repeatMode === RepeatMode.Track
      ? 2
      : kit.repeatMode === RepeatMode.Queue
      ? 1
      : 0;
  const repeatValue = ['apagado', 'todas', 'una'][repeatStep];
  const ink = colors.onControl;

  return (
    <View
      style={[
        styles.player,
        { paddingTop: insets.top, paddingBottom: insets.bottom + 12 },
      ]}
    >
      <DragHeader gesture={headerGesture} style={styles.top}>
        <Pressable
          accessibilityLabel="Cerrar reproductor"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.topButton}
        >
          <ChevronDown color={colors.text} size={26} strokeWidth={2.4} />
        </Pressable>
        <Text numberOfLines={1} style={styles.source}>
          Desde {kit.sourceLabel}
        </Text>
        <Pressable
          accessibilityLabel={
            kit.favorite ? 'Quitar de favoritas' : 'Añadir a favoritas'
          }
          accessibilityRole="button"
          accessibilityState={{ selected: kit.favorite }}
          onPress={kit.toggleFavorite}
          style={styles.topButton}
        >
          <Heart
            color={kit.favorite ? colors.accent : colors.text}
            fill={kit.favorite ? colors.accent : 'none'}
            size={24}
            strokeWidth={2.2}
          />
        </Pressable>
      </DragHeader>

      <View style={[styles.plate, { backgroundColor: colors.surface }]}>
        <Text style={[styles.deckLabel, styles.brand]}>
          MM-1200 · DIRECT DRIVE
        </Text>
        <View style={styles.deckRow}>
          <Deck kit={kit} size={platter} />
          <Pitch height={Math.round(platter * 0.55)} kit={kit} />
        </View>
        <Pressable
          accessibilityLabel={kit.isPlaying ? 'Pausar' : 'Reproducir'}
          accessibilityRole="button"
          accessibilityState={{ disabled: !kit.ready }}
          disabled={!kit.ready}
          onPress={kit.toggle}
          style={({ pressed }) => [
            styles.start,
            { backgroundColor: colors.control },
            pressed
              ? { transform: [{ translateY: SHADOW + 1 }] }
              : { boxShadow: `0 ${SHADOW + 1}px 0 ${colors.skin.keyEdge}` },
            !kit.ready && styles.dim,
          ]}
        >
          <Svg height={24} viewBox="0 0 24 24" width={24}>
            <Path
              d={kit.isPlaying ? 'M5 4h5v16H5zM14 4h5v16h-5z' : 'M7 4v16l13-8z'}
              fill={ink}
            />
          </Svg>
          <Text style={[styles.startText, { color: ink }]}>START · STOP</Text>
          <View
            style={[
              styles.led,
              kit.isPlaying
                ? { backgroundColor: ink, boxShadow: `0 0 8px ${ink}` }
                : styles.ledOff,
            ]}
          />
        </Pressable>
      </View>

      <View style={styles.titles}>
        <Text accessibilityRole="header" numberOfLines={1} style={styles.title}>
          {track.title}
        </Text>
        <Text numberOfLines={1} style={styles.artist}>
          {track.artist} · {track.album}
        </Text>
      </View>

      <View>
        <SeekArea kit={kit} style={styles.seek}>
          <View style={styles.rail} />
          <View
            style={[
              styles.railFill,
              {
                width: `${kit.progress * 100}%`,
                backgroundColor: colors.accent,
              },
            ]}
          />
          <View
            style={[
              styles.cap,
              {
                left: `${kit.progress * 100}%`,
                backgroundColor: colors.skin.key,
                boxShadow: `0 ${SHADOW}px 0 ${colors.skin.keyEdge}`,
              },
            ]}
          >
            <View
              style={[styles.capMark, { backgroundColor: colors.accent }]}
            />
          </View>
        </SeekArea>
        <View style={styles.times}>
          <Text style={styles.time}>{formatTime(kit.position)}</Text>
          <Text style={styles.time}>
            -{formatTime(Math.max(0, kit.duration - kit.position))}
          </Text>
        </View>
      </View>

      <View style={styles.spacer} />

      <View style={[styles.mixer, { backgroundColor: colors.surface }]}>
        <View style={styles.knobs}>
          <Knob
            caption="MEZCLA"
            disabled={moving}
            label={kit.shuffle ? 'Desactivar mezcla' : 'Activar mezcla'}
            onPress={kit.toggleShuffle}
            step={kit.shuffle ? 1 : 0}
            steps={2}
            value={kit.shuffle ? 'activada' : 'apagada'}
          />
          <Knob
            caption="REPETIR"
            disabled={!kit.ready}
            label={kit.repeatLabel}
            onPress={kit.cycleRepeat}
            step={repeatStep}
            steps={3}
            value={repeatValue}
          />
          <Knob
            caption="ECUALIZ."
            label="Abrir ecualizador"
            onPress={kit.openEqualizer}
            step={kit.equalizerOn ? 1 : 0}
            steps={2}
            value={kit.equalizerOn ? 'activado' : 'apagado'}
          />
        </View>
        <View style={styles.keys}>
          <Key
            caption="CUE"
            disabled={moving}
            icon="M6 5h2v14H6zM19 5v14L9 12z"
            label="Canción anterior"
            onPress={kit.previous}
            wide
          />
          <Key
            Icon={ListMusic}
            caption="Cola"
            label={`Abrir cola de reproducción con ${kit.queueCount} canciones`}
            onPress={kit.openQueue}
          />
          <Key
            Icon={FileText}
            caption="Letras"
            label={`Abrir letras de ${track.title}`}
            onPress={kit.openLyrics}
          />
          <Key
            Icon={MoreHorizontal}
            caption="Más"
            label="Más opciones: temporizador, velocidad, ecualizador y acciones"
            onPress={() => setMore(true)}
          />
          <Key
            caption="SIG"
            disabled={moving}
            icon="M16 5h2v14h-2zM5 5l10 7-10 7z"
            label="Siguiente canción"
            onPress={kit.next}
            wide
          />
        </View>
      </View>

      {more ? <MoreOptions kit={kit} onClose={() => setMore(false)} /> : null}
    </View>
  );
}

const useStyles = createStyles(colors => {
  const bold = colors.design.fonts.title;
  const medium = colors.design.fonts.body;
  const relief = {
    borderRadius: 18,
    boxShadow:
      'inset 0 1px 0 rgba(255,255,255,0.18), inset 0 -2px 0 rgba(0,0,0,0.25), 0 8px 18px rgba(0,0,0,0.24)',
  };
  return {
    player: {
      flex: 1,
      paddingHorizontal: 12,
      gap: 10,
      backgroundColor: colors.background,
    },
    top: { flexDirection: 'row', alignItems: 'center', minHeight: 52 },
    topButton: {
      width: 48,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    source: {
      flex: 1,
      textAlign: 'center',
      color: colors.textSecondary,
      fontFamily: medium,
      fontSize: 13,
    },
    plate: { ...relief, padding: 14, gap: 12 },
    brand: { position: 'absolute', left: 14, top: 10 },
    deckRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      marginTop: 14,
    },
    deckLabel: {
      color: colors.textSecondary,
      fontFamily: medium,
      fontSize: 10,
      letterSpacing: 1.4,
    },
    platter: {
      alignItems: 'center',
      justifyContent: 'center',
      boxShadow: 'inset 0 0 0 2px rgba(0,0,0,0.35)',
    },
    record: {
      alignItems: 'center',
      justifyContent: 'center',
      overflow: 'hidden',
    },
    label: {
      position: 'absolute',
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    spindle: { position: 'absolute', width: 8, height: 8, borderRadius: 4 },
    lamp: {
      position: 'absolute',
      left: 4,
      bottom: 4,
      width: 14,
      height: 14,
      borderRadius: 7,
    },
    arm: { position: 'absolute' },
    pitch: { alignItems: 'center', gap: 6, marginTop: 8 },
    pitchTrack: { width: 36 },
    pitchSlot: {
      position: 'absolute',
      left: 16,
      top: 0,
      bottom: 0,
      width: 4,
      borderRadius: 2,
      backgroundColor: 'rgba(0,0,0,0.45)',
    },
    pitchCap: {
      position: 'absolute',
      left: 2,
      width: 32,
      height: 22,
      borderRadius: 4,
      alignItems: 'center',
      justifyContent: 'center',
    },
    pitchMark: { width: 20, height: 2 },
    start: {
      height: 56,
      borderRadius: 10,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
    },
    startText: { fontFamily: bold, fontSize: 17, letterSpacing: 1.6 },
    led: { width: 10, height: 10, borderRadius: 5 },
    ledOff: { backgroundColor: 'rgba(0,0,0,0.3)' },
    titles: { gap: 2, paddingHorizontal: 8 },
    title: { color: colors.text, fontFamily: bold, fontSize: 26 },
    artist: { color: colors.textSecondary, fontFamily: medium, fontSize: 15 },
    seek: { height: 40, justifyContent: 'center', marginHorizontal: 8 },
    rail: {
      height: 6,
      borderRadius: 3,
      backgroundColor: 'rgba(0,0,0,0.35)',
    },
    railFill: { position: 'absolute', left: 0, height: 6, borderRadius: 3 },
    cap: {
      position: 'absolute',
      marginLeft: -14,
      width: 28,
      height: 32,
      borderRadius: 5,
      alignItems: 'center',
      justifyContent: 'center',
    },
    capMark: { width: 18, height: 3 },
    times: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginHorizontal: 8,
    },
    time: {
      color: colors.textSecondary,
      fontFamily: medium,
      fontSize: 13,
      fontVariant: ['tabular-nums'],
    },
    spacer: { flex: 1, minHeight: 0 },
    mixer: { ...relief, padding: 10, gap: 10 },
    knobs: { flexDirection: 'row', justifyContent: 'space-around' },
    knobBox: { width: 96, alignItems: 'center', gap: 4 },
    knobWell: {
      width: 54,
      height: 54,
      borderRadius: 27,
      alignItems: 'center',
      justifyContent: 'center',
    },
    knobCap: {
      width: 36,
      height: 36,
      borderRadius: 18,
      alignItems: 'center',
    },
    knobMark: { width: 4, height: 11, borderRadius: 2, marginTop: 3 },
    knobCaption: {
      color: colors.text,
      fontFamily: bold,
      fontSize: 11,
      letterSpacing: 0.6,
    },
    knobValue: {
      color: colors.textSecondary,
      fontFamily: medium,
      fontSize: 10,
      marginTop: -3,
    },
    keys: { flexDirection: 'row', gap: 8, height: 64 },
    key: {
      borderRadius: 10,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 3,
    },
    keyFlex: { flex: 1 },
    keyWide: { width: 78 },
    keyText: { color: colors.text, fontFamily: bold, fontSize: 11 },
    keyWideText: { fontSize: 12, letterSpacing: 1.2 },
    dim: { opacity: 0.45 },
    scrim: { backgroundColor: colors.scrim },
    panel: {
      position: 'absolute',
      left: 12,
      right: 12,
      ...relief,
      backgroundColor: colors.surface,
      padding: 12,
      gap: 8,
    },
    panelHead: { flexDirection: 'row', alignItems: 'center' },
    panelTitle: {
      flex: 1,
      paddingHorizontal: 6,
      color: colors.text,
      fontFamily: bold,
      fontSize: 18,
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
    panelLabel: { color: colors.text, fontFamily: medium, fontSize: 16 },
  };
});
