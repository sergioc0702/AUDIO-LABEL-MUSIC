/**
 * Poder: an energy sphere, with the cover inside, charges up while the song
 * plays. The aura rises, the rocks float, the ground cracks, and when the
 * song changes the sphere fires a beam into the sky.
 *
 * Every position comes from the approved 360×820 prototype and is scaled to
 * the phone: x by width / 360, y by the usable height / 820.
 *
 * What runs where:
 * - The sky, the mesas and the ground are drawn once.
 * - The sphere's size, the floating rocks, the aura, the beam and the shake
 *   move on the UI thread with transforms and opacity only.
 * - Worklets only read shared values and numbers; they never call JS
 *   functions.
 */
import { useMemo, useState, type ReactNode } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, { useAnimatedStyle } from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RepeatMode } from 'react-native-track-player';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { useColors } from '../../theme/theme';
import { formatTime } from '../../utils/formatTime';
import {
  DragHeader,
  SeekArea,
  usePlayerKit,
  type PlayerKit,
  type SkinProps,
} from '../../player/kit/playerKit';
import { Marquee } from '../../player/kit/Marquee';
import { useSceneClock, type SceneClock } from '../../player/kit/sceneClock';

const SHOUT = 'Bangers-Regular';
const BODY = 'BarlowCondensed-SemiBold';
const BOLD = 'BarlowCondensed-Bold';
const KANJI = { fontWeight: '900' as const };

/** The prototype's canvas. */
const PW = 360;
const PH = 820;
/** The sphere's diameter at the start and at the end of a song. */
const ORB_MIN = 170;
const ORB_MAX = 230;

/** Song change: 0 to 1 while the beam fires (change goes from 1 to 0). */
function changePhase(change: number) {
  'worklet';
  return change > 0 ? 1 - change : 1;
}

/** The power reading for a song this far along: it climbs faster at the end. */
function powerLevel(progress: number) {
  const share = Math.min(1, Math.max(0, progress));
  return Math.round(Math.pow(share, 1.6) * 9000 + 120);
}

/** 9120 → "9.120", without relying on the phone's locale support. */
function formatPower(value: number) {
  return String(value).replace(/\B(?=(\d{3})+(?!\d))/g, '.');
}

/** What the reading says about the charge. */
function powerStage(progress: number) {
  if (progress < 0.25) return 'CONCENTRANDO';
  if (progress < 0.5) return 'CARGANDO';
  if (progress < 0.8) return 'PODER EN AUMENTO';
  return '¡AL MÁXIMO!';
}

/** The wasteland under the sky: drawn once, stretched to the screen. */
function Land({ width, height }: { width: number; height: number }) {
  const { colors } = useColors();
  const s = colors.skin;
  return (
    <Svg
      height={height}
      preserveAspectRatio="none"
      style={StyleSheet.absoluteFill}
      viewBox={`0 0 ${PW} ${PH}`}
      width={width}
    >
      <Defs>
        <LinearGradient id="pd-sky" x1="0" x2="0" y1="0" y2="1">
          <Stop offset="0" stopColor={s.sky1} />
          <Stop offset="0.55" stopColor={s.sky2} />
          <Stop offset="1" stopColor={s.sky3} />
        </LinearGradient>
        <LinearGradient id="pd-ground" x1="0" x2="0" y1="0" y2="1">
          <Stop offset="0" stopColor={s.ground} />
          <Stop offset="1" stopColor={s.bg} />
        </LinearGradient>
      </Defs>
      <Rect fill={s.bg} height={PH} width={PW} />
      <Rect fill="url(#pd-sky)" height={600} width={PW} />
      <Path
        d="M0 520 L 0 470 L 30 470 L 40 440 L 90 440 L 100 476 L 150 476 L 160 500 L 220 500 L 232 458 L 296 458 L 306 486 L 360 486 L 360 520 Z"
        fill={s.mesa}
      />
      {/* The ground reaches the bottom of the screen, under the scroll. */}
      <Path
        d={`M0 ${PH} L 0 520 Q 180 500 360 520 L 360 ${PH} Z`}
        fill="url(#pd-ground)"
      />
      <Path
        d="M20 640 l 40 -6 M90 676 l 60 -4 M210 650 l 50 6 M270 700 l 60 -8 M40 730 l 30 4"
        stroke={s.mesa}
        strokeLinecap="round"
        strokeWidth={3}
      />
      <Path
        d="M60 660 q 8 -8 16 0 Z M180 690 q 10 -10 20 0 Z M300 660 q 6 -6 12 0 Z"
        fill={s.rock}
      />
    </Svg>
  );
}

/** Clouds drifting slowly across the sky. */
function Clouds({
  clock,
  top,
  k,
}: {
  clock: SceneClock;
  top: number;
  k: number;
}) {
  const { colors } = useColors();
  const span = PW * k;
  const drift = useAnimatedStyle(() => ({
    transform: [{ translateX: -((clock.wall.value * 9 * k) % span) }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[styles.clouds, { top }, drift]}>
      <Svg height={60 * k} viewBox="0 0 720 60" width={span * 2}>
        <Path
          d="M20 40 q 20 -26 50 -10 q 18 -20 44 -4 q 30 -6 32 14 Z M220 46 q 26 -24 56 -8 q 22 -16 40 2 Z M380 40 q 20 -26 50 -10 q 18 -20 44 -4 q 30 -6 32 14 Z M580 46 q 26 -24 56 -8 q 22 -16 40 2 Z"
          fill={colors.skin.cloud}
        />
      </Svg>
    </Animated.View>
  );
}

/** A rock that floats higher as the power rises. */
function FloatingRock({
  clock,
  index,
  x,
  w,
  h,
  floor,
  lift,
}: {
  clock: SceneClock;
  index: number;
  x: number;
  w: number;
  h: number;
  floor: number;
  lift: number;
}) {
  const { colors } = useColors();
  const s = colors.skin;
  const style = useAnimatedStyle(() => {
    const p = clock.progress.value;
    const bob = Math.sin(clock.wall.value * 1.4 + index) * 6;
    return {
      transform: [
        { translateY: floor - p * (lift + index * 40 * (lift / 180)) - bob },
        { rotate: `${Math.sin(clock.wall.value + index) * 20}deg` },
      ],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.rock,
        {
          left: x,
          width: w,
          height: h,
          backgroundColor: s.rock,
          boxShadow: `0 0 10px ${s.aura}`,
        },
        style,
      ]}
    />
  );
}

/** One tongue of the aura at the edge of the screen. */
function Flame({
  clock,
  index,
  strength,
}: {
  clock: SceneClock;
  index: number;
  strength: number;
}) {
  const { colors } = useColors();
  const style = useAnimatedStyle(() => {
    const f = (Math.sin(clock.wall.value * 12 + index * 1.7) + 1) / 2;
    return {
      opacity: (0.7 + f * 0.3) * strength * clock.play.value,
      transform: [{ scaleY: 0.85 + f * 0.25 }],
    };
  });
  return (
    <Animated.View style={[styles.flame, style]}>
      <Svg
        height="100%"
        preserveAspectRatio="none"
        viewBox="0 0 40 100"
        width={40}
      >
        <Defs>
          <LinearGradient id={`pd-flame-${index}`} x1="0" x2="0" y1="1" y2="0">
            <Stop offset="0" stopColor={colors.skin.aura} stopOpacity={1} />
            <Stop offset="1" stopColor={colors.skin.aura} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path
          d="M0 100 Q 0 40 20 0 Q 40 40 40 100 Z"
          fill={`url(#pd-flame-${index})`}
        />
      </Svg>
    </Animated.View>
  );
}

/** The aura rises from the bottom edges as the power grows. */
function Aura({
  clock,
  bottom,
  sy,
}: {
  clock: SceneClock;
  bottom: number;
  sy: number;
}) {
  const height = useAnimatedStyle(() => ({
    height: (80 + clock.progress.value * 260) * sy,
  }));
  const strengths = [1, 0.8, 0.35, 0.35, 0.35, 0.35, 0.35, 0.8, 1];
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.aura, { bottom }, height]}
    >
      {strengths.map((strength, i) => (
        <Flame key={i} clock={clock} index={i} strength={strength} />
      ))}
    </Animated.View>
  );
}

/** The sphere: the cover inside a ball of energy that grows with the song. */
function Sphere({
  clock,
  kit,
  center,
  k,
}: {
  clock: SceneClock;
  kit: PlayerKit;
  center: { x: number; y: number };
  k: number;
}) {
  const { colors } = useColors();
  const s = colors.skin;
  const d = ORB_MAX * k;
  const glow = d + 80 * k;
  const ring = d + 40 * k;
  const grow = useAnimatedStyle(() => ({
    transform: [
      {
        scale: (ORB_MIN + (ORB_MAX - ORB_MIN) * clock.progress.value) / ORB_MAX,
      },
    ],
  }));
  const spin = useAnimatedStyle(() => ({
    transform: [{ rotate: `${(clock.wall.value * 120) % 360}deg` }],
  }));
  const sparks = useAnimatedStyle(() => ({
    opacity:
      clock.play.value *
      (0.4 + 0.6 * ((Math.floor(clock.wall.value * 12) % 3) / 2)),
    transform: [{ rotate: `${-(clock.wall.value * 72) % 360}deg` }],
  }));
  const shine = useAnimatedStyle(() => ({
    opacity: 0.5 + clock.progress.value * 0.5,
  }));
  // Small bolts of lightning around the sphere, drawn once and spun.
  const bolts = useMemo(() => {
    let path = '';
    for (let i = 0; i < 6; i += 1) {
      const a = i * 1.05;
      const p = (r: number, da: number) =>
        `${(50 + Math.cos(a + da) * r).toFixed(1)} ${(
          50 +
          Math.sin(a + da) * r
        ).toFixed(1)}`;
      path += `M${p(40, 0)} L ${p(45, 0.12)} L ${p(50, -0.05)} `;
    }
    return path;
  }, []);
  const uri = kit.track?.artwork;
  return (
    <Animated.View
      pointerEvents="box-none"
      style={[
        styles.sphere,
        { left: center.x - d / 2, top: center.y - d / 2, width: d, height: d },
        grow,
      ]}
    >
      <Animated.View
        pointerEvents="none"
        style={[
          styles.layer,
          { left: (d - glow) / 2, top: (d - glow) / 2 },
          shine,
        ]}
      >
        <Svg height={glow} width={glow}>
          <Defs>
            <RadialGradient cx="50%" cy="50%" id="pd-glow" r="50%">
              <Stop offset="0" stopColor={s.aura} stopOpacity={1} />
              <Stop offset="0.65" stopColor={s.aura} stopOpacity={0} />
            </RadialGradient>
          </Defs>
          <Rect fill="url(#pd-glow)" height={glow} width={glow} />
        </Svg>
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.layer,
          { left: (d - ring) / 2, top: (d - ring) / 2 },
          spin,
        ]}
      >
        <Svg height={ring} viewBox="0 0 100 100" width={ring}>
          <Circle
            cx={50}
            cy={50}
            fill="none"
            opacity={0.9}
            r={47}
            stroke={s.spark}
            strokeDasharray="10 6 2 6"
            strokeWidth={1.6}
          />
        </Svg>
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.layer,
          { left: (d - ring) / 2, top: (d - ring) / 2 },
          sparks,
        ]}
      >
        <Svg height={ring} viewBox="0 0 100 100" width={ring}>
          <Path
            d={bolts}
            fill="none"
            stroke="#ffffff"
            strokeLinejoin="round"
            strokeWidth={1.6}
          />
        </Svg>
      </Animated.View>
      <View
        accessibilityLabel={`Portada de ${kit.track?.title ?? ''}`}
        accessibilityRole="image"
        accessible
        style={[
          styles.cover,
          {
            width: d,
            height: d,
            borderRadius: d / 2,
            borderColor: s.spark,
            boxShadow: `0 0 30px ${s.aura}`,
            backgroundColor: s.sky2,
          },
        ]}
      >
        {uri ? (
          <Image
            fadeDuration={0}
            resizeMethod="resize"
            source={{ uri }}
            style={{ width: d, height: d }}
          />
        ) : (
          <Svg height={d} viewBox="0 0 100 100" width={d}>
            <Rect fill={s.sky2} height={100} width={100} />
            <Circle cx={60} cy={40} fill={s.spark} r={16} />
            <Path
              d="M0 72 L 22 56 L 38 66 L 54 48 L 70 62 L 86 50 L 100 60 L 100 100 L 0 100 Z"
              fill={s.mesa}
            />
          </Svg>
        )}
        <View style={styles.gloss} />
        {!kit.isPlaying ? (
          <View style={styles.paused}>
            <Svg height={44} viewBox="0 0 30 30" width={44}>
              <Path d="M9 5 L 25 15 L 9 25 Z" fill="#ffffff" />
            </Svg>
          </View>
        ) : null}
      </View>
      <Pressable
        accessibilityLabel={kit.isPlaying ? 'Pausar' : 'Reproducir'}
        accessibilityRole="button"
        disabled={!kit.ready}
        onPress={kit.toggle}
        style={[StyleSheet.absoluteFill, { borderRadius: d / 2 }]}
      />
    </Animated.View>
  );
}

/** A boulder lifted by the energy, with arrows carved into it. */
function Stone({
  clock,
  label,
  caption,
  forward,
  side,
  top,
  disabled,
  onPress,
}: {
  clock: SceneClock;
  label: string;
  caption: string;
  forward: boolean;
  side: 'left' | 'right';
  top: number;
  disabled: boolean;
  onPress: () => void;
}) {
  const { colors } = useColors();
  const s = colors.skin;
  const phase = forward ? 2 : 0;
  const bob = useAnimatedStyle(() => ({
    transform: [{ translateY: Math.sin(clock.wall.value * 1.6 + phase) * 6 }],
  }));
  const cracks = useAnimatedStyle(() => ({
    opacity:
      0.2 + 0.8 * clock.play.value * Math.abs(Math.sin(clock.wall.value * 3)),
  }));
  const rock = forward
    ? 'M8 22 L 40 6 L 80 8 L 106 30 L 110 60 L 88 86 L 46 90 L 14 74 L 4 46 Z'
    : 'M14 30 L 34 8 L 72 4 L 102 18 L 112 52 L 96 82 L 54 92 L 18 80 L 4 54 Z';
  const lit = forward
    ? 'M8 22 L 40 6 L 80 8 L 106 30 L 70 26 L 30 32 Z'
    : 'M14 30 L 34 8 L 72 4 L 102 18 L 88 30 L 50 24 Z';
  const arrows = forward
    ? 'M40 30 L 60 48 L 40 66 M 54 30 L 74 48 L 54 66'
    : 'M66 32 L 46 50 L 66 68 M 80 32 L 60 50 L 80 68';
  return (
    <Animated.View style={[styles.stone, { [side]: 10, top }, bob]}>
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        disabled={disabled}
        onPress={onPress}
        style={({ pressed }) => [
          styles.stonePress,
          {
            opacity: disabled ? 0.5 : 1,
            transform: [{ scale: pressed ? 0.94 : 1 }],
          },
        ]}
      >
        <View style={[styles.stoneGlow, { boxShadow: `0 0 18px ${s.aura}` }]} />
        <Svg height={96} viewBox="0 0 116 96" width={116}>
          <Path
            d={rock}
            fill={s.rock}
            stroke={s.outline}
            strokeLinejoin="round"
            strokeWidth={3}
          />
          <Path d={lit} fill={s.rockLit} opacity={0.7} />
          <Path
            d={arrows}
            fill="none"
            stroke={s.spark}
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={6}
          />
        </Svg>
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, cracks]}
        >
          <Svg height={96} viewBox="0 0 116 96" width={116}>
            <Path
              d={
                forward
                  ? 'M26 30 L 36 48 L 24 70 M 92 34 L 82 56 L 94 74'
                  : 'M30 20 L 40 42 L 30 60 M 86 28 L 78 50 L 90 72'
              }
              fill="none"
              stroke={s.spark}
              strokeLinejoin="round"
              strokeWidth={2.4}
            />
          </Svg>
        </Animated.View>
        <Text
          style={[
            styles.stoneText,
            { color: s.ink, textShadowColor: s.outline },
          ]}
        >
          {caption}
        </Text>
      </Pressable>
    </Animated.View>
  );
}

/** Timer, speed, equalizer and the song menu, on a scroll. */
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
            backgroundColor: s.scroll,
            borderColor: s.outline,
          },
        ]}
      >
        <View style={styles.sheetHead}>
          <Text style={[styles.sheetTitle, { color: s.scrollInk }]}>
            MÁS TÉCNICAS
          </Text>
          <Text style={[styles.sheetKanji, KANJI, { color: s.scrollInk }]}>
            技
          </Text>
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
            style={[styles.sheetRow, { borderTopColor: s.outline }]}
          >
            <Text style={[styles.sheetLabel, { color: s.scrollInk }]}>
              {row.label}
            </Text>
            <Text style={[styles.sheetValue, { color: s.scrollInk }]}>
              {row.value}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

function Technique({
  label,
  caption,
  on,
  onPress,
  children,
}: {
  label: string;
  caption: string;
  on?: boolean;
  onPress: () => void;
  children: ReactNode;
}) {
  const { colors } = useColors();
  const s = colors.skin;
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={on === undefined ? undefined : { selected: on }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.technique,
        {
          backgroundColor: on ? s.gi : '#fffaf0',
          borderColor: s.outline,
          transform: [{ scale: pressed ? 0.95 : 1 }],
        },
      ]}
    >
      {children}
      <Text
        style={[styles.techniqueText, { color: on ? s.onGi : s.scrollInk }]}
      >
        {caption}
      </Text>
    </Pressable>
  );
}

export function PoderPlayer({ covered, headerGesture, onClose }: SkinProps) {
  const kit = usePlayerKit({ covered });
  const clock = useSceneClock(kit, {
    boost: 0,
    changeSeconds: 1.2,
    baseWidth: PW,
  });
  const { width, height } = useWindowDimensions();
  const { colors } = useColors();
  const insets = useSafeAreaInsets();
  const [more, setMore] = useState(false);

  const H = height - insets.top - insets.bottom;
  const sx = width / PW;
  const sy = H / PH;
  const x = (v: number) => v * sx;
  const y = (v: number) => v * sy;

  // The beam fires up from the sphere, and the screen shakes, on a song change.
  const beam = useAnimatedStyle(() => {
    const p = changePhase(clock.change.value);
    if (p >= 1) return { opacity: 0 };
    const rise = Math.min(1, p / 0.12);
    return {
      opacity: p < 0.7 ? 1 : (1 - p) / 0.3,
      transform: [
        { scaleY: rise },
        { scaleX: p < 0.7 ? 1 : 0.2 + 0.8 * ((1 - p) / 0.3) },
      ],
    };
  });
  const shake = useAnimatedStyle(() => {
    const p = changePhase(clock.change.value);
    if (clock.reduced || p >= 1 || p < 0.12) return { transform: [] };
    const e = Math.max(0, 1 - (p - 0.12) / 0.5);
    return {
      transform: [
        { translateX: Math.sin(p * 90) * 6 * e },
        { translateY: Math.cos(p * 80) * 4 * e },
      ],
    };
  });

  if (!kit.track) return null;
  const s = colors.skin;
  const center = { x: x(180), y: y(340) };
  const repeatOne = kit.repeatMode === RepeatMode.Track;
  const power = formatPower(powerLevel(kit.progress));
  const crack = kit.progress > 0.5 ? (kit.progress - 0.5) * 2 : 0;
  const outlined = {
    textShadowColor: s.outline,
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0.01,
  };
  const icon = (d: string, color: string) => (
    <Svg fill="none" height={18} viewBox="0 0 24 24" width={18}>
      <Path
        d={d}
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.4}
      />
    </Svg>
  );
  const ink = (on: boolean) => (on ? s.onGi : s.scrollInk);
  const rocks = [
    { x: 40, w: 30, h: 16 },
    { x: 92, w: 24, h: 12 },
    { x: 250, w: 34, h: 18 },
    { x: 300, w: 22, h: 12 },
    { x: 176, w: 20, h: 10 },
  ];

  return (
    <View
      style={[styles.player, { backgroundColor: s.bg, paddingTop: insets.top }]}
    >
      <Animated.View
        onLayout={clock.onLayout}
        style={[styles.stage, { top: insets.top, height: H }, shake]}
      >
        <Land height={H} width={width} />
        <Clouds clock={clock} k={sx} top={y(150)} />
        <Svg
          height={H}
          pointerEvents="none"
          preserveAspectRatio="none"
          style={[StyleSheet.absoluteFill, { opacity: crack }]}
          viewBox={`0 0 ${PW} ${PH}`}
          width={width}
        >
          <Path
            d="M120 600 L 140 560 L 132 540 M 140 560 L 170 552 M 250 600 L 236 566 L 252 546"
            fill="none"
            stroke={s.crack}
            strokeWidth={2.4}
          />
        </Svg>
        {rocks.map((rock, i) => (
          <FloatingRock
            key={i}
            clock={clock}
            floor={y(560)}
            h={rock.h * 1.4 * sx}
            index={i}
            lift={y(180)}
            w={rock.w * sx}
            x={x(rock.x)}
          />
        ))}
        <Aura bottom={H - y(610)} clock={clock} sy={sy} />
        {/* Narrower than the smallest sphere, so it never peeks out behind it. */}
        <Animated.View
          pointerEvents="none"
          style={[
            styles.beam,
            { left: center.x - x(55), width: x(110), height: center.y },
            beam,
          ]}
        >
          <Svg
            height="100%"
            preserveAspectRatio="none"
            viewBox="0 0 100 100"
            width="100%"
          >
            <Defs>
              <LinearGradient id="pd-beam" x1="0" x2="1" y1="0" y2="0">
                <Stop offset="0" stopColor={s.aura} stopOpacity={0} />
                <Stop offset="0.25" stopColor={s.aura} stopOpacity={0.9} />
                <Stop offset="0.5" stopColor="#ffffff" stopOpacity={1} />
                <Stop offset="0.75" stopColor={s.aura} stopOpacity={0.9} />
                <Stop offset="1" stopColor={s.aura} stopOpacity={0} />
              </LinearGradient>
            </Defs>
            <Rect fill="url(#pd-beam)" height={100} width={100} />
          </Svg>
        </Animated.View>
        <Sphere center={center} clock={clock} k={sx} kit={kit} />
        <Stone
          caption="ANTERIOR"
          clock={clock}
          disabled={!kit.ready || kit.busy}
          forward={false}
          label="Canción anterior"
          onPress={kit.previous}
          side="left"
          top={y(452)}
        />
        <Stone
          caption="DISPARAR"
          clock={clock}
          disabled={!kit.ready || kit.busy}
          forward
          label="Siguiente canción"
          onPress={kit.next}
          side="right"
          top={y(440)}
        />

        {/* The ki bar: the song's progress, and the seek bar. */}
        <SeekArea kit={kit} style={[styles.ki, { top: y(58) }]}>
          <View
            pointerEvents="none"
            style={[
              styles.kiTrack,
              { backgroundColor: s.barBack, borderColor: s.outline },
            ]}
          >
            <View
              style={[
                styles.kiFill,
                {
                  width: `${kit.progress * 100}%`,
                  backgroundColor: s.aura,
                  boxShadow: `0 0 14px ${s.aura}`,
                },
              ]}
            />
            <View style={[styles.kiShine, { backgroundColor: s.spark }]} />
          </View>
        </SeekArea>
        <View style={[styles.kiRow, { top: y(92) }]}>
          <Text style={[styles.kiText, outlined, { color: s.ink }]}>
            {formatTime(kit.position)}
          </Text>
          <Text style={[styles.kiText, outlined, { color: s.spark }]}>
            {powerStage(kit.progress)}
          </Text>
          <Text style={[styles.kiText, outlined, { color: s.ink }]}>
            {formatTime(kit.duration)}
          </Text>
        </View>

        <View style={[styles.titleBox, { top: y(118) }]}>
          <Marquee
            center
            clock={clock}
            height={40}
            style={[styles.title, { color: s.ink, textShadowColor: s.outline }]}
            text={kit.track.title}
          />
        </View>
        <Text
          numberOfLines={1}
          style={[styles.artist, outlined, { top: y(162), color: s.ink }]}
        >
          {kit.track.artist}
        </Text>

        {/* The scroll of techniques: the other tools. */}
        <View
          style={[
            styles.scroll,
            { top: y(712), backgroundColor: s.scroll, borderColor: s.outline },
          ]}
        >
          <View style={styles.scrollHead}>
            <Text style={[styles.scrollTitle, { color: s.scrollInk }]}>
              TÉCNICAS
            </Text>
            <Text style={[styles.scrollKanji, KANJI, { color: s.scrollInk }]}>
              技
            </Text>
          </View>
          <View style={styles.techniques}>
            <Technique
              caption="COLA"
              label={`Abrir cola de reproducción con ${kit.queueCount} canciones`}
              onPress={kit.openQueue}
            >
              {icon('M4 6h12M4 12h12M4 18h8M18 18V9l3-1', s.scrollInk)}
            </Technique>
            <Technique
              caption="LETRAS"
              label={`Abrir letras de ${kit.track.title}`}
              onPress={kit.openLyrics}
            >
              {icon('M5 4h10l4 4v12H5zM9 11h6M9 15h4', s.scrollInk)}
            </Technique>
            <Technique
              caption="MEZCLA"
              label={kit.shuffle ? 'Desactivar mezcla' : 'Activar mezcla'}
              on={kit.shuffle}
              onPress={kit.toggleShuffle}
            >
              {icon(
                'M3 6h4l10 12h4M3 18h4l3-3.6M14 9.6L17 6h4M18 3l3 3-3 3M18 15l3 3-3 3',
                ink(kit.shuffle),
              )}
            </Technique>
            <Technique
              caption={repeatOne ? 'UNA' : 'REPETIR'}
              label={kit.repeatLabel}
              on={kit.repeatOn}
              onPress={kit.cycleRepeat}
            >
              {icon(
                'M4 11V9a3 3 0 0 1 3-3h11M15 3l3 3-3 3M20 13v2a3 3 0 0 1-3 3H6M9 21l-3-3 3-3',
                ink(kit.repeatOn),
              )}
            </Technique>
          </View>
        </View>
      </Animated.View>

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
              strokeWidth={2.8}
            />
          </Svg>
        </Pressable>
        <View style={styles.headerInfo}>
          <Text style={[styles.kanji, KANJI, outlined, { color: s.spark }]}>
            気
          </Text>
          <Text
            numberOfLines={1}
            style={[styles.power, outlined, { color: s.ink }]}
          >
            PODER {power}
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
              fill={kit.favorite ? s.aura : 'none'}
              stroke={kit.favorite ? s.aura : s.ink}
              strokeLinejoin="round"
              strokeWidth={2.4}
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
            <Circle cx={5} cy={12} fill={s.ink} r={2.4} />
            <Circle cx={12} cy={12} fill={s.ink} r={2.4} />
            <Circle cx={19} cy={12} fill={s.ink} r={2.4} />
          </Svg>
        </Pressable>
      </DragHeader>

      {more ? <MoreSheet kit={kit} onClose={() => setMore(false)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  player: { flex: 1, overflow: 'hidden' },
  stage: { position: 'absolute', left: 0, right: 0 },
  clouds: { position: 'absolute', left: 0, opacity: 0.55 },
  rock: {
    position: 'absolute',
    top: 0,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 16,
    borderBottomLeftRadius: 14,
    borderBottomRightRadius: 18,
  },
  aura: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  flame: { width: 40, height: '100%', transformOrigin: 'bottom' },
  beam: { position: 'absolute', top: 0, opacity: 0, transformOrigin: 'bottom' },
  sphere: { position: 'absolute' },
  layer: { position: 'absolute' },
  cover: { overflow: 'hidden', borderWidth: 4 },
  gloss: {
    ...StyleSheet.absoluteFill,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.12)',
  },
  paused: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(0,0,0,0.45)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stone: { position: 'absolute', width: 116, height: 118 },
  stonePress: { width: 116, height: 118, alignItems: 'center' },
  stoneGlow: {
    position: 'absolute',
    left: 14,
    top: 14,
    width: 88,
    height: 68,
    borderRadius: 34,
  },
  stoneText: {
    fontFamily: SHOUT,
    fontSize: 16,
    lineHeight: 22,
    letterSpacing: 1,
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 0.01,
  },
  ki: { position: 'absolute', left: 14, right: 14, height: 34 },
  kiTrack: {
    marginTop: 8,
    height: 18,
    borderRadius: 3,
    borderWidth: 3,
    overflow: 'hidden',
    transform: [{ skewX: '-18deg' }],
  },
  kiFill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  kiShine: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 4,
    opacity: 0.6,
  },
  kiRow: {
    position: 'absolute',
    left: 16,
    right: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  kiText: { fontFamily: SHOUT, fontSize: 16, lineHeight: 22, letterSpacing: 1 },
  titleBox: {
    position: 'absolute',
    left: 18,
    right: 18,
    transform: [{ rotate: '-2deg' }],
  },
  title: {
    fontFamily: SHOUT,
    fontSize: 32,
    lineHeight: 40,
    letterSpacing: 1,
    textShadowOffset: { width: 3, height: 3 },
    textShadowRadius: 0.01,
  },
  artist: {
    position: 'absolute',
    left: 18,
    right: 18,
    textAlign: 'center',
    fontFamily: BOLD,
    fontSize: 17,
    lineHeight: 22,
  },
  scroll: {
    position: 'absolute',
    left: 12,
    right: 12,
    height: 92,
    borderRadius: 10,
    borderWidth: 3,
    paddingHorizontal: 10,
    paddingVertical: 6,
  },
  scrollHead: { flexDirection: 'row', justifyContent: 'space-between' },
  scrollTitle: {
    fontFamily: SHOUT,
    fontSize: 15,
    lineHeight: 19,
    letterSpacing: 1,
  },
  scrollKanji: { fontSize: 12, lineHeight: 18 },
  techniques: { flexDirection: 'row', gap: 6, marginTop: 4 },
  technique: {
    flex: 1,
    minWidth: 0,
    height: 46,
    borderRadius: 8,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 2,
  },
  techniqueText: {
    fontFamily: SHOUT,
    fontSize: 13,
    lineHeight: 16,
    letterSpacing: 1,
  },
  header: {
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
  headerInfo: {
    flex: 1,
    minWidth: 0,
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
  },
  kanji: { fontSize: 22, lineHeight: 28 },
  power: { fontFamily: SHOUT, fontSize: 20, lineHeight: 26, letterSpacing: 1 },
  sheet: {
    position: 'absolute',
    left: 12,
    right: 12,
    borderRadius: 10,
    borderWidth: 3,
    padding: 16,
    gap: 4,
  },
  sheetHead: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: 6,
  },
  sheetTitle: {
    fontFamily: SHOUT,
    fontSize: 20,
    lineHeight: 26,
    letterSpacing: 1,
  },
  sheetKanji: { fontSize: 18, lineHeight: 26 },
  sheetRow: {
    minHeight: 52,
    borderTopWidth: 2,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sheetLabel: { fontFamily: BODY, fontSize: 18, lineHeight: 22, flexShrink: 1 },
  sheetValue: { fontFamily: BOLD, fontSize: 16, lineHeight: 20 },
});
