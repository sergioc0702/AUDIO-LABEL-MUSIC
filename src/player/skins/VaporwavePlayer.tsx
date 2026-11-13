import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  G,
  LinearGradient,
  Path,
  Rect,
  Stop,
} from 'react-native-svg';
import { createStyles, useColors } from '../../theme/theme';
import { formatTime } from '../../utils/formatTime';
import { DragHeader, SeekArea, usePlayerKit, type SkinProps } from './kit';
import {
  AnimatedPath,
  AnimatedRect,
  Layer,
  noise,
  placeIn,
  useSceneClock,
  type SceneClock,
} from './scenes/common';
import { allTools } from './toolset';

const SW = 360;
const SH = 280;
const HORIZON = 168;
const at = placeIn(SW, SH);
const FILL = {
  position: 'absolute' as const,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};
const VHS = 'VT323-Regular';

/* ───────── scene ───────── */

function Grid({ clock, color }: { clock: SceneClock; color: string }) {
  const props = useAnimatedProps(() => {
    const phase = (clock.run.value * 0.45 + clock.change.value * 0.8) % 1;
    let d = '';
    for (let n = 0; n < 10; n += 1) {
      const k = (n + phase) / 10;
      const y = HORIZON + k * k * (SH - HORIZON);
      d += 'M0 ' + y.toFixed(1) + ' H ' + SW + ' ';
    }
    return { d };
  });
  return (
    <AnimatedPath
      animatedProps={props}
      fill="none"
      stroke={color}
      strokeWidth={1.6}
    />
  );
}

const RAYS = (() => {
  let d = '';
  for (let n = -9; n <= 9; n += 1)
    d += `M${SW / 2} ${HORIZON} L ${SW / 2 + n * 70} ${SH} `;
  return d;
})();

function SunCuts({ clock, color }: { clock: SceneClock; color: string }) {
  const props = useAnimatedProps(() => {
    let d = '';
    const slide = (clock.run.value * 6) % 14;
    for (let n = 0; n < 7; n += 1) {
      const y = 92 + n * 14 + slide;
      const h = 1 + n * 1.4;
      d += 'M60 ' + y.toFixed(1) + ' h 240 v ' + h.toFixed(1) + ' h -240 z ';
    }
    return { d };
  });
  return <AnimatedPath animatedProps={props} fill={color} />;
}

function Tracking({ clock, n }: { clock: SceneClock; n: number }) {
  const props = useAnimatedProps(() => ({
    opacity: clock.change.value > 0 ? 0.4 : 0,
    y: (clock.wall.value * 260 + n * 130) % SH,
    x: (noise(Math.floor(clock.wall.value * 24) + n) - 0.5) * 36,
  }));
  return (
    <AnimatedRect
      animatedProps={props}
      fill="#ffffff"
      height={5 + n * 9}
      width={SW + 60}
    />
  );
}

function Palm({
  clock,
  mirror,
  color,
}: {
  clock: SceneClock;
  mirror: boolean;
  color: string;
}) {
  const style = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${
          Math.sin(clock.wall.value * 0.7 + (mirror ? 1.3 : 0)) *
          (0.6 + 3 * clock.play.value)
        }deg`,
      },
    ],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        at(mirror ? 296 : 0, 42, 64, 132),
        { transformOrigin: mirror ? '62% 100%' : '38% 100%' },
        style,
      ]}
    >
      <Svg height="100%" viewBox="0 0 64 132" width="100%">
        <G transform={mirror ? 'translate(64 0) scale(-1 1)' : undefined}>
          <Path
            d="M24 132 C 28 96 24 64 34 36 M34 36 C 14 26 0 36 -8 50 M34 36 C 30 16 14 6 0 8 M34 36 C 48 18 66 16 80 24 M34 36 C 56 38 68 52 72 66"
            fill="none"
            stroke={color}
            strokeLinecap="round"
            strokeWidth={6}
          />
        </G>
      </Svg>
    </Animated.View>
  );
}

function Scene({
  clock,
  kit,
}: {
  clock: SceneClock;
  kit: ReturnType<typeof usePlayerKit>;
}) {
  const { colors } = useColors();
  const styles = useStyles();
  const s = colors.skin;
  const jitter = useAnimatedStyle(() => ({
    transform: [
      {
        translateX:
          clock.change.value > 0
            ? (noise(clock.wall.value * 30) - 0.5) * 18 * clock.unit.value
            : 0,
      },
    ],
  }));
  const ff = useAnimatedStyle(() => ({
    opacity: clock.change.value > 0 ? 1 : 0,
  }));
  const normal = useAnimatedStyle(() => ({
    opacity: clock.change.value > 0 ? 0 : 1,
  }));
  const rec = useAnimatedStyle(() => ({
    opacity:
      clock.play.value > 0.5
        ? Math.floor(clock.wall.value * 1.4) % 2
          ? 0.2
          : 1
        : 1,
  }));
  return (
    <View
      accessible
      accessibilityLabel="Atardecer vaporwave con una cuadrícula que avanza"
      onLayout={clock.onLayout}
      style={styles.scene}
    >
      <Animated.View style={[FILL, jitter]}>
        <Layer h={SH} w={SW}>
          <Defs>
            <LinearGradient id="vp-sky" x1="0" x2="0" y1="0" y2="1">
              <Stop offset="0" stopColor={s.sky1} />
              <Stop offset="1" stopColor={s.sky2} />
            </LinearGradient>
            <LinearGradient id="vp-sun" x1="0" x2="0" y1="0" y2="1">
              <Stop offset="0" stopColor={s.sun1} />
              <Stop offset="1" stopColor={s.sun2} />
            </LinearGradient>
            <LinearGradient id="vp-floor" x1="0" x2="0" y1="0" y2="1">
              <Stop offset="0" stopColor={s.floor} stopOpacity={0.6} />
              <Stop offset="1" stopColor={s.floor} />
            </LinearGradient>
            <ClipPath id="vp-sky-clip">
              <Rect height={HORIZON} width={SW} x={0} y={0} />
            </ClipPath>
          </Defs>
          <Rect fill="url(#vp-sky)" height={HORIZON} width={SW} />
          {Array.from({ length: 22 }, (_, n) => (
            <Circle
              key={n}
              cx={noise(n * 3.1) * SW}
              cy={noise(n * 5.7) * 90}
              fill="#ffffff"
              opacity={0.25 + noise(n) * 0.5}
              r={0.8 + noise(n * 2) * 1.2}
            />
          ))}
          <G clipPath="url(#vp-sky-clip)">
            <Circle cx={SW / 2} cy={150} fill="url(#vp-sun)" r={96} />
            <SunCuts clock={clock} color={s.sky2 ?? colors.background} />
            <Path
              d={`M0 ${HORIZON} L 40 142 L 74 156 L 118 128 L 150 150 L 180 ${HORIZON} Z M180 ${HORIZON} L 222 136 L 262 152 L 300 126 L 360 ${HORIZON} Z`}
              fill={s.floor}
              opacity={0.85}
            />
            <Path
              d={`M40 142 L 74 156 L 118 128 L 150 150 M222 136 L 262 152 L 300 126`}
              fill="none"
              stroke={s.grid}
              strokeWidth={1.2}
            />
          </G>
          <Rect
            fill="url(#vp-floor)"
            height={SH - HORIZON}
            width={SW}
            y={HORIZON}
          />
          <Grid clock={clock} color={s.grid ?? colors.accent} />
          <Path d={RAYS} stroke={s.grid} strokeWidth={1.6} />
          <Rect
            fill={s.grid}
            height={2}
            opacity={0.9}
            width={SW}
            y={HORIZON - 1}
          />
          <Tracking clock={clock} n={0} />
          <Tracking clock={clock} n={1} />
          <Path
            d={Array.from({ length: 70 }, (_, i) => `M0 ${i * 4} H ${SW}`).join(
              ' ',
            )}
            opacity={0.07}
            stroke="#000000"
            strokeWidth={1}
          />
        </Layer>
        <Palm clock={clock} color={s.palm ?? colors.text} mirror={false} />
        <Palm clock={clock} color={s.palm ?? colors.text} mirror />
        <View pointerEvents="none" style={at(14, 8, 200, 30)}>
          <Animated.Text
            style={[styles.osd, { textShadowColor: s.palm }, normal]}
          >
            {kit.isPlaying ? '▶ PLAY' : 'II PAUSA'}
          </Animated.Text>
          <Animated.Text
            style={[
              styles.osd,
              styles.overlay,
              { textShadowColor: s.palm },
              ff,
            ]}
          >
            ▶▶ AVANZAR
          </Animated.Text>
        </View>
        <Animated.View
          pointerEvents="none"
          style={[at(262, 10, 86, 24), styles.right, rec]}
        >
          <Text style={[styles.osdSmall, { textShadowColor: s.palm }]}>
            ● REC
          </Text>
        </Animated.View>
        <View
          pointerEvents="none"
          style={[at(190, 246, 160, 28), styles.right]}
        >
          <Text style={[styles.osd, { textShadowColor: s.palm }]}>
            {`0:${String(Math.floor(kit.position / 60)).padStart(
              2,
              '0',
            )}:${String(Math.floor(kit.position % 60)).padStart(2, '0')}`}
          </Text>
        </View>
      </Animated.View>
    </View>
  );
}

/* ───────── controls ───────── */

/** A raised key: light edges on top and left, dark ones below. */
function Key({
  label,
  onPress,
  children,
  active,
  disabled,
  style,
  accessibilityRole = 'button',
}: {
  label: string;
  onPress: () => void;
  children: ReactNode;
  active?: boolean;
  disabled?: boolean;
  style?: object;
  accessibilityRole?: 'button';
}) {
  const { colors } = useColors();
  const styles = useStyles();
  const s = colors.skin;
  const [down, setDown] = useState(false);
  const sunk = down || active;
  const light = s.sun1 ?? '#ffffff';
  const dark = s.floor ?? '#000000';
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole={accessibilityRole}
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => setDown(true)}
      onPressOut={() => setDown(false)}
      style={[
        styles.key,
        {
          backgroundColor: active ? s.accent : s.panel,
          borderTopColor: sunk ? dark : light,
          borderLeftColor: sunk ? dark : light,
          borderBottomColor: sunk ? light : dark,
          borderRightColor: sunk ? light : dark,
          opacity: disabled ? 0.5 : 1,
          transform: [{ translateY: down ? 2 : 0 }],
        },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

function ChromaTitle({ clock, text }: { clock: SceneClock; text: string }) {
  const { colors } = useColors();
  const styles = useStyles();
  const s = colors.skin;
  const left = useAnimatedStyle(() => {
    const k =
      1.5 +
      clock.play.value * Math.abs(Math.sin(clock.wall.value * 3.2)) * 2 +
      clock.change.value * 8;
    return { transform: [{ translateX: -k * clock.unit.value }] };
  });
  const right = useAnimatedStyle(() => {
    const k =
      1.5 +
      clock.play.value * Math.abs(Math.sin(clock.wall.value * 3.2)) * 2 +
      clock.change.value * 8;
    return { transform: [{ translateX: k * clock.unit.value }] };
  });
  return (
    <View>
      <Animated.Text
        numberOfLines={2}
        style={[styles.title, styles.overlay, { color: s.grid }, left]}
      >
        {text}
      </Animated.Text>
      <Animated.Text
        numberOfLines={2}
        style={[styles.title, styles.overlay, { color: s.accent }, right]}
      >
        {text}
      </Animated.Text>
      <Text numberOfLines={2} style={[styles.title, { color: s.ink }]}>
        {text}
      </Text>
    </View>
  );
}

export function VaporwavePlayer({
  covered,
  headerGesture,
  onClose,
}: SkinProps) {
  const kit = usePlayerKit({ covered });
  const clock = useSceneClock(kit, {
    boost: 3,
    changeSeconds: 1.4,
    baseWidth: SW,
  });
  const { colors } = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  if (!kit.track) return null;
  const s = colors.skin;
  const tools = allTools(kit);
  const ticks = 24;
  return (
    <View
      style={[
        styles.player,
        { paddingTop: insets.top, paddingBottom: insets.bottom + 6 },
      ]}
    >
      <DragHeader gesture={headerGesture} style={styles.header}>
        <Key label="Cerrar reproductor" onPress={onClose} style={styles.square}>
          <Text style={[styles.keyGlyph, { color: s.ink }]}>▼</Text>
        </Key>
        <View style={styles.headerInfo}>
          <Text numberOfLines={1} style={[styles.channel, { color: s.ink }]}>
            CANAL {String(kit.queueIndex + 1).padStart(2, '0')}
          </Text>
          <Text numberOfLines={1} style={[styles.small, { color: s.sub }]}>
            {kit.sourceLabel} · {kit.queueIndex + 1}/{kit.queueCount}
          </Text>
        </View>
        <Key
          active={kit.favorite}
          label={kit.favorite ? 'Quitar de favoritas' : 'Añadir a favoritas'}
          onPress={kit.toggleFavorite}
          style={styles.square}
        >
          <Text
            style={[
              styles.keyGlyph,
              { color: kit.favorite ? s.onAccent : s.ink },
            ]}
          >
            {kit.favorite ? '♥' : '♡'}
          </Text>
        </Key>
      </DragHeader>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Scene clock={clock} kit={kit} />

        <View
          style={[
            styles.window,
            { borderColor: s.line, backgroundColor: s.panel },
          ]}
        >
          <Svg height={22} width="100%">
            <Defs>
              <LinearGradient id="vp-bar" x1="0" x2="1" y1="0" y2="0">
                <Stop offset="0" stopColor={s.sky2} />
                <Stop offset="1" stopColor={s.grid} />
              </LinearGradient>
            </Defs>
            <Rect fill="url(#vp-bar)" height={22} width="100%" />
          </Svg>
          <View style={styles.windowBar} pointerEvents="none">
            <Text style={[styles.small, { color: s.bg }]}>
              cinta_{String(kit.queueIndex + 1).padStart(2, '0')}.vhs
            </Text>
            <View style={styles.dots}>
              {[0, 1, 2].map(n => (
                <View key={n} style={[styles.dot, { backgroundColor: s.bg }]} />
              ))}
            </View>
          </View>
          <View style={styles.windowBody}>
            <ChromaTitle clock={clock} text={kit.track.title} />
            <Text numberOfLines={1} style={[styles.artist, { color: s.sub }]}>
              {kit.track.artist}
            </Text>
          </View>
        </View>

        <SeekArea kit={kit} style={styles.seek}>
          <View
            style={[
              styles.seekTrack,
              { backgroundColor: s.floor, borderColor: s.line },
            ]}
          >
            <View
              style={[
                styles.seekFill,
                { width: `${kit.progress * 100}%`, backgroundColor: s.accent },
              ]}
            />
            <View style={styles.seekTicks} pointerEvents="none">
              {Array.from({ length: ticks }, (_, i) => (
                <View
                  key={i}
                  style={[styles.tick, { backgroundColor: s.bg }]}
                />
              ))}
            </View>
          </View>
          <View
            style={[
              styles.thumb,
              { left: `${kit.progress * 100}%`, borderBottomColor: s.sun1 },
            ]}
          />
        </SeekArea>
        <View style={styles.times}>
          <Text style={[styles.time, { color: s.sub }]}>
            {formatTime(kit.position)}
          </Text>
          <Text style={[styles.time, { color: s.sub }]}>
            -{formatTime(Math.max(0, kit.duration - kit.position))}
          </Text>
        </View>

        <View style={styles.transport}>
          <Key
            disabled={!kit.ready || kit.busy}
            label="Canción anterior"
            onPress={kit.previous}
            style={styles.side}
          >
            <Text style={[styles.keyGlyph, { color: s.ink }]}>◀◀</Text>
          </Key>
          <Key
            disabled={!kit.ready}
            label={kit.isPlaying ? 'Pausar' : 'Reproducir'}
            onPress={kit.toggle}
            style={styles.play}
          >
            <Text style={[styles.playText, { color: s.ink }]}>
              {kit.isPlaying ? 'II PAUSA' : '▶ PLAY'}
            </Text>
          </Key>
          <Key
            disabled={!kit.ready || kit.busy}
            label="Canción siguiente"
            onPress={kit.next}
            style={styles.side}
          >
            <Text style={[styles.keyGlyph, { color: s.ink }]}>▶▶</Text>
          </Key>
        </View>

        <View style={styles.tools}>
          {tools.map(tool => (
            <Key
              key={tool.key}
              active={tool.active}
              label={tool.label}
              onPress={tool.onPress}
              style={styles.tool}
            >
              <Text
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                numberOfLines={1}
                style={[
                  styles.toolText,
                  { color: tool.active ? s.onAccent : s.ink },
                ]}
              >
                {tool.caption}
              </Text>
            </Key>
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const useStyles = createStyles(colors => ({
  player: { flex: 1, backgroundColor: colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    minHeight: 64,
  },
  headerInfo: { flex: 1, alignItems: 'center' },
  channel: { fontFamily: VHS, fontSize: 26, letterSpacing: 2 },
  small: { fontFamily: VHS, fontSize: 17 },
  square: { width: 50, height: 50 },
  key: { alignItems: 'center', justifyContent: 'center', borderWidth: 3 },
  keyGlyph: { fontFamily: VHS, fontSize: 24 },
  content: { paddingBottom: 12, gap: 12 },
  scene: {
    width: '100%',
    aspectRatio: SW / SH,
    overflow: 'hidden',
    backgroundColor: colors.skin.floor,
  },
  overlay: { position: 'absolute', left: 0, right: 0, top: 0 },
  right: { alignItems: 'flex-end', justifyContent: 'center' },
  osd: {
    fontFamily: VHS,
    fontSize: 26,
    color: '#ffffff',
    textShadowOffset: { width: 2, height: 2 },
    textShadowRadius: 1,
  },
  osdSmall: {
    fontFamily: VHS,
    fontSize: 20,
    color: '#ff5470',
    textShadowOffset: { width: 1, height: 1 },
    textShadowRadius: 1,
  },
  window: { marginHorizontal: 16, borderWidth: 2, overflow: 'hidden' },
  windowBar: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: 22,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 8,
  },
  dots: { flexDirection: 'row', gap: 5 },
  dot: { width: 9, height: 9 },
  windowBody: { padding: 12, gap: 2 },
  title: {
    fontFamily: colors.design.fonts.display,
    fontSize: 26,
    lineHeight: 32,
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  artist: { fontFamily: VHS, fontSize: 22 },
  seek: { height: 44, justifyContent: 'center', marginHorizontal: 16 },
  seekTrack: { height: 14, borderWidth: 2, overflow: 'hidden' },
  seekFill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  seekTicks: {
    ...FILL,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 2,
  },
  tick: { width: 1, height: '100%', opacity: 0.35 },
  thumb: {
    position: 'absolute',
    top: 30,
    marginLeft: -8,
    width: 0,
    height: 0,
    borderLeftWidth: 8,
    borderRightWidth: 8,
    borderBottomWidth: 12,
    borderLeftColor: 'transparent',
    borderRightColor: 'transparent',
  },
  times: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginHorizontal: 16,
    marginTop: -6,
  },
  time: { fontFamily: VHS, fontSize: 20 },
  transport: {
    flexDirection: 'row',
    gap: 10,
    marginHorizontal: 16,
    height: 72,
  },
  side: { flex: 1 },
  play: { flex: 2 },
  playText: { fontFamily: VHS, fontSize: 32, letterSpacing: 2 },
  tools: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginHorizontal: 16,
  },
  tool: { width: '23%', flexGrow: 1, height: 50 },
  toolText: { fontFamily: VHS, fontSize: 20, paddingHorizontal: 2 },
}));
