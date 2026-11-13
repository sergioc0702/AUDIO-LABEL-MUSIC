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
  Ellipse,
  G,
  Path,
  RadialGradient,
  Stop,
} from 'react-native-svg';
import { createStyles, useColors } from '../../theme/theme';
import { formatTime } from '../../utils/formatTime';
import { DragHeader, SeekArea, usePlayerKit, type SkinProps } from './kit';
import {
  AnimatedCircle,
  AnimatedLine,
  AnimatedPath,
  Layer,
  noise,
  placeIn,
  useSceneClock,
  type SceneClock,
} from './scenes/common';
import { allTools } from './toolset';

const VW = 360;
const VH = 250;
const at = placeIn(VW, VH);
const FILL = {
  position: 'absolute' as const,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};
const HUD = 'Orbitron';
const BODY = 'Exo2';

/* ───────── viewport ───────── */

function Star({
  clock,
  n,
  color,
}: {
  clock: SceneClock;
  n: number;
  color: string;
}) {
  const depth = 0.3 + noise(n * 9.1) * 0.7;
  const props = useAnimatedProps(() => {
    const c = clock.change.value;
    const warp = c > 0 ? Math.sin((1 - c) * Math.PI) : 0;
    const y = noise(n * 7.3 + 2) * VH;
    const raw =
      (noise(n * 3.1) * VW -
        clock.run.value * 14 * depth -
        clock.wall.value * 2 * depth) %
      VW;
    const x = raw < 0 ? raw + VW : raw;
    const a = Math.atan2(y - VH / 2, x - VW / 2);
    const len = 1.5 + warp * 120 * depth;
    return {
      x1: x,
      y1: y,
      x2: x + Math.cos(a) * len,
      y2: y + Math.sin(a) * len,
    };
  });
  return (
    <AnimatedLine
      animatedProps={props}
      opacity={0.35 + depth * 0.65}
      stroke={color}
      strokeLinecap="round"
      strokeWidth={1 + depth * 1.6}
    />
  );
}

function Planet({
  clock,
  x,
  colors,
}: {
  clock: SceneClock;
  x: number;
  colors: Record<string, string>;
}) {
  const bands = useAnimatedProps(() => {
    let d = '';
    for (let n = 0; n < 6; n += 1) {
      const y = 70 + n * 22;
      const shift = (clock.run.value * 10 + n * 37) % 160;
      d +=
        'M' +
        (x - 90) +
        ' ' +
        y +
        ' h 180 v ' +
        (5 + (n % 3) * 4) +
        ' h -180 z ';
      d += 'M' + (x - 80 + shift) + ' ' + (y + 11) + ' h 34 v 4 h -34 z ';
    }
    return { d };
  });
  const style = useAnimatedStyle(() => {
    const c = clock.change.value;
    const k = c > 0 ? Math.sin((1 - c) * Math.PI) : 0;
    return {
      opacity: 1 - k * 0.9,
      transform: [
        {
          translateX: Math.sin(clock.wall.value * 0.08) * 8 * clock.unit.value,
        },
        {
          translateY: Math.cos(clock.wall.value * 0.06) * 5 * clock.unit.value,
        },
        { scale: 1 - k * 0.4 },
      ],
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[FILL, style]}>
      <Layer h={VH} w={VW}>
        <Defs>
          <ClipPath id="ship-planet">
            <Circle cx={x} cy={124} r={70} />
          </ClipPath>
          <RadialGradient cx="35%" cy="35%" id="ship-glow" r="65%">
            <Stop offset="0" stopColor={colors.planet2} stopOpacity={0.35} />
            <Stop offset="1" stopColor={colors.planet} stopOpacity={0} />
          </RadialGradient>
        </Defs>
        <Circle cx={x} cy={124} fill="url(#ship-glow)" r={100} />
        <Ellipse
          cx={x}
          cy={124}
          fill="none"
          opacity={0.35}
          rx={116}
          ry={20}
          stroke={colors.ring}
          strokeWidth={6}
          transform={`rotate(-14 ${x} 124)`}
        />
        <Circle cx={x} cy={124} fill={colors.planet} r={70} />
        <G clipPath="url(#ship-planet)">
          <AnimatedPath
            animatedProps={bands}
            fill={colors.planet2}
            opacity={0.55}
          />
          <Circle
            cx={x + 34}
            cy={124}
            fill={colors.space}
            opacity={0.5}
            r={70}
          />
        </G>
        <Path
          d={`M ${x - 112} ${124 + 28} A 116 20 -14 0 0 ${x + 112} ${124 - 28}`}
          fill="none"
          stroke={colors.ring}
          strokeWidth={3}
          transform={`rotate(-14 ${x} 124)`}
        />
      </Layer>
    </Animated.View>
  );
}

function Viewport({
  clock,
  kit,
}: {
  clock: SceneClock;
  kit: ReturnType<typeof usePlayerKit>;
}) {
  const { colors } = useColors();
  const styles = useStyles();
  const s = colors.skin;
  const flash = useAnimatedStyle(() => {
    const c = clock.change.value;
    return { opacity: c > 0.75 ? (c - 0.75) * 1.6 : 0 };
  });
  const cross = useAnimatedStyle(() => ({
    transform: [
      { rotate: `${clock.wall.value * 20}deg` },
      { scale: 1 + Math.sin(clock.wall.value * 3) * 0.06 * clock.play.value },
    ],
  }));
  const px = 150 + (Math.max(0, kit.queueIndex) % 3) * 24;
  return (
    <View
      accessible
      accessibilityLabel="Ventana de la nave con estrellas y un planeta"
      onLayout={clock.onLayout}
      style={[
        styles.viewport,
        { backgroundColor: s.space, borderColor: s.line },
      ]}
    >
      <Layer h={VH} w={VW}>
        {Array.from({ length: 46 }, (_, n) => (
          <Star key={n} clock={clock} color={s.star ?? '#ffffff'} n={n} />
        ))}
      </Layer>
      <Planet clock={clock} colors={s} x={px} />
      <Animated.View
        pointerEvents="none"
        style={[at(VW / 2 - 24, VH / 2 - 24, 48, 48), cross]}
      >
        <Svg height="100%" viewBox="0 0 48 48" width="100%">
          <Path
            d="M24 2 V 14 M24 34 V 46 M2 24 H 14 M34 24 H 46"
            stroke={s.accent}
            strokeWidth={2}
          />
          <Circle
            cx={24}
            cy={24}
            fill="none"
            r={10}
            stroke={s.accent}
            strokeDasharray="4 4"
            strokeWidth={1.5}
          />
        </Svg>
      </Animated.View>
      <Layer h={VH} w={VW}>
        <Path
          d="M10 30 V 10 H 30 M330 10 H 350 V 30 M10 220 V 240 H 30 M330 240 H 350 V 220"
          fill="none"
          stroke={s.accent}
          strokeWidth={2.5}
        />
        <Path
          d={`M0 0 L 70 0 L 0 120 Z M${VW} 0 L ${VW - 70} 0 L ${VW} 120 Z`}
          fill={s.panel}
          opacity={0.9}
        />
      </Layer>
      <View pointerEvents="none" style={at(16, 214, 200, 30)}>
        <Text style={[styles.hud, { color: s.accent }]}>
          {kit.isPlaying ? 'MOTORES ESTABLES' : 'MOTORES EN ESPERA'}
        </Text>
      </View>
      <View pointerEvents="none" style={[at(190, 214, 154, 30), styles.right]}>
        <Text style={[styles.hud, { color: s.accent }]}>
          T+ {formatTime(kit.position)}
        </Text>
      </View>
      <Animated.View
        pointerEvents="none"
        style={[FILL, { backgroundColor: s.star }, flash]}
      />
    </View>
  );
}

/* ───────── console ───────── */

function Gauge({
  clock,
  label,
  value,
  color,
  track,
  text,
}: {
  clock: SceneClock;
  label: string;
  value: string;
  color: string;
  track: string;
  text: string;
}) {
  const styles = useStyles();
  const arc = useAnimatedProps(() => {
    const p = Math.max(0.001, Math.min(0.999, clock.progress.value));
    const a0 = Math.PI * 0.75;
    const a1 = a0 + p * Math.PI * 1.5;
    const r = 26;
    const large = p * 270 > 180 ? 1 : 0;
    return {
      d:
        'M ' +
        (32 + Math.cos(a0) * r) +
        ' ' +
        (32 + Math.sin(a0) * r) +
        ' A ' +
        r +
        ' ' +
        r +
        ' 0 ' +
        large +
        ' 1 ' +
        (32 + Math.cos(a1) * r) +
        ' ' +
        (32 + Math.sin(a1) * r),
    };
  });
  return (
    <View style={styles.gauge}>
      <Svg height={64} viewBox="0 0 64 64" width={64}>
        <Path
          d="M 13.6 50.4 A 26 26 0 1 1 50.4 50.4"
          fill="none"
          stroke={track}
          strokeLinecap="round"
          strokeWidth={5}
        />
        <AnimatedPath
          animatedProps={arc}
          fill="none"
          stroke={color}
          strokeLinecap="round"
          strokeWidth={5}
        />
      </Svg>
      <Text style={[styles.gaugeValue, { color: text }]}>{value}</Text>
      <Text style={[styles.gaugeLabel, { color: track }]}>{label}</Text>
    </View>
  );
}

function Radar({ clock, color }: { clock: SceneClock; color: string }) {
  const styles = useStyles();
  const sweep = useAnimatedStyle(() => ({
    transform: [{ rotate: `${(clock.wall.value * 90) % 360}deg` }],
  }));
  const blip = useAnimatedProps(() => {
    const a = (clock.wall.value * 90) % 360;
    return { opacity: clock.play.value > 0.5 && a > 30 && a < 150 ? 1 : 0.15 };
  });
  return (
    <View style={[styles.radar, { borderColor: color }]}>
      <Animated.View style={[FILL, sweep]}>
        <Svg height="100%" viewBox="0 0 64 64" width="100%">
          <Path
            d="M32 32 L32 0 A32 32 0 0 1 59.7 16 Z"
            fill={color}
            opacity={0.35}
          />
        </Svg>
      </Animated.View>
      <Svg height="100%" style={FILL} viewBox="0 0 64 64" width="100%">
        <Circle
          cx={32}
          cy={32}
          fill="none"
          opacity={0.4}
          r={18}
          stroke={color}
        />
        <AnimatedCircle
          animatedProps={blip}
          cx={46}
          cy={18}
          fill={color}
          r={3}
        />
        <Circle cx={32} cy={32} fill={color} r={2.5} />
      </Svg>
    </View>
  );
}

function IgnitionRing({ clock, color }: { clock: SceneClock; color: string }) {
  const spin = useAnimatedStyle(() => ({
    opacity: 0.35 + 0.65 * clock.play.value,
    transform: [{ rotate: `${(clock.run.value * 60) % 360}deg` }],
  }));
  return (
    <Animated.View pointerEvents="none" style={[FILL, spin]}>
      <Svg height="100%" viewBox="0 0 100 100" width="100%">
        <Circle
          cx={50}
          cy={50}
          fill="none"
          r={47}
          stroke={color}
          strokeDasharray="10 7"
          strokeWidth={3}
        />
      </Svg>
    </Animated.View>
  );
}

function Switch({
  label,
  onPress,
  active,
  disabled,
  style,
  children,
}: {
  label: string;
  onPress: () => void;
  active?: boolean;
  disabled?: boolean;
  style?: object;
  children: ReactNode;
}) {
  const [down, setDown] = useState(false);
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => setDown(true)}
      onPressOut={() => setDown(false)}
      style={[
        style,
        {
          opacity: disabled ? 0.45 : down ? 0.75 : 1,
          transform: [{ scale: down ? 0.97 : 1 }],
        },
      ]}
    >
      {children}
    </Pressable>
  );
}

export function NaveEspacialPlayer({
  covered,
  headerGesture,
  onClose,
}: SkinProps) {
  const kit = usePlayerKit({ covered });
  const clock = useSceneClock(kit, {
    boost: 8,
    changeSeconds: 1.8,
    baseWidth: VW,
  });
  const { colors } = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  if (!kit.track) return null;
  const s = colors.skin;
  const tools = allTools(kit);
  const remaining = Math.max(0, kit.duration - kit.position);
  return (
    <View
      style={[
        styles.player,
        { paddingTop: insets.top, paddingBottom: insets.bottom + 6 },
      ]}
    >
      <DragHeader gesture={headerGesture} style={styles.header}>
        <Switch
          label="Cerrar reproductor"
          onPress={onClose}
          style={[styles.square, { borderColor: s.line }]}
        >
          <Text style={[styles.glyph, { color: s.ink }]}>⌄</Text>
        </Switch>
        <View style={styles.headerInfo}>
          <Text numberOfLines={1} style={[styles.bridge, { color: s.ink }]}>
            PUENTE DE MANDO
          </Text>
          <Text numberOfLines={1} style={[styles.small, { color: s.sub }]}>
            {kit.sourceLabel} · sector {kit.queueIndex + 1} de {kit.queueCount}
          </Text>
        </View>
        <Switch
          active={kit.favorite}
          label={kit.favorite ? 'Quitar de favoritas' : 'Añadir a favoritas'}
          onPress={kit.toggleFavorite}
          style={[
            styles.square,
            {
              borderColor: kit.favorite ? s.accent : s.line,
              boxShadow: kit.favorite ? `0 0 12px ${s.accent}` : 'none',
            },
          ]}
        >
          <Text
            style={[styles.glyph, { color: kit.favorite ? s.accent : s.ink }]}
          >
            {kit.favorite ? '★' : '☆'}
          </Text>
        </Switch>
      </DragHeader>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Viewport clock={clock} kit={kit} />

        <View
          style={[
            styles.console,
            { backgroundColor: s.panel, borderColor: s.line },
          ]}
        >
          <View style={styles.titleRow}>
            <View style={styles.titleText}>
              <Text numberOfLines={1} style={[styles.title, { color: s.ink }]}>
                {kit.track.title}
              </Text>
              <Text numberOfLines={1} style={[styles.artist, { color: s.sub }]}>
                {kit.track.artist}
              </Text>
            </View>
            <Radar clock={clock} color={s.accent ?? colors.accent} />
          </View>

          <View style={styles.gauges}>
            <Gauge
              clock={clock}
              color={s.accent ?? colors.accent}
              label="TRAYECTO"
              text={s.ink ?? colors.text}
              track={s.line ?? colors.outline}
              value={`${Math.round(kit.progress * 100)}%`}
            />
            <View style={styles.readout}>
              <Text style={[styles.readValue, { color: s.ink }]}>
                {formatTime(remaining)}
              </Text>
              <Text style={[styles.gaugeLabel, { color: s.line }]}>
                LLEGADA
              </Text>
            </View>
            <View style={styles.readout}>
              <Text style={[styles.readValue, { color: s.ink }]}>
                {kit.rate}×
              </Text>
              <Text style={[styles.gaugeLabel, { color: s.line }]}>EMPUJE</Text>
            </View>
          </View>

          <SeekArea kit={kit} style={styles.seek}>
            <View style={[styles.route, { borderColor: s.line }]} />
            <View
              style={[
                styles.routeDone,
                { width: `${kit.progress * 100}%`, backgroundColor: s.accent },
              ]}
            />
            <View
              style={[styles.ship, { left: `${kit.progress * 100}%` }]}
              pointerEvents="none"
            >
              <Svg height={22} viewBox="0 0 24 24" width={22}>
                <Path
                  d="M2 12 L 20 6 L 23 12 L 20 18 Z M6 12 L 2 7 M6 12 L 2 17"
                  fill={s.ink}
                  stroke={s.accent}
                  strokeWidth={1.2}
                />
              </Svg>
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

          <View style={styles.transport}>
            <Switch
              disabled={!kit.ready || kit.busy}
              label="Canción anterior"
              onPress={kit.previous}
              style={[styles.thruster, { borderColor: s.line }]}
            >
              <Text style={[styles.thrusterText, { color: s.ink }]}>
                ◀ RETRO
              </Text>
            </Switch>
            <Switch
              disabled={!kit.ready}
              label={kit.isPlaying ? 'Pausar' : 'Reproducir'}
              onPress={kit.toggle}
              style={[
                styles.ignition,
                {
                  backgroundColor: s.accent,
                  boxShadow: kit.isPlaying ? `0 0 22px ${s.accent}` : 'none',
                },
              ]}
            >
              <IgnitionRing
                clock={clock}
                color={s.onAccent ?? colors.onAccent}
              />
              <Text style={[styles.ignitionText, { color: s.onAccent }]}>
                {kit.isPlaying ? 'PAUSA' : 'IGNICIÓN'}
              </Text>
            </Switch>
            <Switch
              disabled={!kit.ready || kit.busy}
              label="Canción siguiente"
              onPress={kit.next}
              style={[styles.thruster, { borderColor: s.line }]}
            >
              <Text style={[styles.thrusterText, { color: s.ink }]}>
                SALTO ▶
              </Text>
            </Switch>
          </View>

          <View style={styles.switches}>
            {tools.map(tool => (
              <Switch
                key={tool.key}
                active={tool.active}
                label={tool.label}
                onPress={tool.onPress}
                style={[
                  styles.switch,
                  { borderColor: tool.active ? s.accent : s.line },
                ]}
              >
                <View
                  style={[
                    styles.lamp,
                    {
                      backgroundColor: tool.active ? s.accent : s.line,
                      boxShadow: tool.active ? `0 0 8px ${s.accent}` : 'none',
                    },
                  ]}
                />
                <Text
                  adjustsFontSizeToFit
                  minimumFontScale={0.65}
                  numberOfLines={1}
                  style={[
                    styles.switchText,
                    { color: tool.active ? s.ink : s.sub },
                  ]}
                >
                  {tool.caption.toUpperCase()}
                </Text>
              </Switch>
            ))}
          </View>
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
    gap: 12,
    paddingHorizontal: 14,
    minHeight: 64,
  },
  headerInfo: { flex: 1, alignItems: 'center' },
  bridge: { fontFamily: HUD, fontSize: 14, letterSpacing: 3 },
  small: { fontFamily: BODY, fontSize: 13 },
  square: {
    width: 48,
    height: 48,
    borderWidth: 1.5,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  glyph: { fontSize: 24, lineHeight: 28 },
  content: { paddingHorizontal: 12, paddingBottom: 14, gap: 0 },
  viewport: {
    width: '100%',
    aspectRatio: VW / VH,
    overflow: 'hidden',
    borderWidth: 3,
    borderTopLeftRadius: 60,
    borderTopRightRadius: 60,
    borderBottomLeftRadius: 8,
    borderBottomRightRadius: 8,
  },
  right: { alignItems: 'flex-end' },
  hud: { fontFamily: HUD, fontSize: 10, letterSpacing: 1.5 },
  console: {
    marginTop: -2,
    borderWidth: 1.5,
    borderTopWidth: 0,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    padding: 14,
    gap: 10,
  },
  titleRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  titleText: { flex: 1, minWidth: 0 },
  title: {
    fontFamily: HUD,
    fontSize: 19,
    letterSpacing: 1,
    textTransform: 'uppercase',
  },
  artist: { fontFamily: BODY, fontSize: 15 },
  radar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  gauges: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  gauge: { alignItems: 'center', width: 84 },
  gaugeValue: { fontFamily: HUD, fontSize: 13, position: 'absolute', top: 24 },
  gaugeLabel: { fontFamily: HUD, fontSize: 9, letterSpacing: 2 },
  readout: { alignItems: 'center', gap: 4, flex: 1 },
  readValue: { fontFamily: HUD, fontSize: 18 },
  seek: { height: 44, justifyContent: 'center' },
  route: { height: 0, borderTopWidth: 2, borderStyle: 'dashed' },
  routeDone: {
    position: 'absolute',
    left: 0,
    height: 3,
    top: 20,
    borderRadius: 2,
  },
  ship: { position: 'absolute', top: 11, marginLeft: -11 },
  times: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8,
  },
  time: { fontFamily: HUD, fontSize: 11 },
  transport: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 8,
  },
  thruster: {
    flex: 1,
    height: 56,
    borderWidth: 1.5,
    borderRadius: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  thrusterText: { fontFamily: HUD, fontSize: 11, letterSpacing: 1 },
  ignition: {
    width: 100,
    height: 100,
    borderRadius: 50,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ignitionText: { fontFamily: HUD, fontSize: 12, letterSpacing: 1 },
  switches: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  switch: {
    width: '23%',
    flexGrow: 1,
    height: 52,
    borderWidth: 1.5,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },
  lamp: { width: 18, height: 4, borderRadius: 2 },
  switchText: {
    fontFamily: HUD,
    fontSize: 9,
    letterSpacing: 0.5,
    paddingHorizontal: 3,
  },
}));
