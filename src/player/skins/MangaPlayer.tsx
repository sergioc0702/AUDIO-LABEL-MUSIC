import { useState, type ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Defs, Path, Pattern, Rect } from 'react-native-svg';
import { createStyles, useColors } from '../../theme/theme';
import { formatTime } from '../../utils/formatTime';
import { DragHeader, SeekArea, usePlayerKit, type SkinProps } from './kit';
import {
  AnimatedPath,
  clamp01,
  noise,
  useSceneClock,
  type SceneClock,
} from './scenes/common';
import { allTools } from './toolset';

const PW = 340;
const PH = 200;
const FILL = {
  position: 'absolute' as const,
  top: 0,
  right: 0,
  bottom: 0,
  left: 0,
};
const WORDS = ['¡TUM!', '¡PUM!', '¡BUM!', '¡TSS!'];

const SPEED_LINES = (() => {
  let d = '';
  for (let n = 0; n < 48; n += 1) {
    const a = (n / 48) * Math.PI * 2;
    const b = a + 0.03;
    d += `M250 250 L ${250 + Math.cos(a) * 360} ${250 + Math.sin(a) * 360} L ${
      250 + Math.cos(b) * 360
    } ${250 + Math.sin(b) * 360} Z `;
  }
  return d;
})();

/** Panels slide in one after another when a new song (a new page) starts. */
function usePageIn(clock: SceneClock, order: number) {
  return useAnimatedStyle(() => {
    const c = clock.change.value;
    if (c === 0)
      return { opacity: 1, transform: [{ translateX: 0 }, { rotate: '0deg' }] };
    const k = clamp01((1 - c) * 2.4 - order * 0.32);
    const e = 1 - Math.pow(1 - k, 3);
    return {
      opacity: 0.2 + 0.8 * e,
      transform: [
        { translateX: (1 - e) * 120 * clock.unit.value },
        { rotate: `${(1 - e) * 6}deg` },
      ],
    };
  });
}

function Burst({
  clock,
  seed,
  fill,
  ink,
}: {
  clock: SceneClock;
  seed: number;
  fill: string;
  ink: string;
}) {
  const props = useAnimatedProps(() => {
    const live = clock.play.value > 0.5;
    const beat = Math.abs(Math.sin(clock.wall.value * Math.PI * 1.25));
    const grow = (live ? 0.92 + beat * 0.18 : 0.78) + clock.change.value * 0.25;
    let d = '';
    for (let n = 0; n < 30; n += 1) {
      const a = (n / 30) * Math.PI * 2 + clock.wall.value * 0.05;
      const r = (n % 2 ? 50 : 80 + noise(n + seed) * 16) * grow;
      d +=
        (n ? ' L ' : 'M') +
        (PW / 2 + Math.cos(a) * r * 1.3).toFixed(1) +
        ' ' +
        (PH / 2 + Math.sin(a) * r * 0.82).toFixed(1);
    }
    return { d: d + ' Z' };
  });
  return (
    <AnimatedPath
      animatedProps={props}
      fill={fill}
      stroke={ink}
      strokeLinejoin="round"
      strokeWidth={4}
    />
  );
}

function Sfx({
  clock,
  index,
  word,
  color,
  font,
}: {
  clock: SceneClock;
  index: number;
  word: string;
  color: string;
  font?: string;
}) {
  const styles = useStyles();
  const style = useAnimatedStyle(() => {
    const live = clock.play.value > 0.5;
    const c = clock.change.value;
    let show = false;
    if (index === 4) show = c > 0;
    else if (index === 5) show = !live && c === 0;
    else
      show =
        live && c === 0 && Math.floor(clock.wall.value * 1.25) % 4 === index;
    const beat = Math.abs(Math.sin(clock.wall.value * Math.PI * 1.25));
    const scale =
      index === 4 ? 1.1 + c * 0.4 : index === 5 ? 1 : 0.95 + beat * 0.15;
    return {
      opacity: show ? 1 : 0,
      transform: [{ rotate: '-8deg' }, { scale }],
    };
  });
  return (
    <Animated.Text style={[styles.sfx, { color, fontFamily: font }, style]}>
      {word}
    </Animated.Text>
  );
}

function ActionPanel({
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
  const font = colors.design.fonts.display;
  const page = usePageIn(clock, 0);
  const spin = useAnimatedStyle(() => ({
    opacity: 0.25 + 0.7 * clock.play.value,
    transform: [{ rotate: `${(clock.run.value * 8) % 360}deg` }],
  }));
  const shake = useAnimatedStyle(() => {
    const c = clock.change.value;
    const beat =
      clock.play.value > 0.5 ? Math.sin(clock.wall.value * Math.PI * 2.5) : 0;
    return {
      transform: [
        {
          translateX:
            c > 0
              ? (noise(clock.wall.value * 40) - 0.5) * 10 * clock.unit.value
              : 0,
        },
        { translateY: beat * 1.2 * clock.unit.value },
      ],
    };
  });
  return (
    <Animated.View
      accessible
      accessibilityLabel="Viñeta de acción que late con la música"
      onLayout={clock.onLayout}
      style={[
        styles.panel,
        styles.action,
        { borderColor: ink, backgroundColor: s.panel },
        page,
      ]}
    >
      <Animated.View style={[FILL, shake]}>
        <Animated.View style={[styles.lines, spin]}>
          <Svg height="100%" viewBox="0 0 500 500" width="100%">
            <Path d={SPEED_LINES} fill={s.tone} />
          </Svg>
        </Animated.View>
        <Svg
          height="100%"
          style={FILL}
          viewBox={`0 0 ${PW} ${PH}`}
          width="100%"
        >
          <Burst
            clock={clock}
            fill={s.pop ?? '#ffffff'}
            ink={ink}
            seed={kit.queueIndex}
          />
        </Svg>
        <View pointerEvents="none" style={[FILL, styles.center]}>
          {WORDS.map((word, index) => (
            <View key={word} style={[FILL, styles.center]}>
              <Sfx
                clock={clock}
                color={s.popInk ?? ink}
                font={font}
                index={index}
                word={word}
              />
            </View>
          ))}
          <View style={[FILL, styles.center]}>
            <Sfx
              clock={clock}
              color={s.popInk ?? ink}
              font={font}
              index={4}
              word="¡ZAS!"
            />
          </View>
          <View style={[FILL, styles.center]}>
            <Sfx
              clock={clock}
              color={s.popInk ?? ink}
              font={font}
              index={5}
              word="…"
            />
          </View>
        </View>
      </Animated.View>
    </Animated.View>
  );
}

function Panel({
  clock,
  order,
  style,
  children,
}: {
  clock: SceneClock;
  order: number;
  style: object;
  children: ReactNode;
}) {
  const page = usePageIn(clock, order);
  return <Animated.View style={[style, page]}>{children}</Animated.View>;
}

/** A button drawn as a small comic panel with a hard shadow. */
function PanelButton({
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
  const { colors } = useColors();
  const styles = useStyles();
  const s = colors.skin;
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
        styles.button,
        {
          borderColor: s.ink,
          backgroundColor: active ? s.ink : s.panel,
          boxShadow: down ? 'none' : `4px 4px 0 ${s.ink}`,
          opacity: disabled ? 0.45 : 1,
          transform: [
            { translateX: down ? 4 : 0 },
            { translateY: down ? 4 : 0 },
          ],
        },
        style,
      ]}
    >
      {children}
    </Pressable>
  );
}

export function MangaPlayer({ covered, headerGesture, onClose }: SkinProps) {
  const kit = usePlayerKit({ covered });
  const clock = useSceneClock(kit, {
    boost: 0,
    changeSeconds: 1.2,
    baseWidth: PW,
  });
  const { colors } = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  if (!kit.track) return null;
  const s = colors.skin;
  const ink = s.ink ?? colors.text;
  const font = colors.design.fonts.display;
  const tools = allTools(kit);
  return (
    <View
      style={[
        styles.player,
        { paddingTop: insets.top, paddingBottom: insets.bottom + 6 },
      ]}
    >
      <Svg height="100%" pointerEvents="none" style={FILL} width="100%">
        <Defs>
          <Pattern
            height={10}
            id="mg-paper"
            patternUnits="userSpaceOnUse"
            width={10}
          >
            <Circle cx={5} cy={5} fill={s.tone} opacity={0.08} r={1.2} />
          </Pattern>
        </Defs>
        <Rect fill="url(#mg-paper)" height="100%" width="100%" />
      </Svg>
      <DragHeader gesture={headerGesture} style={styles.header}>
        <PanelButton
          label="Cerrar reproductor"
          onPress={onClose}
          style={styles.square}
        >
          <Text style={[styles.glyph, { color: ink, fontFamily: font }]}>
            ▼
          </Text>
        </PanelButton>
        <View style={styles.headerInfo}>
          <Text
            numberOfLines={1}
            style={[styles.chapter, { color: ink, fontFamily: font }]}
          >
            CAPÍTULO {kit.queueIndex + 1}
          </Text>
          <Text numberOfLines={1} style={[styles.small, { color: s.sub }]}>
            {kit.sourceLabel} · {kit.queueIndex + 1} de {kit.queueCount}
          </Text>
        </View>
        <PanelButton
          active={kit.favorite}
          label={kit.favorite ? 'Quitar de favoritas' : 'Añadir a favoritas'}
          onPress={kit.toggleFavorite}
          style={styles.square}
        >
          <Text
            style={[
              styles.glyph,
              { color: kit.favorite ? s.panel : ink, fontFamily: font },
            ]}
          >
            {kit.favorite ? '♥' : '♡'}
          </Text>
        </PanelButton>
      </DragHeader>

      <ScrollView
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <ActionPanel clock={clock} kit={kit} />

        <View style={styles.row}>
          <Panel
            clock={clock}
            order={1}
            style={[
              styles.panel,
              styles.bubblePanel,
              { borderColor: ink, backgroundColor: s.panel },
            ]}
          >
            <View
              style={[
                styles.bubble,
                { borderColor: ink, backgroundColor: s.panel },
              ]}
            >
              <Text
                adjustsFontSizeToFit
                minimumFontScale={0.6}
                numberOfLines={3}
                style={[styles.title, { color: ink, fontFamily: font }]}
              >
                {kit.track.title}
              </Text>
            </View>
            <Svg height={18} style={styles.tail} viewBox="0 0 30 18" width={30}>
              <Path
                d="M2 0 L 26 0 L 4 18 Z"
                fill={s.panel}
                stroke={ink}
                strokeWidth={3}
              />
              <Rect fill={s.panel} height={4} width={22} x={3} y={-2} />
            </Svg>
          </Panel>
          <Panel
            clock={clock}
            order={2}
            style={[
              styles.panel,
              styles.numberPanel,
              { borderColor: ink, backgroundColor: s.accent },
            ]}
          >
            <Text
              style={[styles.number, { color: s.onAccent, fontFamily: font }]}
            >
              #{kit.queueIndex + 1}
            </Text>
          </Panel>
        </View>

        <Panel
          clock={clock}
          order={3}
          style={[
            styles.narration,
            { borderColor: ink, backgroundColor: s.pop },
          ]}
        >
          <Text
            numberOfLines={1}
            style={[styles.artist, { color: s.popInk ?? ink }]}
          >
            — {kit.track.artist}
          </Text>
        </Panel>

        <SeekArea kit={kit} style={styles.seek}>
          <View
            style={[
              styles.seekTrack,
              { borderColor: ink, backgroundColor: s.panel },
            ]}
          >
            <View
              style={[
                styles.seekFill,
                { width: `${kit.progress * 100}%`, backgroundColor: ink },
              ]}
            />
            <View pointerEvents="none" style={styles.seekTicks}>
              {Array.from({ length: 9 }, (_, i) => (
                <View
                  key={i}
                  style={[styles.seekTick, { backgroundColor: s.tone }]}
                />
              ))}
            </View>
          </View>
          <View
            style={[
              styles.seekThumb,
              {
                left: `${kit.progress * 100}%`,
                borderColor: ink,
                backgroundColor: s.accent,
              },
            ]}
          />
        </SeekArea>
        <View style={styles.times}>
          <Text style={[styles.time, { color: ink, fontFamily: font }]}>
            {formatTime(kit.position)}
          </Text>
          <Text style={[styles.time, { color: ink, fontFamily: font }]}>
            {formatTime(kit.duration)}
          </Text>
        </View>

        <View style={styles.transport}>
          <PanelButton
            disabled={!kit.ready || kit.busy}
            label="Canción anterior"
            onPress={kit.previous}
            style={styles.side}
          >
            <Text style={[styles.glyph, { color: ink, fontFamily: font }]}>
              ◀◀
            </Text>
          </PanelButton>
          <PanelButton
            disabled={!kit.ready}
            label={kit.isPlaying ? 'Pausar' : 'Reproducir'}
            onPress={kit.toggle}
            style={[styles.play, { backgroundColor: s.accent }]}
          >
            <Text
              style={[styles.playText, { color: s.onAccent, fontFamily: font }]}
            >
              {kit.isPlaying ? 'PAUSA' : '¡PLAY!'}
            </Text>
          </PanelButton>
          <PanelButton
            disabled={!kit.ready || kit.busy}
            label="Canción siguiente"
            onPress={kit.next}
            style={styles.side}
          >
            <Text style={[styles.glyph, { color: ink, fontFamily: font }]}>
              ▶▶
            </Text>
          </PanelButton>
        </View>

        <View style={styles.tools}>
          {tools.map(tool => (
            <PanelButton
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
                  { color: tool.active ? s.panel : ink, fontFamily: font },
                ]}
              >
                {tool.caption}
              </Text>
            </PanelButton>
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
    paddingHorizontal: 14,
    minHeight: 66,
  },
  headerInfo: { flex: 1, alignItems: 'center' },
  chapter: { fontSize: 28, letterSpacing: 2 },
  small: { fontSize: 13, fontWeight: '700' },
  square: { width: 48, height: 48 },
  button: { alignItems: 'center', justifyContent: 'center', borderWidth: 3 },
  glyph: { fontSize: 24 },
  content: { paddingHorizontal: 14, paddingBottom: 14, gap: 10 },
  center: { alignItems: 'center', justifyContent: 'center' },
  panel: { borderWidth: 4, overflow: 'hidden' },
  action: { width: '100%', aspectRatio: PW / PH },
  lines: {
    position: 'absolute',
    width: '150%',
    aspectRatio: 1,
    left: '-25%',
    top: '-77%',
  },
  sfx: { fontSize: 56, lineHeight: 64 },
  row: { flexDirection: 'row', gap: 10, minHeight: 112 },
  bubblePanel: { flex: 3, padding: 10, justifyContent: 'center' },
  bubble: {
    borderWidth: 3,
    borderRadius: 999,
    paddingHorizontal: 18,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tail: { position: 'absolute', left: 40, bottom: 4 },
  title: {
    fontSize: 26,
    lineHeight: 30,
    textAlign: 'center',
    letterSpacing: 1,
  },
  numberPanel: { flex: 1, alignItems: 'center', justifyContent: 'center' },
  number: { fontSize: 40 },
  narration: {
    borderWidth: 3,
    paddingHorizontal: 12,
    paddingVertical: 8,
    alignSelf: 'flex-start',
    maxWidth: '100%',
  },
  artist: { fontFamily: 'ComicNeue-Regular', fontSize: 17, fontWeight: '700' },
  seek: { height: 44, justifyContent: 'center' },
  seekTrack: { height: 18, borderWidth: 3, overflow: 'hidden' },
  seekFill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
  seekTicks: { ...FILL, flexDirection: 'row', justifyContent: 'space-evenly' },
  seekTick: { width: 2, height: '100%', opacity: 0.4 },
  seekThumb: {
    position: 'absolute',
    width: 22,
    height: 22,
    marginLeft: -11,
    borderWidth: 3,
    transform: [{ rotate: '45deg' }],
  },
  times: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: -8,
  },
  time: { fontSize: 18, letterSpacing: 1 },
  transport: { flexDirection: 'row', gap: 12, height: 76, marginTop: 2 },
  side: { flex: 1 },
  play: { flex: 2 },
  playText: { fontSize: 34, letterSpacing: 2 },
  tools: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginTop: 4 },
  tool: { width: '22%', flexGrow: 1, height: 48 },
  toolText: { fontSize: 17, letterSpacing: 1, paddingHorizontal: 2 },
}));
