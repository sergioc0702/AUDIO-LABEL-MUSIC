/**
 * Terror: a dark abandoned room lit only by a flashlight that sweeps the room
 * on its own while the music plays. Something comes closer while the song plays, but only while the
 * light is not on it.
 *
 * Every position comes from the approved 360×820 prototype and is scaled to
 * the phone: x by width / 360, y by the usable height / 820.
 *
 * Performance: the room, the creature and the darkness are drawn once. Each
 * frame only moves them (transform) or fades them (opacity), so nothing big
 * is redrawn on the UI thread.
 */
import { useMemo, useState, type ReactNode } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, {
  useAnimatedReaction,
  useAnimatedStyle,
  useDerivedValue,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RepeatMode } from 'react-native-track-player';
import Svg, {
  Circle,
  Defs,
  Ellipse,
  G,
  LinearGradient,
  Path,
  Pattern,
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
import { noise, useSceneClock, type SceneClock } from '../../player/kit/sceneClock';

const TYPE = 'SpecialElite-Regular';
const WET = 'RubikWetPaint-Regular';
const MONO = 'CourierPrime-Regular';

/** The prototype's canvas. */
const PW = 360;
const PH = 820;

/** A different message on the wall for every song. */
const MESSAGES = [
  'NO APAGUES LA LUZ',
  'NO MIRES ATRÁS',
  'YA ESTÁ DENTRO',
  'TE ESTÁ MIRANDO',
];
const WHISPERS = [
  '¿quién está ahí?',
  'déjame entrar',
  'te encontré',
  'no estás solo',
];

/** Where it stands: from the doorway (far, small) to right in front of you. */
function place(near: number) {
  'worklet';
  const e = near * near;
  return { x: 65 + 135 * e, y: 450 + 250 * e, s: 0.42 + 1.9 * e };
}

/** Song change: 0 to 1 while the light is out (change falls from 1 to 0). */
function changePhase(change: number) {
  'worklet';
  return change > 0 ? 1 - change : 1;
}

type Scale = { sx: number; sy: number; k: number };

/** The abandoned room. Drawn once, stretched to the screen. */
function Room({ width, height }: { width: number; height: number }) {
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
        <Pattern
          height={28}
          id="tr-paper"
          patternUnits="userSpaceOnUse"
          width={28}
        >
          <Rect fill={s.wall} height={28} width={28} />
          <Path
            d="M14 2 l 4 6 -4 6 -4 -6 Z M0 16 l 4 6 -4 6 M28 16 l -4 6 4 6"
            fill="none"
            stroke={s.wallLine}
            strokeWidth={1.4}
          />
        </Pattern>
        <LinearGradient id="tr-floor" x1="0" x2="0" y1="0" y2="1">
          <Stop offset="0" stopColor={s.floor1} />
          <Stop offset="1" stopColor={s.floor2} />
        </LinearGradient>
        <RadialGradient cx="50%" cy="50%" id="tr-mold" r="50%">
          <Stop offset="0" stopColor={s.mold} stopOpacity={0.9} />
          <Stop offset="1" stopColor={s.mold} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Rect fill={s.dark} height={PH} width={PW} />
      <Rect fill="url(#tr-paper)" height={520} width={PW} y={60} />
      <Ellipse cx={300} cy={140} fill="url(#tr-mold)" rx={90} ry={60} />
      <Ellipse cx={90} cy={520} fill="url(#tr-mold)" rx={100} ry={50} />
      <Path
        d="M250 60 L 360 60 L 360 300 Q 330 260 300 270 Q 290 200 250 160 Z"
        fill={s.peel}
      />
      <Path
        d="M250 160 Q 290 200 300 270 Q 280 250 262 262 Q 270 210 250 160 Z"
        fill={s.peelHi}
      />
      <Rect fill={s.doorFrame} height={300} width={86} x={22} y={150} />
      <Rect fill="#000000" height={290} width={70} x={30} y={160} />
      <Path
        d="M300 330 l 18 70 M308 326 l 18 72 M316 324 l 16 70 M324 326 l 12 64"
        stroke={s.mold}
        strokeLinecap="round"
        strokeWidth={2.6}
      />
      <G fill={s.blood} opacity={0.9}>
        <Ellipse cx={292} cy={470} rx={16} ry={20} />
        <Rect height={22} rx={3} width={6} x={278} y={436} />
        <Rect height={24} rx={3} width={6} x={287} y={430} />
        <Rect height={22} rx={3} width={6} x={296} y={432} />
        <Rect height={18} rx={3} width={6} x={305} y={440} />
        <Path d="M280 488 L 284 560 L 290 488 Z M298 488 L 300 540 L 304 488 Z" />
      </G>
      <Rect fill="url(#tr-floor)" height={240} width={PW} y={580} />
      <Path
        d="M0 640 L 360 620 M0 700 L 360 676 M0 770 L 360 742"
        stroke={s.floor2}
        strokeWidth={2}
      />
      <Rect fill={s.doorFrame} height={8} width={PW} y={574} />
    </Svg>
  );
}

/** It. Drawn once; each frame only moves and scales it. */
function Creature({
  near,
  scale,
}: {
  near: SharedValue<number>;
  scale: Scale;
}) {
  const { colors } = useColors();
  const s = colors.skin;
  const { sx, sy, k } = scale;
  const w = 100 * k;
  const h = 312 * k;
  const style = useAnimatedStyle(() => {
    const p = place(near.value);
    return {
      transform: [
        { translateX: p.x * sx - w / 2 },
        { translateY: p.y * sy - h },
        { scale: p.s },
      ],
    };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.creature, { width: w, height: h }, style]}
    >
      <Svg height={h} viewBox="-50 -310 100 312" width={w}>
        <G transform="rotate(-16)">
          <Path
            d="M-14 -300 Q 0 -306 14 -300 L 18 -260 Q 0 -250 -18 -260 Z"
            fill={s.itBody}
          />
          <Ellipse cx={0} cy={-282} fill={s.it} rx={17} ry={24} />
          <Ellipse cx={-6} cy={-286} fill="#050303" rx={4.5} ry={6.5} />
          <Ellipse cx={7} cy={-285} fill="#050303" rx={4.5} ry={7} />
          <Circle cx={-6} cy={-285} fill={s.eye} r={1.2} />
          <Circle cx={7} cy={-284} fill={s.eye} r={1.2} />
          <Path
            d="M-7 -268 Q 0 -250 7 -268 Q 0 -266 -7 -268 Z"
            fill="#050303"
          />
        </G>
        <Path
          d="M-4 -258 L 4 -258 L 5 -238 L -5 -238 Z"
          fill={s.it}
          opacity={0.75}
        />
        <Path
          d="M-24 -238 Q 0 -246 24 -238 L 22 -120 L 14 -10 L 6 0 L -6 0 L -14 -10 L -22 -120 Z"
          fill={s.itBody}
        />
        <Path
          d="M-24 -232 Q -38 -180 -40 -120 Q -42 -80 -36 -60 L -32 -58 Q -34 -100 -28 -170 Z"
          fill={s.itBody}
        />
        <Path
          d="M24 -232 Q 40 -170 42 -110 Q 44 -76 38 -54 L 34 -52 Q 36 -96 28 -168 Z"
          fill={s.itBody}
        />
        <Path
          d="M-36 -60 l -4 18 M-34 -58 l -1 20 M-32 -58 l 3 18 M38 -54 l 4 18 M36 -52 l 1 20 M34 -52 l -3 18"
          stroke={s.it}
          strokeLinecap="round"
          strokeWidth={2}
        />
      </Svg>
    </Animated.View>
  );
}

/** "255,232,180" → "#ffe8b4": the gradient only understands hex colors. */
function hexOf(rgb: string | undefined) {
  const parts = (rgb ?? '255,232,180').split(',').map(Number);
  return `#${parts.map(v => v.toString(16).padStart(2, '0')).join('')}`;
}

/**
 * The darkness: a sheet twice the size of the screen, black except for a soft
 * hole in its centre. It is drawn once and slides so the hole sits on the beam,
 * which covers the whole screen wherever the beam goes. Every piece stays
 * inside the sheet, so Android draws it all.
 */
function Darkness({
  bx,
  by,
  dim,
  k,
  width,
  height,
}: {
  bx: SharedValue<number>;
  by: SharedValue<number>;
  dim: SharedValue<number>;
  k: number;
  width: number;
  height: number;
}) {
  const { colors } = useColors();
  const s = colors.skin;
  const r = 160 * k;
  const follow = useAnimatedStyle(() => ({
    transform: [
      { translateX: bx.value - width },
      { translateY: by.value - height },
    ],
  }));
  const fade = useAnimatedStyle(() => ({ opacity: dim.value }));
  const black = { backgroundColor: s.dark, opacity: 0.985 };
  return (
    <>
      <Animated.View
        pointerEvents="none"
        style={[
          styles.sheet2,
          { width: width * 2, height: height * 2 },
          follow,
        ]}
      >
        <View
          style={[
            styles.slab,
            black,
            { left: 0, top: 0, width: width * 2, height: height - r },
          ]}
        />
        <View
          style={[
            styles.slab,
            black,
            { left: 0, top: height + r, width: width * 2, height: height - r },
          ]}
        />
        <View
          style={[
            styles.slab,
            black,
            { left: 0, top: height - r, width: width - r, height: r * 2 },
          ]}
        />
        <View
          style={[
            styles.slab,
            black,
            {
              left: width + r,
              top: height - r,
              width: width - r,
              height: r * 2,
            },
          ]}
        />
        <Svg
          height={r * 2}
          style={[styles.slab, { left: width - r, top: height - r }]}
          width={r * 2}
        >
          <Defs>
            <RadialGradient cx="50%" cy="50%" id="tr-beam" r="50%">
              <Stop offset="0" stopColor={hexOf(s.beam)} stopOpacity={0.14} />
              <Stop offset="0.35" stopColor={s.dark} stopOpacity={0} />
              <Stop offset="0.62" stopColor={s.dark} stopOpacity={0.35} />
              <Stop offset="1" stopColor={s.dark} stopOpacity={0.985} />
            </RadialGradient>
          </Defs>
          <Rect fill="url(#tr-beam)" height={r * 2} width={r * 2} />
        </Svg>
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: s.dark }, fade]}
      />
    </>
  );
}

/** Its eyes keep shining in the dark when it is close. */
function DarkEyes({
  near,
  scale,
}: {
  near: SharedValue<number>;
  scale: Scale;
}) {
  const { colors } = useColors();
  const { sx, sy, k } = scale;
  const style = useAnimatedStyle(() => {
    const p = place(near.value);
    const size = Math.max(2, 2.2 * p.s * k);
    return {
      opacity: near.value > 0.4 ? 0.9 : 0.35,
      gap: Math.max(2, 9 * p.s * k),
      transform: [
        { translateX: p.x * sx - 9 * p.s * k },
        { translateY: (p.y - 286 * p.s) * sy },
      ],
      height: size,
    };
  });
  const dot = {
    backgroundColor: colors.skin.eye,
    boxShadow: `0 0 6px ${colors.skin.eye}`,
  };
  return (
    <Animated.View pointerEvents="none" style={[styles.eyes, style]}>
      <View style={[styles.eye, dot]} />
      <View style={[styles.eye, dot]} />
    </Animated.View>
  );
}

/** One line of title that rolls like a marquee only when it does not fit. */
function Marquee({
  clock,
  text,
  style,
}: {
  clock: SceneClock;
  text: string;
  style: object;
}) {
  const [box, setBox] = useState(0);
  const [natural, setNatural] = useState(0);
  const span = useSharedValue(0);
  span.value = natural + 36;
  const fits = natural === 0 || box === 0 || natural <= box;
  const roll = useAnimatedStyle(() => {
    if (span.value <= 36) return { transform: [{ translateX: 0 }] };
    return {
      transform: [{ translateX: -((clock.wall.value * 24) % span.value) }],
    };
  });
  return (
    <View
      onLayout={(event: LayoutChangeEvent) =>
        setBox(event.nativeEvent.layout.width)
      }
      style={styles.marquee}
    >
      <View pointerEvents="none" style={styles.measure}>
        <Text
          importantForAccessibility="no-hide-descendants"
          onLayout={(event: LayoutChangeEvent) =>
            setNatural(Math.ceil(event.nativeEvent.layout.width))
          }
          style={style}
        >
          {text}
        </Text>
      </View>
      {fits ? (
        <Text numberOfLines={1} style={style}>
          {text}
        </Text>
      ) : (
        <Animated.View style={[styles.roll, roll]}>
          <Text style={[style, styles.rollGap]}>{text}</Text>
          <Text
            importantForAccessibility="no-hide-descendants"
            style={[style, styles.rollGap]}
          >
            {text}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

/** The cover: a polaroid taped to the wall. Something shows up in it. */
function Polaroid({
  clock,
  kit,
  near,
  scale,
}: {
  clock: SceneClock;
  kit: PlayerKit;
  near: SharedValue<number>;
  scale: Scale;
}) {
  const { colors } = useColors();
  const s = colors.skin;
  const photo = 150 * scale.k;
  const sway = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-2 + Math.sin(clock.wall.value * 0.5) * 1}deg` }],
  }));
  const ghost = useAnimatedStyle(() => ({ opacity: near.value * 0.9 }));
  const uri = kit.track?.artwork;
  return (
    <Animated.View
      accessibilityLabel={`Portada de ${kit.track?.title ?? ''}`}
      accessibilityRole="image"
      accessible
      style={[
        styles.polaroid,
        {
          left: 112 * scale.sx,
          top: 196 * scale.sy,
          width: photo + 18,
          backgroundColor: s.paper,
        },
        sway,
      ]}
    >
      <View style={[styles.tape, { backgroundColor: s.paper }]} />
      <View style={{ width: photo, height: photo }}>
        {uri ? (
          <Image
            fadeDuration={0}
            resizeMethod="resize"
            source={{ uri }}
            style={{ width: photo, height: photo }}
          />
        ) : (
          <View
            style={[StyleSheet.absoluteFill, { backgroundColor: s.wall }]}
          />
        )}
        <View style={[StyleSheet.absoluteFill, styles.sepia]} />
        <Animated.View style={[StyleSheet.absoluteFill, ghost]}>
          <Svg height={photo} viewBox="0 0 100 100" width={photo}>
            <Ellipse cx={78} cy={34} fill="#0a0808" rx={6} ry={8} />
            <Path d="M70 42 Q 78 38 86 42 L 88 100 L 68 100 Z" fill="#0a0808" />
            <Circle cx={76} cy={33} fill={s.eye} r={1} />
            <Circle cx={80} cy={33} fill={s.eye} r={1} />
          </Svg>
        </Animated.View>
      </View>
      <Marquee
        clock={clock}
        style={[styles.photoTitle, { color: s.paperInk }]}
        text={kit.track?.title ?? ''}
      />
      <Text
        numberOfLines={1}
        style={[styles.photoArtist, { color: s.paperSub }]}
      >
        {kit.track?.artist}
      </Text>
    </Animated.View>
  );
}

/** A taped paper note on the floor, for one tool. */
function Note({
  label,
  caption,
  on,
  rotate,
  style,
  onPress,
  children,
}: {
  label: string;
  caption: string;
  on?: boolean;
  rotate: number;
  style: object;
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
        styles.note,
        style,
        {
          backgroundColor: on ? s.noteOn : s.note,
          transform: [
            { rotate: `${rotate}deg` },
            { scale: pressed ? 0.95 : 1 },
          ],
        },
      ]}
    >
      {children}
      <Text style={[styles.noteText, { color: on ? s.noteOnInk : s.noteInk }]}>
        {caption}
      </Text>
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
          { bottom: insets.bottom + 16, backgroundColor: s.note },
        ]}
      >
        <Text style={[styles.sheetTitle, { color: s.noteInk }]}>
          Notas del cuaderno
        </Text>
        {rows.map(row => (
          <Pressable
            key={row.key}
            accessibilityLabel={`${row.label}: ${row.value}`}
            accessibilityRole="button"
            onPress={() => {
              onClose();
              row.onPress();
            }}
            style={[styles.sheetRow, { borderTopColor: s.noteInk }]}
          >
            <Text style={[styles.sheetLabel, { color: s.noteInk }]}>
              {row.label}
            </Text>
            <Text style={[styles.sheetValue, { color: s.noteInk }]}>
              {row.value}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function TerrorPlayer({ covered, headerGesture, onClose }: SkinProps) {
  const kit = usePlayerKit({ covered });
  const clock = useSceneClock(kit, {
    boost: 0,
    changeSeconds: 1.6,
    baseWidth: PW,
  });
  const { width, height } = useWindowDimensions();
  const { colors } = useColors();
  const insets = useSafeAreaInsets();
  const [more, setMore] = useState(false);

  const H = height - insets.top - insets.bottom;
  const scale: Scale = { sx: width / PW, sy: H / PH, k: width / PW };
  const { sx, sy, k } = scale;
  const x = (v: number) => v * sx;
  const y = (v: number) => v * sy;

  // The beam, and how close it is. The light searches the room on its own
  // while the music plays (in prototype units, scaled below).
  const bx = useSharedValue(x(196));
  const by = useSharedValue(y(300));
  const near = useSharedValue(0.08);
  const dim = useSharedValue(0);

  useAnimatedReaction(
    () => clock.wall.value,
    (wall, previous) => {
      const dt = previous === null ? 0 : Math.min(0.05, wall - previous);
      if (dt <= 0) return;
      // A nervous hand sweeping the room: a slow wander, with a small tremble.
      // It only advances while the song plays, so in pause the light stays put.
      const t = clock.run.value;
      const wanderX = 180 + Math.sin(t * 0.31) * 120 + Math.sin(t * 1.07) * 30;
      const wanderY = Math.min(
        540,
        Math.max(
          90,
          300 + Math.sin(t * 0.23 + 1) * 130 + Math.sin(t * 0.9) * 20,
        ),
      );
      const trembleX = Math.sin(wall * 7.3) * 1.5;
      const trembleY = Math.cos(wall * 6.1) * 1.5;
      const ease = Math.min(1, dt * 6);
      bx.value += (wanderX * sx + trembleX - bx.value) * ease;
      by.value += (wanderY * sy + trembleY - by.value) * ease;

      const changing = clock.change.value > 0;
      if (clock.change.value > 0.9) near.value = 0.08;
      const playing = clock.play.value > 0.5;
      const on = playing && !changing;

      // The light fails more as the battery (the song) runs out.
      const battery = 1 - clock.progress.value;
      const rate = battery < 0.2 ? 0.3 : battery < 0.5 ? 0.08 : 0.02;
      const flicker = noise(Math.floor(wall * 14)) < rate;
      dim.value = on ? (flicker ? 0.55 : 0) : 0.985;

      // It only moves while the light is not on it, and catches up fast.
      const p = place(near.value);
      const lit =
        on &&
        Math.hypot(bx.value - p.x * sx, by.value - (p.y - 150 * p.s) * sy) <
          120 * k;
      const goal = 0.08 + clock.progress.value * 0.92;
      if (playing && !lit && near.value < goal) {
        near.value = Math.min(goal, near.value + dt * 0.18);
      }
    },
  );

  // The view breathes, and shakes when it is close.
  const close = useDerivedValue(() => Math.max(0, (near.value - 0.55) / 0.45));
  const camera = useAnimatedStyle(() => {
    const t = clock.wall.value;
    const shake = close.value > 0.4 ? (close.value - 0.4) * 5 : 0;
    return {
      transform: [
        { translateX: Math.sin(t * 31) * shake },
        { translateY: Math.cos(t * 27) * shake },
        { scale: 1.01 + Math.sin(t * 1.3) * 0.008 + close.value * 0.03 },
      ],
    };
  });
  const heartbeat = useAnimatedStyle(() => {
    const beat = Math.pow(
      Math.max(0, Math.sin(clock.wall.value * (5 + close.value * 4))),
      8,
    );
    return { opacity: close.value * (0.25 + beat * 0.5) };
  });
  const grain = useAnimatedStyle(() => {
    const step = Math.floor(clock.wall.value * 24);
    return {
      transform: [
        { translateX: Math.round(noise(step) * 14) },
        { translateY: Math.round(noise(step + 7) * 14) },
      ],
    };
  });
  // When the light dies between songs, its face is right there.
  const scare = useAnimatedStyle(() => {
    const p = changePhase(clock.change.value);
    if (clock.reduced || p >= 1) return { opacity: 0 };
    return { opacity: Math.max(0, 1 - Math.abs(p - 0.45) / 0.18) };
  });
  const whisper = useAnimatedStyle(() => {
    const p = changePhase(clock.change.value);
    return { opacity: p < 1 ? Math.min(1, (1 - p) * 1.4) : 0 };
  });

  const seed = useMemo(() => {
    const id = kit.track?.id ?? '';
    let hash = 0;
    for (let i = 0; i < id.length; i += 1)
      hash = (hash * 31 + id.charCodeAt(i)) | 0;
    return Math.abs(hash);
  }, [kit.track?.id]);

  if (!kit.track) return null;
  const s = colors.skin;
  const battery = 1 - kit.progress;
  const message = MESSAGES[seed % MESSAGES.length];
  const written = message.slice(
    0,
    Math.min(message.length, Math.floor(kit.position * 1.2)),
  );
  const glass =
    kit.progress > 0.85 ? Math.min(1, (kit.progress - 0.85) / 0.1) : 0;
  const repeatOne = kit.repeatMode === RepeatMode.Track;
  const room = 13 + Math.max(0, kit.queueIndex);
  const state = !kit.isPlaying
    ? 'A OSCURAS · NO TE MUEVAS'
    : kit.progress > 0.6
    ? 'ESTÁ MUY CERCA'
    : kit.progress > 0.3
    ? 'ALGO SE ACERCA'
    : 'LINTERNA ENCENDIDA';
  const icon = (d: string, color: string) => (
    <Svg fill="none" height={16} viewBox="0 0 24 24" width={16}>
      <Path
        d={d}
        stroke={color}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.2}
      />
    </Svg>
  );
  const noteInk = (on: boolean) => (on ? s.noteOnInk : s.noteInk);

  return (
    <View
      style={[
        styles.player,
        { backgroundColor: s.dark, paddingTop: insets.top },
      ]}
    >
      <View style={[styles.stage, { top: insets.top, height: H }]}>
        {/* The room, the polaroid and it: they breathe and shake together. */}
        <Animated.View
          onLayout={clock.onLayout}
          style={[StyleSheet.absoluteFill, camera]}
        >
          <Room height={H} width={width} />
          <Text
            style={[
              styles.wall,
              {
                left: x(112),
                top: y(92),
                color: s.blood,
                fontSize: 30 * k,
                lineHeight: 34 * k,
              },
            ]}
          >
            {written}
          </Text>
          <Polaroid clock={clock} kit={kit} near={near} scale={scale} />
          <Creature near={near} scale={scale} />
        </Animated.View>

        <Darkness bx={bx} by={by} dim={dim} height={H} k={k} width={width} />
        <DarkEyes near={near} scale={scale} />
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, styles.heart, heartbeat]}
        />
        {glass > 0 ? (
          <Svg
            height={H}
            pointerEvents="none"
            preserveAspectRatio="none"
            style={[StyleSheet.absoluteFill, { opacity: glass }]}
            viewBox={`0 0 ${PW} ${PH}`}
            width={width}
          >
            <G
              fill={s.blood}
              opacity={0.55}
              transform="translate(70 360) rotate(-14)"
            >
              <Ellipse cx={0} cy={0} rx={26} ry={32} />
              <Rect height={44} rx={4.5} width={9} x={-26} y={-74} />
              <Rect height={52} rx={4.5} width={9} x={-12} y={-84} />
              <Rect height={48} rx={4.5} width={9} x={2} y={-80} />
              <Rect height={36} rx={4.5} width={9} x={16} y={-66} />
            </G>
            <G
              fill={s.blood}
              opacity={0.45}
              transform="translate(290 250) rotate(18)"
            >
              <Ellipse cx={0} cy={0} rx={24} ry={30} />
              <Rect height={42} rx={4.5} width={9} x={-24} y={-70} />
              <Rect height={50} rx={4.5} width={9} x={-10} y={-80} />
              <Rect height={46} rx={4.5} width={9} x={4} y={-76} />
              <Rect height={34} rx={4.5} width={9} x={18} y={-62} />
            </G>
          </Svg>
        ) : null}
        <Animated.View pointerEvents="none" style={[styles.grain, grain]}>
          <Svg height={H + 40} width={width + 40}>
            <Defs>
              <Pattern
                height={7}
                id="tr-grain"
                patternUnits="userSpaceOnUse"
                width={7}
              >
                <Circle cx={1} cy={2} fill="#ffffff" opacity={0.5} r={0.6} />
                <Circle cx={4.5} cy={5} fill="#000000" opacity={0.8} r={0.7} />
              </Pattern>
            </Defs>
            <Rect fill="url(#tr-grain)" height={H + 40} width={width + 40} />
          </Svg>
        </Animated.View>
        <Animated.View
          pointerEvents="none"
          style={[StyleSheet.absoluteFill, scare]}
        >
          <Svg
            height={H}
            preserveAspectRatio="none"
            viewBox={`0 0 ${PW} ${PH}`}
            width={width}
          >
            <Ellipse
              cx={180}
              cy={380}
              fill={s.it}
              opacity={0.8}
              rx={120}
              ry={170}
            />
            <Ellipse cx={136} cy={350} fill="#030202" rx={30} ry={44} />
            <Ellipse cx={226} cy={352} fill="#030202" rx={30} ry={48} />
            <Circle cx={138} cy={352} fill={s.eye} r={5} />
            <Circle cx={224} cy={354} fill={s.eye} r={5} />
            <Path
              d="M130 470 Q 180 560 230 470 Q 180 488 130 470 Z"
              fill="#030202"
            />
          </Svg>
        </Animated.View>
        <Animated.Text
          style={[styles.whisper, { top: y(640), color: s.accent }, whisper]}
        >
          {WHISPERS[seed % WHISPERS.length]}
        </Animated.Text>

        {/* The flashlight in your hand: the controls. */}
        <View
          pointerEvents="none"
          style={[styles.torch, { top: y(610), width: 132, marginLeft: -66 }]}
        />
        <View
          pointerEvents="none"
          style={[
            styles.lens,
            {
              top: y(596),
              width: 156,
              marginLeft: -78,
              boxShadow: kit.isPlaying
                ? `0 -6px 26px rgba(${s.beam},0.5)`
                : 'none',
            },
          ]}
        />
        <View style={[styles.batteryBox, { top: y(632) }]}>
          <SeekArea kit={kit} style={styles.battery}>
            <View pointerEvents="none" style={styles.batteryHead}>
              <Text style={[styles.mono, { color: s.sub }]}>BATERÍA</Text>
              <Text
                style={[
                  styles.mono,
                  { color: battery < 0.2 ? s.accent : s.battery },
                ]}
              >
                {Math.round(battery * 100)}%
              </Text>
            </View>
            <View pointerEvents="none" style={styles.cells}>
              {Array.from({ length: 10 }, (_, i) => (
                <View
                  key={i}
                  style={[
                    styles.cell,
                    {
                      backgroundColor:
                        i < Math.ceil(battery * 10)
                          ? battery < 0.2
                            ? s.accent
                            : s.battery
                          : '#262626',
                    },
                  ]}
                />
              ))}
            </View>
          </SeekArea>
        </View>
        <Text style={[styles.time, { top: y(680), color: s.sub }]}>
          {formatTime(kit.position)} / {formatTime(kit.duration)}
        </Text>
        <Pressable
          accessibilityLabel="Canción anterior"
          accessibilityRole="button"
          disabled={!kit.ready || kit.busy}
          onPress={kit.previous}
          style={({ pressed }) => [
            styles.rubber,
            { top: y(706), marginLeft: -60, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Svg height={16} viewBox="0 0 30 22" width={20}>
            <Path
              d="M14 2 L 3 11 L 14 20 Z M 27 2 L 16 11 L 27 20 Z"
              fill={s.ink}
            />
          </Svg>
        </Pressable>
        <Pressable
          accessibilityLabel="Siguiente canción"
          accessibilityRole="button"
          disabled={!kit.ready || kit.busy}
          onPress={kit.next}
          style={({ pressed }) => [
            styles.rubber,
            { top: y(706), marginLeft: 16, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <Svg height={16} viewBox="0 0 30 22" width={20}>
            <Path
              d="M3 2 L 14 11 L 3 20 Z M 16 2 L 27 11 L 16 20 Z"
              fill={s.ink}
            />
          </Svg>
        </Pressable>
        <Pressable
          accessibilityLabel={kit.isPlaying ? 'Pausar' : 'Reproducir'}
          accessibilityRole="button"
          disabled={!kit.ready}
          onPress={kit.toggle}
          style={({ pressed }) => [
            styles.power,
            {
              top: y(760),
              backgroundColor: s.power,
              boxShadow: kit.isPlaying ? `0 0 12px ${s.power}` : 'none',
              transform: [{ scale: pressed ? 0.94 : 1 }],
            },
          ]}
        >
          <Svg fill="none" height={22} viewBox="0 0 24 24" width={22}>
            <Path
              d="M12 3 V 12 M 6.5 6.5 A 8 8 0 1 0 17.5 6.5"
              stroke={s.onPower}
              strokeLinecap="round"
              strokeWidth={2.6}
            />
          </Svg>
        </Pressable>

        {/* Paper notes on the floor: the other tools. */}
        <Note
          caption="Cola"
          label={`Abrir cola de reproducción con ${kit.queueCount} canciones`}
          onPress={kit.openQueue}
          rotate={-6}
          style={{ left: x(14), top: y(620) }}
        >
          {icon('M4 6h12M4 12h12M4 18h8M18 18V9l3-1', s.noteInk)}
        </Note>
        <Note
          caption="Mezcla"
          label={kit.shuffle ? 'Desactivar mezcla' : 'Activar mezcla'}
          on={kit.shuffle}
          onPress={kit.toggleShuffle}
          rotate={4}
          style={{ left: x(14), top: y(688) }}
        >
          {icon(
            'M3 6h4l10 12h4M3 18h4l3-3.6M14 9.6L17 6h4M18 3l3 3-3 3M18 15l3 3-3 3',
            noteInk(kit.shuffle),
          )}
        </Note>
        <Note
          caption="Letras"
          label={`Abrir letras de ${kit.track.title}`}
          onPress={kit.openLyrics}
          rotate={5}
          style={{ right: x(14), top: y(620) }}
        >
          {icon('M5 4h10l4 4v12H5zM9 11h6M9 15h4', s.noteInk)}
        </Note>
        <Note
          caption={repeatOne ? 'Una vez' : 'Repetir'}
          label={kit.repeatLabel}
          on={kit.repeatOn}
          onPress={kit.cycleRepeat}
          rotate={-4}
          style={{ right: x(14), top: y(688) }}
        >
          {icon(
            'M4 11V9a3 3 0 0 1 3-3h11M15 3l3 3-3 3M20 13v2a3 3 0 0 1-3 3H6M9 21l-3-3 3-3',
            noteInk(kit.repeatOn),
          )}
        </Note>
      </View>

      <DragHeader gesture={headerGesture} style={styles.header}>
        <Pressable
          accessibilityLabel="Cerrar reproductor"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.headerButton}
        >
          <Svg fill="none" height={22} viewBox="0 0 24 24" width={22}>
            <Path
              d="M5 9l7 7 7-7"
              stroke={s.sub}
              strokeLinecap="round"
              strokeWidth={2.2}
            />
          </Svg>
        </Pressable>
        <View style={styles.headerInfo}>
          <Text numberOfLines={1} style={[styles.heading, { color: s.ink }]}>
            Habitación {room}
          </Text>
          <Text numberOfLines={1} style={[styles.mono, { color: s.sub }]}>
            {state}
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
          <Svg height={22} viewBox="0 0 24 24" width={22}>
            <Path
              d="M12 20s-7-4.4-9-9.2C1.7 7.4 4 4 7.3 4c2 0 3.6 1.1 4.7 2.8C13.1 5.1 14.7 4 16.7 4 20 4 22.3 7.4 21 10.8 19 15.6 12 20 12 20z"
              fill={kit.favorite ? s.accent : 'none'}
              stroke={kit.favorite ? s.accent : s.sub}
              strokeLinejoin="round"
              strokeWidth={2}
            />
          </Svg>
        </Pressable>
        <Pressable
          accessibilityLabel="Más opciones: temporizador, velocidad, ecualizador y acciones"
          accessibilityRole="button"
          onPress={() => setMore(true)}
          style={styles.headerButton}
        >
          <Svg height={22} viewBox="0 0 24 24" width={22}>
            <Circle cx={12} cy={5} fill={s.sub} r={2} />
            <Circle cx={12} cy={12} fill={s.sub} r={2} />
            <Circle cx={12} cy={19} fill={s.sub} r={2} />
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
  wall: {
    position: 'absolute',
    fontFamily: WET,
    transform: [{ rotate: '-4deg' }],
  },
  creature: {
    position: 'absolute',
    left: 0,
    top: 0,
    transformOrigin: 'bottom',
  },
  sheet2: { position: 'absolute', left: 0, top: 0 },
  slab: { position: 'absolute' },
  eyes: { position: 'absolute', left: 0, top: 0, flexDirection: 'row' },
  eye: { aspectRatio: 1, height: '100%', borderRadius: 99 },
  heart: { boxShadow: 'inset 0 0 120px 40px rgba(120,0,0,1)' },
  grain: { position: 'absolute', left: -20, top: -20, opacity: 0.22 },
  whisper: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: TYPE,
    fontSize: 20,
    lineHeight: 26,
  },
  polaroid: {
    position: 'absolute',
    paddingHorizontal: 9,
    paddingTop: 9,
    paddingBottom: 6,
    boxShadow: '0 8px 18px rgba(0,0,0,0.8)',
    transformOrigin: 'top',
  },
  tape: {
    position: 'absolute',
    left: '36%',
    top: -12,
    width: 52,
    height: 18,
    opacity: 0.55,
    transform: [{ rotate: '4deg' }],
  },
  sepia: { backgroundColor: 'rgba(112,66,20,0.22)' },
  marquee: {
    overflow: 'hidden',
    height: 22,
    justifyContent: 'center',
    marginTop: 6,
  },
  measure: {
    position: 'absolute',
    width: 4000,
    opacity: 0,
    flexDirection: 'row',
  },
  roll: { flexDirection: 'row', width: 8000 },
  rollGap: { paddingRight: 36 },
  photoTitle: { fontFamily: TYPE, fontSize: 16, lineHeight: 22 },
  photoArtist: { fontFamily: TYPE, fontSize: 12, lineHeight: 15 },
  torch: {
    position: 'absolute',
    left: '50%',
    height: 260,
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    backgroundColor: '#1c1c1c',
    borderTopWidth: 2,
    borderColor: '#333333',
  },
  lens: {
    position: 'absolute',
    left: '50%',
    height: 30,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    backgroundColor: '#3a3a3a',
  },
  batteryBox: {
    position: 'absolute',
    left: '50%',
    marginLeft: -58,
    width: 116,
  },
  battery: { width: 116, height: 44 },
  batteryHead: { flexDirection: 'row', justifyContent: 'space-between' },
  cells: {
    flexDirection: 'row',
    gap: 3,
    marginTop: 4,
    padding: 3,
    borderWidth: 1.5,
    borderColor: '#5e5e5e',
    borderRadius: 3,
  },
  cell: { flex: 1, height: 10 },
  mono: { fontFamily: MONO, fontSize: 12, lineHeight: 15 },
  time: {
    position: 'absolute',
    left: 0,
    right: 0,
    textAlign: 'center',
    fontFamily: MONO,
    fontSize: 12,
    lineHeight: 15,
  },
  rubber: {
    position: 'absolute',
    left: '50%',
    width: 44,
    height: 44,
    borderRadius: 10,
    backgroundColor: '#222222',
    borderWidth: 1,
    borderColor: '#363636',
    alignItems: 'center',
    justifyContent: 'center',
  },
  power: {
    position: 'absolute',
    left: '50%',
    marginLeft: -26,
    width: 52,
    height: 52,
    borderRadius: 26,
    alignItems: 'center',
    justifyContent: 'center',
  },
  note: {
    position: 'absolute',
    width: 92,
    height: 48,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    boxShadow: '0 4px 10px rgba(0,0,0,0.7)',
  },
  noteText: { fontFamily: TYPE, fontSize: 15, lineHeight: 18 },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 52,
    paddingHorizontal: 8,
    gap: 2,
  },
  headerButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: { flex: 1, minWidth: 0 },
  heading: { fontFamily: TYPE, fontSize: 15, lineHeight: 19 },
  sheet: {
    position: 'absolute',
    left: 16,
    right: 16,
    padding: 16,
    gap: 4,
    transform: [{ rotate: '-1deg' }],
    boxShadow: '0 10px 24px rgba(0,0,0,0.8)',
  },
  sheetTitle: {
    fontFamily: TYPE,
    fontSize: 20,
    lineHeight: 26,
    paddingBottom: 6,
  },
  sheetRow: {
    minHeight: 52,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sheetLabel: { fontFamily: MONO, fontSize: 16, lineHeight: 21, flexShrink: 1 },
  sheetValue: { fontFamily: TYPE, fontSize: 15, lineHeight: 19 },
});
