import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path, Rect } from 'react-native-svg';
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

const GW = 320;
const GH = 220;
const GROUND = 176;
const at = placeIn(GW, GH);
const PIXEL = 'PressStart2P-Regular';
const BODY = 'VT323-Regular';

/* ───────── sprites ───────── */

const HERO = [
  '....#.......',
  '.....#......',
  '...######...',
  '..########..',
  '.##..##..##.',
  '.##########.',
  '.##########.',
  '.###....###.',
  '..########..',
  '...######...',
];
const FEET = [
  ['..##....##..', '.##......##.'],
  ['...##..##...', '...##..##...'],
];
const BLANK = '............';

function sprite(rows: string[]) {
  let d = '';
  rows.forEach((row, y) => {
    for (let x = 0; x < row.length; x += 1) {
      if (row[x] === '#') d += `M${x} ${y}h1v1h-1z`;
    }
  });
  return d;
}

const SPRITES = {
  a: sprite([...HERO, ...FEET[0]]),
  b: sprite([...HERO, ...FEET[1]]),
  sit: sprite([BLANK, BLANK, ...HERO]),
  blink: sprite([
    ...HERO.map((row, y) => (y === 4 ? '.##########.' : row)),
    ...FEET[0],
  ]),
};
const COIN = 'M2 0h4v1h1v1h1v4H7v1H6v1H2V7H1V6H0V2h1V1h1z';
const ICONS = {
  prev: 'M1 1h1v6H1zM7 1v6H6V6H5V5H4V3h1V2h1V1z',
  next: 'M6 1h1v6H6zM1 1h1v1h1v1h1v2H3v1H2v1H1z',
  up: 'M3 1h2v1h1v1h1v1H1V3h1V2h1z',
  down: 'M1 4h6v1H6v1H5v1H3V6H2V5H1z',
  heart: 'M1 1h2v1h2V1h2v1h1v2H7v1H6v1H5v1H3V6H2V5H1V4H0V2h1z',
  close: 'M1 2h2v1H1zM2 3h2v1H2zM3 4h2v1H3zM4 3h2v1H4zM5 2h2v1H5z',
};

/* ───────── game screen ───────── */

function Bar({
  clock,
  index,
  color,
}: {
  clock: SceneClock;
  index: number;
  color: string;
}) {
  const props = useAnimatedProps(() => {
    const beat = Math.floor(clock.wall.value * 6);
    const steps =
      clock.play.value > 0.5 ? 1 + Math.floor(noise(index * 7 + beat) * 8) : 1;
    return { height: steps * 12, y: GROUND - steps * 12 };
  });
  return (
    <AnimatedRect
      animatedProps={props}
      fill={color}
      opacity={0.55}
      width={16}
      x={10 + index * 24}
    />
  );
}

/** A strip that scrolls left forever, at its own speed. */
function Parallax({
  clock,
  speed,
  tile,
  y,
  h,
  children,
}: {
  clock: SceneClock;
  speed: number;
  tile: number;
  y: number;
  h: number;
  children: ReactNode;
}) {
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: -((clock.run.value * speed) % tile) * clock.unit.value },
    ],
  }));
  return (
    <Animated.View pointerEvents="none" style={[at(0, y, GW + tile, h), style]}>
      {children}
    </Animated.View>
  );
}

function Coin({
  clock,
  n,
  color,
  ink,
}: {
  clock: SceneClock;
  n: number;
  color: string;
  ink: string;
}) {
  const style = useAnimatedStyle(() => {
    const span = GW + 60;
    const raw = (n * 120 + 300 - clock.run.value * 48) % span;
    const x = raw < 0 ? raw + span : raw;
    const near = x > 136 && x < 178;
    const bob = Math.sin(clock.wall.value * 6 + n) * 3;
    return {
      opacity: near ? 0 : 1,
      transform: [
        { translateX: (x - 20) * clock.unit.value },
        { translateY: (GROUND - 58 + bob) * clock.unit.value },
        { scaleX: Math.abs(Math.cos(clock.wall.value * 5 + n)) * 0.7 + 0.3 },
      ],
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[at(0, 0, 16, 16), style]}>
      <Svg height="100%" viewBox="0 0 8 8" width="100%">
        <Path d={COIN} fill={color} />
        <Rect fill={ink} height={4} width={1} x={4} y={2} />
      </Svg>
    </Animated.View>
  );
}

function Hero({ clock, ink }: { clock: SceneClock; ink: string }) {
  const props = useAnimatedProps(() => {
    if (clock.play.value < 0.5) return { d: SPRITES.sit };
    if (clock.wall.value % 4 < 0.18) return { d: SPRITES.blink };
    return { d: Math.floor(clock.run.value * 4) % 2 ? SPRITES.b : SPRITES.a };
  });
  const style = useAnimatedStyle(() => {
    const c = clock.change.value;
    const jump = c > 0.4 ? Math.sin(((1 - c) / 0.6) * Math.PI) * 56 : 0;
    const step =
      clock.play.value > 0.5 && Math.floor(clock.run.value * 4) % 2 ? -4 : 0;
    return { transform: [{ translateY: (step - jump) * clock.unit.value }] };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[at(130, GROUND - 60, 60, 60), style]}
    >
      <Svg height="100%" viewBox="0 0 12 12" width="100%">
        <AnimatedPath animatedProps={props} fill={ink} />
      </Svg>
    </Animated.View>
  );
}

function Note({
  clock,
  k,
  color,
}: {
  clock: SceneClock;
  k: number;
  color: string;
}) {
  const style = useAnimatedStyle(() => {
    const life = ((clock.run.value * 12 + k * 15) % 30) / 30;
    return {
      opacity: clock.play.value > 0.5 ? 1 - life : 0,
      transform: [
        {
          translateX:
            (196 + k * 24 + ((life * 30) % 6 < 3 ? 0 : 5)) * clock.unit.value,
        },
        { translateY: (GROUND - 70 - life * 80) * clock.unit.value },
      ],
    };
  });
  return (
    <Animated.View pointerEvents="none" style={[at(0, 0, 16, 20), style]}>
      <Svg height="100%" viewBox="0 0 4 5" width="100%">
        <Path d="M2 0h2v1H3v3H2V4H0V3h2z" fill={color} />
      </Svg>
    </Animated.View>
  );
}

function GameScreen({
  clock,
  kit,
}: {
  clock: SceneClock;
  kit: ReturnType<typeof usePlayerKit>;
}) {
  const { colors } = useColors();
  const styles = useStyles();
  const s = colors.skin;
  const ink = s.ink ?? colors.text;
  const banner = useAnimatedStyle(() => ({
    opacity: clock.change.value > 0 ? 1 : 0,
    transform: [{ scale: 1 + clock.change.value * 0.3 }],
  }));
  const pause = useAnimatedStyle(() => ({
    opacity:
      clock.play.value < 0.5 && clock.change.value === 0
        ? Math.floor(clock.wall.value * 1.6) % 2
          ? 0
          : 1
        : 0,
  }));
  const score = String(Math.floor(kit.position * 10)).padStart(6, '0');
  return (
    <View
      accessible
      accessibilityLabel="Pantalla de juego con un personaje que camina mientras suena la música"
      onLayout={clock.onLayout}
      style={[styles.screen, { backgroundColor: s.screen }]}
    >
      <Layer h={GH} w={GW}>
        {Array.from({ length: 13 }, (_, i) => (
          <Bar
            key={i}
            clock={clock}
            color={s.s1 ?? colors.surfaceHigh}
            index={i}
          />
        ))}
      </Layer>
      <Parallax clock={clock} h={60} speed={8} tile={80} y={GROUND - 60}>
        <Svg height="100%" viewBox={`0 0 ${GW + 80} 60`} width="100%">
          {Array.from({ length: 6 }, (_, i) => (
            <Path
              key={i}
              d={`M${
                i * 80
              } 60 h8 v-8 h8 v-8 h8 v-8 h16 v8 h8 v8 h8 v8 h8 v8 z`}
              fill={s.s1}
              opacity={0.75}
            />
          ))}
        </Svg>
      </Parallax>
      <Parallax clock={clock} h={14} speed={14} tile={120} y={22}>
        <Svg height="100%" viewBox={`0 0 ${GW + 120} 14`} width="100%">
          {Array.from({ length: 4 }, (_, i) => (
            <Path
              key={i}
              d={`M${
                i * 120 + 20
              } 14 h40 v-4 h-6 v-4 h-8 v-4 h-12 v4 h-8 v4 h-6z`}
              fill="#ffffff"
              opacity={0.55}
            />
          ))}
        </Svg>
      </Parallax>
      <View
        pointerEvents="none"
        style={[at(0, GROUND, GW, GH - GROUND), { backgroundColor: s.s2 }]}
      />
      <Parallax clock={clock} h={8} speed={48} tile={24} y={GROUND}>
        <Svg height="100%" viewBox={`0 0 ${GW + 24} 8`} width="100%">
          {Array.from({ length: 15 }, (_, i) => (
            <Rect key={i} fill={ink} height={8} width={8} x={i * 24} />
          ))}
        </Svg>
      </Parallax>
      {[0, 1, 2].map(n => (
        <Coin
          key={n}
          clock={clock}
          color={s.accent ?? colors.accent}
          ink={ink}
          n={n}
        />
      ))}
      <Hero clock={clock} ink={ink} />
      <Note clock={clock} color={s.s2 ?? ink} k={0} />
      <Note clock={clock} color={s.s2 ?? ink} k={1} />
      <View pointerEvents="none" style={[at(8, 6, GW - 16, 14), styles.hud]}>
        <Text style={[styles.hudText, { color: ink }]}>♥♥♥</Text>
        <Text style={[styles.hudText, { color: ink }]}>{score}</Text>
        <Text style={[styles.hudText, { color: ink }]}>
          {formatTime(kit.position)}
        </Text>
      </View>
      <Animated.View
        pointerEvents="none"
        style={[at(0, 66, GW, 32), styles.center, banner]}
      >
        <Text style={[styles.banner, { color: ink }]}>
          NIVEL {kit.queueIndex + 1}
        </Text>
      </Animated.View>
      <Animated.View
        pointerEvents="none"
        style={[at(0, 66, GW, 32), styles.center, pause]}
      >
        <Text style={[styles.banner, { color: ink }]}>PAUSA</Text>
      </Animated.View>
    </View>
  );
}

/* ───────── console ───────── */

function Icon({ d, color, size }: { d: string; color: string; size: number }) {
  return (
    <Svg height={size} viewBox="0 0 8 8" width={size}>
      <Path d={d} fill={color} />
    </Svg>
  );
}

function Press({
  label,
  onPress,
  disabled,
  active,
  style,
  downStyle,
  children,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  active?: boolean;
  style: object;
  downStyle?: object;
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
      style={[style, { opacity: disabled ? 0.45 : 1 }, down && downStyle]}
    >
      {children}
    </Pressable>
  );
}

export function PixelPlayer({ covered, headerGesture, onClose }: SkinProps) {
  const kit = usePlayerKit({ covered });
  const clock = useSceneClock(kit, {
    boost: 0,
    changeSeconds: 1.6,
    baseWidth: GW,
  });
  const { colors } = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  if (!kit.track) return null;
  const s = colors.skin;
  const text = s.text ?? colors.text;
  const dark = s.s2 ?? colors.outline;
  const tools = allTools(kit);
  const byKey = Object.fromEntries(tools.map(tool => [tool.key, tool]));
  const pills = ['shuffle', 'repeat', 'sleep', 'speed', 'equalizer'].map(
    key => byKey[key],
  );
  const pressDown = { transform: [{ translateY: 3 }], boxShadow: 'none' };
  const filled = Math.round(kit.progress * 20);
  return (
    <View
      style={[
        styles.player,
        { paddingTop: insets.top, paddingBottom: insets.bottom + 6 },
      ]}
    >
      <DragHeader gesture={headerGesture} style={styles.header}>
        <Press
          downStyle={pressDown}
          label="Cerrar reproductor"
          onPress={onClose}
          style={[
            styles.square,
            { borderColor: text, boxShadow: `4px 4px 0 ${dark}` },
          ]}
        >
          <Icon color={text} d={ICONS.close} size={24} />
        </Press>
        <View style={styles.headerInfo}>
          <Text numberOfLines={1} style={[styles.level, { color: text }]}>
            NIVEL {kit.queueIndex + 1}-{kit.queueCount}
          </Text>
          <Text numberOfLines={1} style={[styles.small, { color: s.sub }]}>
            {kit.sourceLabel}
          </Text>
        </View>
        <Press
          active={kit.favorite}
          downStyle={pressDown}
          label={kit.favorite ? 'Quitar de favoritas' : 'Añadir a favoritas'}
          onPress={kit.toggleFavorite}
          style={[
            styles.square,
            {
              borderColor: text,
              backgroundColor: kit.favorite ? text : 'transparent',
              boxShadow: `4px 4px 0 ${dark}`,
            },
          ]}
        >
          <Icon
            color={kit.favorite ? s.bg ?? colors.background : text}
            d={ICONS.heart}
            size={24}
          />
        </Press>
      </DragHeader>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={[styles.bezel, { backgroundColor: s.ink }]}>
          <View style={styles.bezelTop}>
            <View
              style={[
                styles.led,
                { backgroundColor: kit.isPlaying ? s.accent : dark },
              ]}
            />
            <Text style={[styles.bezelText, { color: s.screen }]}>
              MÚSICA · ESTÉREO
            </Text>
          </View>
          <GameScreen clock={clock} kit={kit} />
          <Text numberOfLines={1} style={[styles.title, { color: s.screen }]}>
            {kit.track.title}
          </Text>
          <Text numberOfLines={1} style={[styles.artist, { color: s.s1 }]}>
            {kit.track.artist}
          </Text>
        </View>

        <SeekArea kit={kit} style={styles.seek}>
          <Text style={[styles.xp, { color: text }]}>XP</Text>
          <View style={[styles.xpBar, { borderColor: text }]}>
            {Array.from({ length: 20 }, (_, i) => (
              <View
                key={i}
                style={[
                  styles.xpCell,
                  { backgroundColor: i < filled ? text : 'transparent' },
                ]}
              />
            ))}
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

        <View style={styles.console}>
          <View style={styles.dpad}>
            <View style={[styles.dpadCenter, { backgroundColor: dark }]} />
            <Press
              label={byKey.queue.label}
              onPress={byKey.queue.onPress}
              style={[styles.arm, styles.armUp, { backgroundColor: dark }]}
              downStyle={{ opacity: 0.7 }}
            >
              <Icon color={s.screen ?? '#ffffff'} d={ICONS.up} size={22} />
            </Press>
            <Press
              disabled={!kit.ready || kit.busy}
              label="Canción anterior"
              onPress={kit.previous}
              style={[styles.arm, styles.armLeft, { backgroundColor: dark }]}
              downStyle={{ opacity: 0.7 }}
            >
              <Icon color={s.screen ?? '#ffffff'} d={ICONS.prev} size={22} />
            </Press>
            <Press
              disabled={!kit.ready || kit.busy}
              label="Canción siguiente"
              onPress={kit.next}
              style={[styles.arm, styles.armRight, { backgroundColor: dark }]}
              downStyle={{ opacity: 0.7 }}
            >
              <Icon color={s.screen ?? '#ffffff'} d={ICONS.next} size={22} />
            </Press>
            <Press
              label={byKey.lyrics.label}
              onPress={byKey.lyrics.onPress}
              style={[styles.arm, styles.armDown, { backgroundColor: dark }]}
              downStyle={{ opacity: 0.7 }}
            >
              <Icon color={s.screen ?? '#ffffff'} d={ICONS.down} size={22} />
            </Press>
          </View>
          <View style={styles.legend}>
            <Text style={[styles.legendText, { color: s.sub }]}>▲ COLA</Text>
            <Text style={[styles.legendText, { color: s.sub }]}>▼ LETRAS</Text>
          </View>
          <View style={styles.ab}>
            <View style={styles.abItem}>
              <Press
                label={byKey.menu.label}
                onPress={byKey.menu.onPress}
                style={[
                  styles.round,
                  styles.bButton,
                  { backgroundColor: dark, boxShadow: `0 4px 0 ${s.ink}` },
                ]}
                downStyle={pressDown}
              >
                <Text style={[styles.abText, { color: s.screen }]}>B</Text>
              </Press>
              <Text style={[styles.legendText, { color: s.sub }]}>MÁS</Text>
            </View>
            <View style={[styles.abItem, styles.aItem]}>
              <Press
                disabled={!kit.ready}
                label={kit.isPlaying ? 'Pausar' : 'Reproducir'}
                onPress={kit.toggle}
                style={[
                  styles.round,
                  styles.aButton,
                  { backgroundColor: s.accent, boxShadow: `0 5px 0 ${s.ink}` },
                ]}
                downStyle={pressDown}
              >
                <Text style={[styles.abText, { color: s.onAccent }]}>A</Text>
              </Press>
              <Text style={[styles.legendText, { color: s.sub }]}>
                {kit.isPlaying ? 'PAUSA' : 'JUGAR'}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.pills}>
          {pills.map(tool => (
            <View key={tool.key} style={styles.pillItem}>
              <Press
                active={tool.active}
                downStyle={{ opacity: 0.7 }}
                label={tool.label}
                onPress={tool.onPress}
                style={styles.pillHit}
              >
                <View
                  style={[
                    styles.pill,
                    { backgroundColor: tool.active ? s.accent : dark },
                  ]}
                />
              </Press>
              <Text
                adjustsFontSizeToFit
                minimumFontScale={0.7}
                numberOfLines={1}
                style={[styles.pillText, { color: tool.active ? text : s.sub }]}
              >
                {tool.caption.toUpperCase()}
              </Text>
            </View>
          ))}
        </View>
        <View style={styles.speaker} pointerEvents="none">
          {Array.from({ length: 6 }, (_, i) => (
            <View key={i} style={[styles.grill, { backgroundColor: dark }]} />
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
    gap: 12,
    paddingHorizontal: 16,
    minHeight: 66,
  },
  headerInfo: { flex: 1, alignItems: 'center' },
  level: { fontFamily: PIXEL, fontSize: 13 },
  small: { fontFamily: BODY, fontSize: 18 },
  square: {
    width: 48,
    height: 48,
    borderWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  content: { paddingHorizontal: 16, paddingBottom: 14, gap: 10 },
  bezel: {
    padding: 12,
    paddingBottom: 14,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 44,
  },
  bezelTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  led: { width: 10, height: 10, borderRadius: 5 },
  bezelText: { fontFamily: BODY, fontSize: 15, letterSpacing: 2, opacity: 0.8 },
  screen: { width: '100%', aspectRatio: GW / GH, overflow: 'hidden' },
  hud: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  hudText: { fontFamily: PIXEL, fontSize: 8 },
  center: { alignItems: 'center', justifyContent: 'center' },
  banner: { fontFamily: PIXEL, fontSize: 18 },
  title: { fontFamily: BODY, fontSize: 32, lineHeight: 34, marginTop: 10 },
  artist: { fontFamily: BODY, fontSize: 22 },
  seek: { height: 44, flexDirection: 'row', alignItems: 'center', gap: 8 },
  xp: { fontFamily: PIXEL, fontSize: 10 },
  xpBar: {
    flex: 1,
    height: 24,
    borderWidth: 4,
    padding: 2,
    flexDirection: 'row',
    gap: 2,
  },
  xpCell: { flex: 1 },
  times: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8,
  },
  time: { fontFamily: BODY, fontSize: 20 },
  console: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginTop: 4,
  },
  dpad: { width: 150, height: 150 },
  dpadCenter: {
    position: 'absolute',
    left: 50,
    top: 50,
    width: 50,
    height: 50,
  },
  arm: {
    position: 'absolute',
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 4,
  },
  armUp: { left: 50, top: 0 },
  armDown: { left: 50, top: 100 },
  armLeft: { left: 0, top: 50 },
  armRight: { left: 100, top: 50 },
  legend: { position: 'absolute', left: 156, top: 10, gap: 4 },
  legendText: { fontFamily: BODY, fontSize: 17, textAlign: 'center' },
  ab: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 14,
    transform: [{ rotate: '-18deg' }],
  },
  abItem: { alignItems: 'center', gap: 4 },
  aItem: { marginBottom: 28 },
  round: { alignItems: 'center', justifyContent: 'center', borderRadius: 999 },
  aButton: { width: 72, height: 72 },
  bButton: { width: 58, height: 58 },
  abText: { fontFamily: PIXEL, fontSize: 18 },
  pills: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 6,
  },
  pillItem: { alignItems: 'center', gap: 6, width: '19%' },
  pillHit: {
    width: '100%',
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pill: {
    width: '100%',
    height: 24,
    borderRadius: 12,
    transform: [{ rotate: '-18deg' }],
  },
  pillText: { fontFamily: BODY, fontSize: 17 },
  speaker: {
    flexDirection: 'row',
    gap: 8,
    alignSelf: 'flex-end',
    transform: [{ rotate: '-18deg' }],
    marginTop: 6,
    marginRight: 8,
  },
  grill: { width: 6, height: 40, borderRadius: 3 },
}));
