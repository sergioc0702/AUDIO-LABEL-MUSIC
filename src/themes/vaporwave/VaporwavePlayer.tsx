import { useState, type ReactNode } from 'react';
import {
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
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
  Circle,
  ClipPath,
  Defs,
  G,
  LinearGradient,
  Path,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { RepeatMode } from 'react-native-track-player';
import { createStyles, useColors } from '../../theme/theme';
import { formatTime } from '../../utils/formatTime';
import {
  DragHeader,
  SeekArea,
  usePlayerKit,
  type PlayerKit,
  type SkinProps,
} from '../../player/kit/playerKit';
import {
  AnimatedPath,
  noise,
  useSceneClock,
  type SceneClock,
} from '../../player/kit/sceneClock';

const VHS = 'VT323-Regular';
/** The scene was drawn in a 336 × 340 box; everything scales from it. */
const BASE_W = 336;
const BASE_H = 340;
/** The horizon sits at this share of the scene height. */
const HORIZON = 236 / 340;
const HEADER = 48;
const TITLE = 30;
const ARTIST = 26;
const SEEK = 30;
const TIMES = 22;
const TOOLS = 64;

const two = (value: number) => String(value).padStart(2, '0');
const tape = (seconds: number) =>
  `0:${two(Math.floor(seconds / 60))}:${two(Math.floor(seconds % 60))}`;

/** A fixed star field, as shares of the scene: x, y, size, group. */
const STARS = Array.from({ length: 22 }, (_, n) => ({
  x: ((n * 73) % 330) / BASE_W + 0.01,
  y: (((n * 41) % 120) + 4) / BASE_H,
  s: n % 4 === 0 ? 3 : 2,
  group: n % 3,
}));

/* ───────── scene pieces ───────── */

/** Stars in three groups, each twinkling on its own beat. */
function Stars({
  clock,
  w,
  h,
  group,
}: {
  clock: SceneClock;
  w: number;
  h: number;
  group: number;
}) {
  const style = useAnimatedStyle(() => ({
    opacity:
      0.35 + 0.65 * Math.abs(Math.sin(clock.run.value * 0.9 + group * 2.1)),
  }));
  return (
    <Animated.View pointerEvents="none" style={[base.fill, style]}>
      {STARS.filter(star => star.group === group).map((star, n) => (
        <View
          key={n}
          style={[
            base.star,
            {
              left: star.x * w,
              top: star.y * h,
              width: star.s,
              height: star.s,
              borderRadius: star.s,
            },
          ]}
        />
      ))}
    </Animated.View>
  );
}

/** Now and then a star shoots across the sky. */
function ShootingStar({ clock, w }: { clock: SceneClock; w: number }) {
  const style = useAnimatedStyle(() => {
    const t = (clock.run.value % 7) / 7;
    const k = t < 0.86 ? 0 : (t - 0.86) / 0.14;
    return {
      opacity: k === 0 ? 0 : k < 0.15 ? k / 0.15 : 1 - k,
      transform: [
        { translateX: -160 * k },
        { translateY: 70 * k },
        { rotate: '-23deg' },
      ],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[base.shoot, { left: w * 0.68 }, style]}
    >
      <Svg height={2} width={70}>
        <Defs>
          <LinearGradient id="vp-shoot" x1="0" x2="1" y1="0" y2="0">
            <Stop offset="0" stopColor="#ffffff" stopOpacity={0} />
            <Stop offset="1" stopColor="#ffffff" />
          </LinearGradient>
        </Defs>
        <Rect fill="url(#vp-shoot)" height={2} rx={1} width={70} />
      </Svg>
    </Animated.View>
  );
}

const SUN_STRIPES = Array.from({ length: 10 }, (_, n) => n * 18);

/** The striped sun and its halo, sinking as the song goes on. */
function Sun({
  clock,
  w,
  k,
  horizon,
}: {
  clock: SceneClock;
  w: number;
  k: number;
  horizon: number;
}) {
  const { colors } = useColors();
  const s = colors.skin;
  const sun = Math.round(180 * k);
  const halo = Math.round(300 * k);
  // At the start the sun's top is 250 above the horizon; it sinks 150.
  const start = horizon - 250 * k - (halo - sun) / 2;
  const travel = 150 * k;
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: start + clock.progress.value * travel }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        base.sunBox,
        { left: w / 2 - halo / 2, width: halo, height: halo },
        style,
      ]}
    >
      <Svg height={halo} style={base.fill} width={halo}>
        <Defs>
          <RadialGradient cx="50%" cy="50%" id="vp-halo" r="50%">
            <Stop offset="0" stopColor={s.sun1} stopOpacity={0.45} />
            <Stop offset="0.62" stopColor={s.sun1} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={halo / 2} cy={halo / 2} fill="url(#vp-halo)" r={halo / 2} />
      </Svg>
      <Svg
        height={sun}
        style={[base.sun, { left: (halo - sun) / 2, top: (halo - sun) / 2 }]}
        viewBox="0 0 180 180"
        width={sun}
      >
        <Defs>
          <LinearGradient id="vp-sun" x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0" stopColor={s.sun1} />
            <Stop offset="1" stopColor={s.sun2} />
          </LinearGradient>
          <ClipPath id="vp-sun-cut">
            {SUN_STRIPES.map(y => (
              <Rect key={y} height={14} width={180} x={0} y={y} />
            ))}
          </ClipPath>
        </Defs>
        <Circle
          clipPath="url(#vp-sun-cut)"
          cx={90}
          cy={90}
          fill="url(#vp-sun)"
          r={90}
        />
      </Svg>
    </Animated.View>
  );
}

const CLOUD_BARS = [
  [20, 6, 120, 5],
  [60, 16, 160, 6],
  [250, 10, 90, 4],
  [200, 30, 140, 5],
];

/** Thin cloud bands drifting slowly to the left, drawn twice to loop. */
function Clouds({
  clock,
  w,
  k,
  top,
}: {
  clock: SceneClock;
  w: number;
  k: number;
  top: number;
}) {
  const { colors } = useColors();
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: -((clock.run.value * (w / 30)) % w) }],
  }));
  const h = Math.round(50 * k);
  const sx = w / BASE_W;
  return (
    <Animated.View
      pointerEvents="none"
      style={[base.clouds, { top, width: w * 2, height: h }, style]}
    >
      <Svg height={h} width={w * 2}>
        <G fill={colors.skin.sun1} opacity={0.75}>
          {[0, w].map(offset =>
            CLOUD_BARS.map(([x, y, bw, bh]) => (
              <Rect
                key={`${offset}-${x}`}
                height={bh * k}
                rx={(bh * k) / 2}
                width={bw * sx}
                x={offset + x * sx}
                y={y * k}
              />
            )),
          )}
        </G>
      </Svg>
    </Animated.View>
  );
}

/** The floor: lines rush toward you, rays run to the vanishing point. */
function Floor({
  clock,
  w,
  h,
  color,
}: {
  clock: SceneClock;
  w: number;
  h: number;
  color: string;
}) {
  const props = useAnimatedProps(() => {
    const phase = (clock.run.value * 0.9) % 1;
    let d = '';
    for (let n = 0; n < 9; n += 1) {
      const k = (n + phase) / 9;
      const y = k * k * h;
      d += 'M0 ' + y.toFixed(1) + ' H ' + w + ' ';
    }
    return { d };
  });
  let rays = '';
  for (let n = -14; n <= 14; n += 1) {
    rays += `M${w / 2 + n * 16} 0 L ${w / 2 + n * 80} ${h} `;
  }
  return (
    <Svg height={h} pointerEvents="none" width={w}>
      <Path d={rays} opacity={0.85} stroke={color} strokeWidth={1.6} />
      <AnimatedPath
        animatedProps={props}
        fill="none"
        opacity={0.85}
        stroke={color}
        strokeWidth={2}
      />
    </Svg>
  );
}

const PALM_TRUNK = 'M44 190 C46 140 50 100 46 60';
const PALM_LEAVES =
  'M46 60 C20 40 6 48 0 62 C18 50 32 54 46 60 C30 30 16 28 8 30 C26 30 38 42 46 60 C50 26 70 18 84 22 C66 30 54 42 46 60 C72 44 84 54 90 66 C76 56 62 54 46 60Z';

/** A palm swaying from its foot; the right one is a smaller mirrored copy. */
function Palm({
  clock,
  k,
  mirror,
  style,
}: {
  clock: SceneClock;
  k: number;
  mirror?: boolean;
  style: StyleProp<ViewStyle>;
}) {
  const { colors } = useColors();
  const color = colors.skin.palm;
  const sway = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${Math.sin(clock.run.value * (mirror ? 1.16 : 1.37)) * 3}deg`,
      },
    ],
  }));
  const scale = mirror ? 0.9 : 1;
  const width = Math.round(90 * k * scale);
  const height = Math.round(190 * k * scale);
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        base.palm,
        { width, height },
        style,
        sway,
      ]}
    >
      <Svg height={height} viewBox="0 0 90 190" width={width}>
        <G transform={mirror ? 'translate(90 0) scale(-1 1)' : undefined}>
          <Path d={PALM_TRUNK} fill="none" stroke={color} strokeWidth={8} />
          <Path d={PALM_LEAVES} fill={color} />
        </G>
      </Svg>
    </Animated.View>
  );
}

/** A placeholder in the palette's colors when the song has no cover. */
function NoCover({ size }: { size: number }) {
  const { colors } = useColors();
  const s = colors.skin;
  return (
    <Svg height={size} viewBox="0 0 196 196" width={size}>
      <Rect fill={s.sky1} height={196} width={196} />
      <Circle cx={60} cy={120} fill={s.sun2} r={80} />
      <Rect fill={s.grid} height={230} width={34} x={136} y={-10} />
      <Circle cx={98} cy={98} fill={s.bg} opacity={0.7} r={30} />
      <Circle cx={98} cy={98} fill={s.sun1} r={8} />
    </Svg>
  );
}

/**
 * The cover floats over the horizon in a chrome frame. When a song changes it
 * glitches sideways for a moment and a bright slice runs over it.
 */
function FloatingCover({
  clock,
  kit,
  size,
  left,
  top,
}: {
  clock: SceneClock;
  kit: PlayerKit;
  size: number;
  left: number;
  top: number;
}) {
  const { colors } = useColors();
  const s = colors.skin;
  const artwork = kit.track?.artwork ?? null;
  const inner = size - 8;
  const float = useAnimatedStyle(() => {
    const c = clock.change.value;
    const glitch =
      c > 0 ? (noise(Math.floor(clock.wall.value * 30)) - 0.5) * 18 * c : 0;
    return {
      transform: [
        { translateX: glitch },
        { translateY: Math.sin(clock.run.value * 0.78) * 5 },
      ],
    };
  });
  const slice = useAnimatedStyle(() => ({
    opacity: clock.change.value > 0.05 ? 1 : 0,
    transform: [
      { translateY: ((1 - clock.change.value) * inner * 2.3) % (inner - 18) },
    ],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        base.cover,
        {
          left,
          top,
          width: size,
          height: size,
          boxShadow: `0 0 24px ${s.accent}, 0 12px 20px rgba(0,0,0,0.4)`,
        },
        float,
      ]}
    >
      <Svg height={size} style={base.fill} width={size}>
        <Defs>
          <LinearGradient id="vp-chrome" x1="0" x2="1" y1="0" y2="1">
            <Stop offset="0" stopColor="#ffffff" />
            <Stop offset="0.3" stopColor="#b8b8c8" />
            <Stop offset="0.5" stopColor="#ffffff" />
            <Stop offset="0.72" stopColor="#8f8fa6" />
            <Stop offset="1" stopColor="#ffffff" />
          </LinearGradient>
        </Defs>
        <Rect fill="url(#vp-chrome)" height={size} rx={6} width={size} />
      </Svg>
      <View style={[base.coverInner, { width: inner, height: inner }]}>
        {artwork ? (
          <Image
            resizeMode="cover"
            source={{ uri: artwork }}
            style={{ width: inner, height: inner }}
          />
        ) : (
          <NoCover size={inner} />
        )}
        <Animated.View style={[base.slice, slice]} />
      </View>
    </Animated.View>
  );
}

/**
 * The cover's reflection on the floor, fading out. It uses the same picture at
 * the same size as the cover, so the image is decoded once and drawn twice.
 */
function Reflection({
  kit,
  size,
  left,
  top,
  height,
}: {
  kit: PlayerKit;
  size: number;
  left: number;
  top: number;
  height: number;
}) {
  const { colors } = useColors();
  const s = colors.skin;
  const artwork = kit.track?.artwork ?? null;
  return (
    <View
      pointerEvents="none"
      style={[base.reflection, { left, top, width: size, height }]}
    >
      <View style={base.flip}>
        {artwork ? (
          <Image
            resizeMode="cover"
            source={{ uri: artwork }}
            style={{ width: size, height: size }}
          />
        ) : (
          <NoCover size={size} />
        )}
      </View>
      <Svg height={height} style={base.fill} width={size}>
        <Defs>
          <LinearGradient id="vp-fade" x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0" stopColor={s.floor} stopOpacity={0} />
            <Stop offset="0.85" stopColor={s.floor} />
          </LinearGradient>
        </Defs>
        <Rect fill="url(#vp-fade)" height={height} width={size} />
      </Svg>
    </View>
  );
}

/** VHS lines over the whole scene, plus a bright band rolling down. */
function Scanlines({
  clock,
  w,
  h,
}: {
  clock: SceneClock;
  w: number;
  h: number;
}) {
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: ((clock.run.value / 3.6) % 1) * (h + 40) - 40 }],
  }));
  let d = '';
  for (let y = 2.5; y < h; y += 3) d += `M0 ${y} H ${w} `;
  return (
    <>
      <Svg height={h} pointerEvents="none" style={base.fill} width={w}>
        <Path d={d} stroke="#000000" strokeOpacity={0.16} strokeWidth={1} />
      </Svg>
      <Animated.View pointerEvents="none" style={[base.band, style]}>
        <Svg height={40} width={w}>
          <Defs>
            <LinearGradient id="vp-band" x1="0" x2="0" y1="0" y2="1">
              <Stop offset="0" stopColor="#ffffff" stopOpacity={0} />
              <Stop offset="0.5" stopColor="#ffffff" stopOpacity={0.12} />
              <Stop offset="1" stopColor="#ffffff" stopOpacity={0} />
            </LinearGradient>
          </Defs>
          <Rect fill="url(#vp-band)" height={40} width={w} />
        </Svg>
      </Animated.View>
    </>
  );
}

/** The on-screen text of a VCR: mode, channel on a change, REC and counter. */
function Osd({ clock, kit }: { clock: SceneClock; kit: PlayerKit }) {
  const { colors } = useColors();
  const s = colors.skin;
  const shadow = { textShadowColor: s.chromaA ?? s.accent };
  const channel = useAnimatedStyle(() => ({
    opacity: clock.change.value > 0 ? 1 : 0,
  }));
  const mode = useAnimatedStyle(() => ({
    opacity: clock.change.value > 0 ? 0 : 1,
  }));
  const rec = useAnimatedStyle(() => ({
    opacity:
      clock.play.value < 0.5 ? 0 : Math.floor(clock.wall.value * 2) % 2 ? 0 : 1,
  }));
  return (
    <>
      <View pointerEvents="none" style={base.osdTop}>
        <Animated.Text style={[base.osd, shadow, mode]}>
          {kit.isPlaying ? 'PLAY ▶' : 'PAUSA'}
        </Animated.Text>
        <Animated.Text style={[base.osd, base.osdOver, shadow, channel]}>
          {`CH ${two(kit.queueIndex + 1)}`}
        </Animated.Text>
      </View>
      <Animated.Text pointerEvents="none" style={[base.osd, base.rec, rec]}>
        ● REC
      </Animated.Text>
      <Text pointerEvents="none" style={[base.osd, base.osdBottom, shadow]}>
        SP {tape(kit.position)}
      </Text>
    </>
  );
}

function Scene({
  clock,
  kit,
  w,
  h,
}: {
  clock: SceneClock;
  kit: PlayerKit;
  w: number;
  h: number;
}) {
  const { colors } = useColors();
  const s = colors.skin;
  const k = Math.min(w / BASE_W, h / BASE_H);
  const horizon = Math.round(h * HORIZON);
  const cover = Math.round(Math.min(204 * k, horizon - 34));
  const coverLeft = Math.round((w - cover) / 2);
  const coverTop = horizon - cover - 2;
  const mountainH = Math.round(80 * k);
  const fogH = Math.round(60 * k);
  const lift = Math.round(8 * k);
  return (
    <View
      accessible
      accessibilityLabel="Atardecer vaporwave con una cuadrícula que avanza"
      onLayout={clock.onLayout}
      style={[base.scene, { width: w, height: h }]}
    >
      <Svg height={h} style={base.fill} width={w}>
        <Defs>
          <LinearGradient id="vp-sky" x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0" stopColor={s.bg} />
            <Stop offset="0.28" stopColor={s.sky1} />
            <Stop offset="0.62" stopColor={s.sky2} />
            <Stop offset="0.7" stopColor={s.sun1} />
            <Stop offset="0.72" stopColor={s.sky2} />
          </LinearGradient>
        </Defs>
        <Rect fill="url(#vp-sky)" height={h} width={w} />
      </Svg>
      {[0, 1, 2].map(group => (
        <Stars key={group} clock={clock} group={group} h={h} w={w} />
      ))}
      <ShootingStar clock={clock} w={w} />
      <Sun clock={clock} horizon={horizon} k={k} w={w} />
      <Clouds clock={clock} k={k} top={Math.round(horizon * 0.51)} w={w} />

      <View
        pointerEvents="none"
        style={[
          base.floor,
          { top: horizon, backgroundColor: s.floor, borderTopColor: s.grid },
        ]}
      >
        <Floor clock={clock} color={s.grid} h={h - horizon} w={w} />
      </View>

      <Palm clock={clock} k={k} style={{ left: -14 * k, top: horizon - 144 * k }} />
      <Palm
        clock={clock}
        k={k}
        mirror
        style={{ right: -18 * k, top: horizon - 120 * k }}
      />

      <Svg
        height={mountainH}
        pointerEvents="none"
        preserveAspectRatio="none"
        style={[base.at0, { top: horizon - mountainH + 2 }]}
        viewBox="0 0 336 80"
        width={w}
      >
        <Path
          d="M0 78 L34 40 L58 58 L92 18 L128 60 L150 46 L186 78 M150 78 L196 34 L222 52 L262 12 L298 56 L336 30"
          fill="none"
          opacity={0.85}
          stroke={s.grid}
          strokeWidth={2}
        />
        <Path
          d="M34 40 L40 78 M92 18 L96 78 M92 18 L70 78 M196 34 L202 78 M262 12 L268 78 M262 12 L240 78 M298 56 L300 78"
          fill="none"
          opacity={0.5}
          stroke={s.grid}
          strokeWidth={1.2}
        />
      </Svg>

      <Svg
        height={fogH}
        pointerEvents="none"
        style={[base.at0, { top: horizon - fogH / 2 }]}
        width={w}
      >
        <Defs>
          <LinearGradient id="vp-fog" x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0" stopColor={s.sun2} stopOpacity={0} />
            <Stop offset="0.5" stopColor={s.sun2} stopOpacity={0.55} />
            <Stop offset="1" stopColor={s.sun2} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Rect fill="url(#vp-fog)" height={fogH} width={w} />
      </Svg>

      <Reflection
        height={h - horizon - lift}
        kit={kit}
        left={coverLeft + 4}
        size={cover - 8}
        top={horizon + lift}
      />
      <FloatingCover
        clock={clock}
        kit={kit}
        left={coverLeft}
        size={cover}
        top={coverTop}
      />

      <Scanlines clock={clock} h={h} w={w} />
      <Osd clock={clock} kit={kit} />
    </View>
  );
}

/* ───────── controls ───────── */

/** The song title with two colored ghosts, like a worn tape. One line. */
function ChromaTitle({ text }: { text: string }) {
  const { colors } = useColors();
  const styles = useStyles();
  const s = colors.skin;
  return (
    <View style={styles.titleBox}>
      <Text
        aria-hidden
        numberOfLines={1}
        style={[styles.title, base.ghost, base.ghostA, { color: s.chromaA }]}
      >
        {text}
      </Text>
      <Text
        aria-hidden
        numberOfLines={1}
        style={[styles.title, base.ghost, base.ghostB, { color: s.chromaB }]}
      >
        {text}
      </Text>
      <Text numberOfLines={1} style={[styles.title, { color: s.ink }]}>
        {text}
      </Text>
    </View>
  );
}

/** A deck key: it sinks a little when pressed. */
function DeckKey({
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
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        base.deckKey,
        style,
        {
          opacity: disabled ? 0.55 : 1,
          transform: [{ translateY: pressed ? 3 : 0 }],
          boxShadow: pressed
            ? 'inset 0 2px 4px rgba(0,0,0,0.4)'
            : 'inset 0 2px 0 rgba(255,255,255,0.4), 0 3px 0 rgba(0,0,0,0.45)',
        },
      ]}
    >
      {children}
    </Pressable>
  );
}

function SkipGlyph({ forward, color }: { forward?: boolean; color: string }) {
  return (
    <Svg height={28} viewBox="0 0 24 24" width={28}>
      <Path
        d={
          forward ? 'M3 6v12l8-6zM13 6v12l8-6z' : 'M11 6v12L3 12zM21 6v12l-8-6z'
        }
        fill={color}
      />
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
  const s = colors.skin;
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
        style={[
          styles.panel,
          {
            bottom: insets.bottom + 16,
            backgroundColor: s.panel,
            borderColor: s.line,
            boxShadow: `0 0 24px ${s.accent}`,
          },
        ]}
      >
        <View style={styles.panelHead}>
          <View style={base.grow}>
            <ChromaTitle text="Más opciones" />
          </View>
          <Pressable
            accessibilityLabel="Cerrar opciones"
            accessibilityRole="button"
            onPress={onClose}
            style={styles.panelClose}
          >
            <X color={s.ink} size={24} strokeWidth={2.6} />
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
            style={[styles.panelRow, { borderTopColor: s.line }]}
          >
            <Text style={[styles.panelLabel, { color: s.ink }]}>
              {row.label}
            </Text>
            <Text style={[styles.panelLabel, { color: s.accent }]}>
              {row.value}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function VaporwavePlayer({
  covered,
  headerGesture,
  onClose,
}: SkinProps) {
  const kit = usePlayerKit({ covered });
  const { width, height } = useWindowDimensions();
  const clock = useSceneClock(kit, {
    boost: 3,
    changeSeconds: 0.9,
    baseWidth: BASE_W,
  });
  const { colors } = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const [more, setMore] = useState(false);
  if (!kit.track) return null;
  const s = colors.skin;

  // Everything below the scene keeps its height; the scene takes what is
  // left, up to the size it was drawn at, and the rest becomes even gaps.
  const body = height - insets.top - insets.bottom - HEADER - 12;
  const deck = Math.round(Math.max(92, Math.min(110, height * 0.134)));
  const fixed = TITLE + ARTIST + SEEK + TIMES + deck + TOOLS + 48;
  const sceneH = Math.round(Math.max(220, Math.min(BASE_H, body - fixed)));
  const sceneW = Math.min(width - 24, Math.round(sceneH * 1.35));
  const trackW = width - 24;
  const shown = trackW * kit.progress;
  const repeatOne = kit.repeatMode === RepeatMode.Track;

  const tools = [
    {
      key: 'queue',
      caption: 'COLA',
      label: `Abrir cola de reproducción con ${kit.queueCount} canciones`,
      active: false,
      onPress: kit.openQueue,
      Icon: ListMusic,
    },
    {
      key: 'lyrics',
      caption: 'LETRAS',
      label: `Abrir letras de ${kit.track.title}`,
      active: false,
      onPress: kit.openLyrics,
      Icon: FileText,
    },
    {
      key: 'shuffle',
      caption: 'MEZCLA',
      label: kit.shuffle ? 'Desactivar mezcla' : 'Activar mezcla',
      active: kit.shuffle,
      onPress: kit.toggleShuffle,
      Icon: Shuffle,
    },
    {
      key: 'repeat',
      caption: repeatOne ? 'UNA' : kit.repeatOn ? 'TODO' : 'REPETIR',
      label: kit.repeatLabel,
      active: kit.repeatOn,
      onPress: kit.cycleRepeat,
      Icon: repeatOne ? Repeat1 : Repeat,
    },
    {
      key: 'more',
      caption: 'MÁS',
      label: 'Más opciones: temporizador, velocidad, ecualizador y acciones',
      active: more,
      onPress: () => setMore(true),
      Icon: MoreHorizontal,
    },
  ];

  return (
    <View
      style={[
        styles.player,
        { paddingTop: insets.top, paddingBottom: insets.bottom },
      ]}
    >
      <DragHeader gesture={headerGesture} style={styles.header}>
        <Pressable
          accessibilityLabel="Cerrar reproductor"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.headerButton}
        >
          <ChevronDown color={s.ink} size={26} strokeWidth={2.4} />
        </Pressable>
        <Text numberOfLines={1} style={[styles.channel, { color: s.sub }]}>
          {`CANAL ${two(kit.queueIndex + 1)} · ${
            kit.isPlaying ? 'PLAY ▶' : 'PAUSA ❚❚'
          }`}
        </Text>
        <Pressable
          accessibilityLabel={
            kit.favorite ? 'Quitar de favoritas' : 'Añadir a favoritas'
          }
          accessibilityRole="button"
          accessibilityState={{ selected: kit.favorite }}
          onPress={kit.toggleFavorite}
          style={styles.headerButton}
        >
          <Heart
            color={kit.favorite ? s.accent : s.ink}
            fill={kit.favorite ? s.accent : 'none'}
            size={24}
            strokeWidth={2.2}
          />
        </Pressable>
      </DragHeader>

      <ScrollView
        contentContainerStyle={[styles.content, { minHeight: body }]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sceneRow}>
          <Scene clock={clock} h={sceneH} kit={kit} w={sceneW} />
        </View>

        <View style={styles.gap} />

        <View style={styles.side}>
          <ChromaTitle text={kit.track.title} />
          <Text numberOfLines={1} style={[styles.artist, { color: s.sub }]}>
            {kit.track.album
              ? `${kit.track.artist} · ${kit.track.album}`
              : kit.track.artist}
          </Text>
        </View>

        <View style={styles.gapSmall} />

        <SeekArea kit={kit} style={styles.seek}>
          <View
            pointerEvents="none"
            style={[styles.seekTrack, { backgroundColor: s.line }]}
          >
            <View style={[styles.seekFill, { width: shown }]}>
              <Svg height={8} width={trackW}>
                <Defs>
                  <LinearGradient id="vp-seek" x1="0" x2="1" y1="0" y2="0">
                    <Stop offset="0" stopColor={s.chromaB} />
                    <Stop offset="1" stopColor={s.accent} />
                  </LinearGradient>
                </Defs>
                <Rect fill="url(#vp-seek)" height={8} width={trackW} />
              </Svg>
            </View>
          </View>
          <View
            pointerEvents="none"
            style={[
              styles.thumb,
              {
                left: shown - 10,
                backgroundColor: s.ink,
                boxShadow: `0 0 10px ${s.accent}`,
              },
            ]}
          />
        </SeekArea>
        <View style={styles.times}>
          <Text style={[styles.time, { color: s.sub }]}>
            {formatTime(kit.position)}
          </Text>
          <Text aria-hidden style={[styles.time, { color: s.sub }]}>
            TRACKING ▮▮▮▯
          </Text>
          <Text style={[styles.time, { color: s.sub }]}>
            -{formatTime(Math.max(0, kit.duration - kit.position))}
          </Text>
        </View>

        <View style={styles.gap} />

        <View
          style={[
            styles.deck,
            {
              height: deck,
              backgroundColor: s.deck,
            },
          ]}
        >
          <DeckKey
            disabled={!kit.ready || kit.busy}
            label="Canción anterior"
            onPress={kit.previous}
            style={[base.skipKey, { backgroundColor: s.key }]}
          >
            <SkipGlyph color={s.keyInk} />
            <Text style={[styles.keyWord, { color: s.keyInk }]}>REW</Text>
          </DeckKey>
          <DeckKey
            disabled={!kit.ready}
            label={kit.isPlaying ? 'Pausar' : 'Reproducir'}
            onPress={kit.toggle}
            style={[base.playKey, { backgroundColor: s.accent }]}
          >
            <Svg height={30} viewBox="0 0 24 24" width={30}>
              <Path
                d={
                  kit.isPlaying ? 'M5 4h5v16H5zM14 4h5v16h-5z' : 'M7 4v16l13-8z'
                }
                fill={s.onAccent}
              />
            </Svg>
            <Text style={[styles.playWord, { color: s.onAccent }]}>
              {kit.isPlaying ? 'PAUSA' : 'PLAY'}
            </Text>
          </DeckKey>
          <DeckKey
            disabled={!kit.ready || kit.busy}
            label="Siguiente canción"
            onPress={kit.next}
            style={[base.skipKey, { backgroundColor: s.key }]}
          >
            <SkipGlyph color={s.keyInk} forward />
            <Text style={[styles.keyWord, { color: s.keyInk }]}>FF</Text>
          </DeckKey>
        </View>

        <View style={styles.gap} />

        <View style={styles.tools}>
          {tools.map(({ Icon, ...tool }) => {
            const ink = tool.active ? s.onAccent : s.ink;
            return (
              <Pressable
                key={tool.key}
                accessibilityLabel={tool.label}
                accessibilityRole="button"
                accessibilityState={{ selected: tool.active }}
                onPress={tool.onPress}
                style={({ pressed }) => [
                  styles.tool,
                  {
                    backgroundColor: tool.active ? s.accent : s.panel,
                    borderColor: tool.active ? s.accent : s.line,
                    boxShadow: tool.active ? `0 0 14px ${s.accent}` : undefined,
                    transform: [{ translateY: pressed ? 2 : 0 }],
                  },
                ]}
              >
                <Icon color={ink} size={20} strokeWidth={2.2} />
                <Text
                  adjustsFontSizeToFit
                  minimumFontScale={0.8}
                  numberOfLines={1}
                  style={[styles.toolText, { color: ink }]}
                >
                  {tool.caption}
                </Text>
              </Pressable>
            );
          })}
        </View>
        <View style={styles.gapSmall} />
      </ScrollView>
      {more ? <MoreOptions kit={kit} onClose={() => setMore(false)} /> : null}
    </View>
  );
}

/** Styles that do not depend on the palette. */
const base = StyleSheet.create({
  fill: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  at0: { position: 'absolute', left: 0 },
  grow: { flex: 1 },
  scene: { borderRadius: 14, overflow: 'hidden' },
  star: { position: 'absolute', backgroundColor: '#ffffff' },
  shoot: { position: 'absolute', top: 26, width: 70, height: 2 },
  sunBox: { position: 'absolute', top: 0 },
  sun: { position: 'absolute' },
  clouds: { position: 'absolute', left: 0 },
  floor: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    borderTopWidth: 2,
    overflow: 'hidden',
  },
  palm: { position: 'absolute', transformOrigin: '50% 100%' },
  cover: {
    position: 'absolute',
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  coverInner: { borderRadius: 3, overflow: 'hidden' },
  slice: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: 18,
    backgroundColor: 'rgba(255,255,255,0.4)',
  },
  reflection: { position: 'absolute', overflow: 'hidden', opacity: 0.38 },
  flip: { transform: [{ scaleY: -1 }] },
  band: { position: 'absolute', left: 0, right: 0, top: 0, height: 40 },
  osd: {
    fontFamily: VHS,
    fontSize: 20,
    color: '#ffffff',
    textShadowOffset: { width: 1.5, height: 0 },
    textShadowRadius: 0.1,
  },
  osdTop: { position: 'absolute', left: 12, top: 8 },
  osdOver: { position: 'absolute', left: 0, top: 0 },
  rec: { position: 'absolute', right: 12, top: 8, color: '#ff3355' },
  osdBottom: { position: 'absolute', left: 12, bottom: 8 },
  ghost: { position: 'absolute', left: 0, right: 0, top: 0, opacity: 0.85 },
  ghostA: { transform: [{ translateX: 2 }] },
  ghostB: { transform: [{ translateX: -2 }] },
  deckKey: {
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  skipKey: { width: 88, gap: 4 },
  playKey: { flex: 1, flexDirection: 'row', gap: 10 },
});

const useStyles = createStyles(colors => ({
  player: { flex: 1, backgroundColor: colors.skin.bg ?? colors.background },
  header: {
    height: HEADER,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 6,
  },
  headerButton: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  channel: {
    flex: 1,
    textAlign: 'center',
    fontFamily: VHS,
    fontSize: 20,
    letterSpacing: 1.6,
  },
  content: { flexGrow: 1, paddingTop: 4, paddingBottom: 12 },
  sceneRow: { alignItems: 'center' },
  gap: { flexGrow: 1, minHeight: 10 },
  gapSmall: { flexGrow: 0.5, minHeight: 6 },
  side: { marginHorizontal: 16 },
  titleBox: { height: TITLE, justifyContent: 'center' },
  title: {
    fontFamily: colors.design.fonts.display,
    fontSize: 24,
    lineHeight: TITLE,
  },
  artist: { fontFamily: VHS, fontSize: 20, lineHeight: ARTIST },
  seek: { height: SEEK, marginHorizontal: 12, justifyContent: 'center' },
  seekTrack: { height: 8, borderRadius: 4, overflow: 'hidden' },
  seekFill: { height: 8, overflow: 'hidden' },
  thumb: {
    position: 'absolute',
    top: (SEEK - 20) / 2,
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  times: {
    height: TIMES,
    marginHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  time: { fontFamily: VHS, fontSize: 18 },
  deck: {
    marginHorizontal: 12,
    borderRadius: 12,
    padding: 10,
    flexDirection: 'row',
    gap: 8,
    boxShadow:
      'inset 0 2px 0 rgba(255,255,255,0.12), 0 8px 18px rgba(0,0,0,0.35)',
  },
  keyWord: { fontFamily: VHS, fontSize: 17 },
  playWord: { fontFamily: VHS, fontSize: 24, letterSpacing: 1 },
  tools: {
    height: TOOLS,
    marginHorizontal: 12,
    flexDirection: 'row',
    gap: 6,
  },
  tool: {
    flex: 1,
    borderRadius: 10,
    borderWidth: 2,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 3,
  },
  toolText: { fontFamily: VHS, fontSize: 15, paddingHorizontal: 2 },
  scrim: { backgroundColor: '#000000', opacity: 0.5 },
  panel: {
    position: 'absolute',
    left: 12,
    right: 12,
    borderRadius: 14,
    borderWidth: 2,
    padding: 12,
  },
  panelHead: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: 6,
    marginBottom: 4,
  },
  panelClose: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  panelRow: {
    height: 52,
    paddingHorizontal: 8,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  panelLabel: { fontFamily: VHS, fontSize: 21 },
}));
