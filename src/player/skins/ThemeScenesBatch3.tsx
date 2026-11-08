import { useEffect, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, Line, Path, Rect } from 'react-native-svg';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { createStyles, useColors } from '../../theme/theme';
import type { PlayerKit } from './kit';

export type Batch3Kind =
  | 'constelacion'
  | 'jardin'
  | 'origami'
  | 'cyberpunk'
  | 'vaporwave';

function SceneFrame({
  children,
  label,
  background,
}: {
  children: React.ReactNode;
  label: string;
  background: string;
}) {
  const styles = useStyles();
  return (
    <View
      accessible
      accessibilityLabel={label}
      style={[styles.frame, { backgroundColor: background }]}
    >
      {children}
    </View>
  );
}

function Constellation({ kit }: { kit: PlayerKit }) {
  const { colors } = useColors();
  const styles = useStyles();
  const start = Math.max(0, Math.min(kit.queueIndex - 3, kit.queue.length - 7));
  const songs = kit.queue.slice(start, start + 7);
  return (
    <SceneFrame
      background={colors.skin.sky}
      label="Cola de reproducción convertida en constelación"
    >
      <Svg
        height="100%"
        style={styles.absolute}
        viewBox="0 0 320 260"
        width="100%"
      >
        <Path
          d="M20 178 66 74 120 143 172 52 225 134 288 76"
          fill="none"
          stroke={colors.skin.dim}
          strokeWidth={2}
        />
        <Path
          d="M20 178 66 74 120 143 172 52 225 134 288 76"
          fill="none"
          stroke={colors.skin.haze}
          strokeDasharray={520}
          strokeDashoffset={520 * (1 - kit.progress)}
          strokeWidth={3}
        />
        {[
          [20, 178],
          [66, 74],
          [120, 143],
          [172, 52],
          [225, 134],
          [288, 76],
        ].map(([x, y], index) => (
          <Circle
            key={index}
            cx={x}
            cy={y}
            fill={
              index === kit.queueIndex - start
                ? colors.skin.accent
                : colors.skin.star
            }
            r={index === kit.queueIndex - start ? 9 : 5}
          />
        ))}
      </Svg>
      <View style={styles.stars}>
        {songs.map((track, offset) => {
          const index = start + offset;
          const active = track.id === kit.track?.id;
          return (
            <Pressable
              key={track.id}
              accessibilityLabel={`Reproducir ${track.title} de ${track.artist}`}
              accessibilityRole="button"
              onPress={() => kit.playQueueTrack(index)}
              style={[
                styles.star,
                active && { backgroundColor: colors.surfaceHigh },
              ]}
            >
              <Text
                style={{
                  color: active ? colors.accent : colors.skin.star,
                  fontSize: 19,
                }}
              >
                ✦
              </Text>
              <Text
                numberOfLines={1}
                style={[styles.starTitle, { color: colors.textSecondary }]}
              >
                {track.title}
              </Text>
            </Pressable>
          );
        })}
      </View>
      <Text style={[styles.caption, { color: colors.textSecondary }]}>
        Toca una estrella para reproducirla
      </Text>
    </SceneFrame>
  );
}

function Garden({ kit }: { kit: PlayerKit }) {
  const { colors } = useColors();
  const styles = useStyles();
  const butterfly = useSharedValue(0);
  useEffect(() => {
    butterfly.value = kit.lively
      ? withRepeat(
          withTiming(1, { duration: 1800, reduceMotion: ReduceMotion.System }),
          -1,
          true,
        )
      : withTiming(0, { duration: 500, reduceMotion: ReduceMotion.System });
  }, [butterfly, kit.lively]);
  const flight = useAnimatedStyle(() => ({
    transform: [
      { translateX: butterfly.value * 90 - 45 },
      { translateY: Math.sin(butterfly.value * Math.PI * 2) * 18 },
    ],
  }));
  const stemTop = 226 - kit.progress * 120;
  return (
    <SceneFrame
      background={colors.skin.sky}
      label="Jardín musical que crece con el avance"
    >
      <Svg
        height="100%"
        style={styles.absolute}
        viewBox="0 0 320 270"
        width="100%"
      >
        <Path d="M0 220Q160 190 320 220V270H0Z" fill={colors.skin.ground} />
        <Path d="M110 228H210L197 260H123Z" fill={colors.skin.pot} />
        <Path
          d={`M160 226Q145 ${stemTop + 30} 160 ${stemTop}`}
          fill="none"
          stroke={colors.skin.stem}
          strokeLinecap="round"
          strokeWidth={8}
        />
        <Ellipse
          cx={132 + kit.progress * 12}
          cy={205 - kit.progress * 54}
          fill={colors.skin.leaf}
          rx={26}
          ry={11}
          transform={`rotate(-28 ${132 + kit.progress * 12} ${
            205 - kit.progress * 54
          })`}
        />
        <Ellipse
          cx={190 - kit.progress * 10}
          cy={183 - kit.progress * 74}
          fill={colors.skin.leaf}
          rx={25}
          ry={10}
          transform={`rotate(28 ${190 - kit.progress * 10} ${
            183 - kit.progress * 74
          })`}
        />
        {kit.progress > 0.94 ? (
          <>
            <Circle cx={160} cy={stemTop} fill={colors.skin.petal} r={20} />
            <Circle cx={160} cy={stemTop} fill={colors.skin.center} r={8} />
          </>
        ) : null}
      </Svg>
      <Animated.View style={[styles.butterfly, flight]}>
        <Text style={{ color: colors.skin.wing, fontSize: 28 }}>✿</Text>
      </Animated.View>
      <Text style={[styles.caption, { color: colors.textSecondary }]}>
        La planta florece al terminar
      </Text>
    </SceneFrame>
  );
}

function useTrackPulse(kit: PlayerKit, callback: () => void) {
  const last = useRef(kit.track?.id);
  const latest = useRef(callback);
  latest.current = callback;
  useEffect(() => {
    if (
      kit.visible &&
      kit.track?.id &&
      last.current &&
      kit.track.id !== last.current
    ) {
      latest.current();
    }
    last.current = kit.track?.id;
  }, [kit.track?.id, kit.visible]);
}

function Origami({ kit }: { kit: PlayerKit }) {
  const { colors } = useColors();
  const styles = useStyles();
  const reduced = useReducedMotion();
  const fold = useSharedValue(1);
  useTrackPulse(kit, () => {
    fold.value = withSequence(
      withTiming(0.04, {
        duration: reduced ? 0 : 230,
        reduceMotion: ReduceMotion.System,
      }),
      withTiming(1, {
        duration: reduced ? 0 : 330,
        reduceMotion: ReduceMotion.System,
      }),
    );
  });
  useEffect(() => {
    if (kit.lively) {
      fold.value = withRepeat(
        withTiming(0.94, { duration: 950, reduceMotion: ReduceMotion.System }),
        -1,
        true,
      );
    }
  }, [fold, kit.lively]);
  const flap = useAnimatedStyle(() => ({
    transform: [
      { scaleX: fold.value },
      { rotate: `${(1 - fold.value) * 8}deg` },
    ],
  }));
  const paper = (colors.skin.sheets ?? '#e9584a,#c8463a,#a3362d').split(',');
  return (
    <SceneFrame background={colors.skin.bg} label="Grulla de papel origami">
      <Animated.View style={[styles.crane, flap]}>
        <Svg height="100%" viewBox="0 0 240 190" width="100%">
          <Path d="M16 95 95 48 120 94 95 142Z" fill={paper[0]} />
          <Path d="m95 48 112 22-87 24Z" fill={paper[1]} />
          <Path d="m120 94 87-24-50 52Z" fill={paper[2]} />
          <Path d="m157 122 63 28-64-10-36-46Z" fill={paper[0]} />
          <Path
            d="m95 48 25 46-25 48"
            fill="none"
            stroke={colors.text}
            strokeOpacity={0.45}
            strokeWidth={2}
          />
        </Svg>
      </Animated.View>
      <Text style={[styles.caption, { color: colors.textSecondary }]}>
        Una grulla nueva para cada canción
      </Text>
    </SceneFrame>
  );
}

function Cyberpunk({ kit }: { kit: PlayerKit }) {
  const { colors } = useColors();
  const styles = useStyles();
  const reduced = useReducedMotion();
  const glitch = useSharedValue(0);
  useTrackPulse(kit, () => {
    if (!reduced)
      glitch.value = withSequence(
        withTiming(1, { duration: 65, reduceMotion: ReduceMotion.System }),
        withTiming(0, { duration: 130, reduceMotion: ReduceMotion.System }),
      );
  });
  const shake = useAnimatedStyle(() => ({
    transform: [{ translateX: Math.sin(glitch.value * 10) * 5 }],
    opacity: 1 - glitch.value * 0.25,
  }));
  return (
    <SceneFrame background={colors.skin.bg} label="Ciudad ciberpunk con lluvia">
      <Svg
        height="100%"
        style={styles.absolute}
        viewBox="0 0 320 270"
        width="100%"
      >
        <Rect fill={colors.skin.city} height="100" width="50" x="12" y="140" />
        <Rect fill={colors.skin.city} height="150" width="58" x="75" y="90" />
        <Rect fill={colors.skin.city} height="120" width="50" x="148" y="120" />
        <Rect fill={colors.skin.city} height="185" width="68" x="215" y="55" />
        {Array.from({ length: 24 }, (_, i) => (
          <Rect
            key={i}
            fill={i % 3 ? colors.skin.hot : colors.skin.glow}
            height={6}
            opacity={kit.lively ? 0.85 : 0.4}
            width={5}
            x={24 + (i % 6) * 46}
            y={106 + Math.floor(i / 6) * 35}
          />
        ))}
        {Array.from({ length: 12 }, (_, i) => (
          <Line
            key={`rain-${i}`}
            stroke={colors.skin.glow}
            strokeOpacity={0.3}
            strokeWidth={2}
            x1={12 + i * 28}
            x2={4 + i * 28}
            y1={8}
            y2={205}
          />
        ))}
      </Svg>
      <Animated.View style={[styles.glitch, shake]}>
        <Text numberOfLines={1} style={{ color: colors.accent, fontSize: 15 }}>
          {kit.track?.title}
        </Text>
      </Animated.View>
      <Text style={[styles.caption, { color: colors.textSecondary }]}>
        SEÑAL LOCAL · 01:37
      </Text>
    </SceneFrame>
  );
}

function Vaporwave({ kit }: { kit: PlayerKit }) {
  const { colors } = useColors();
  const styles = useStyles();
  const reduced = useReducedMotion();
  const vhs = useSharedValue(0);
  useTrackPulse(kit, () => {
    if (!reduced)
      vhs.value = withSequence(
        withTiming(1, { duration: 70, reduceMotion: ReduceMotion.System }),
        withTiming(0, { duration: 220, reduceMotion: ReduceMotion.System }),
      );
  });
  const jitter = useAnimatedStyle(() => ({
    transform: [
      { translateX: Math.sin(vhs.value * 12) * 4 },
      { translateY: Math.sin(vhs.value * 8) * 2 },
    ],
  }));
  return (
    <SceneFrame
      background={colors.skin.bg}
      label="Atardecer vaporwave con cuadrícula"
    >
      <Animated.View style={[styles.vapor, jitter]}>
        <Svg height="100%" viewBox="0 0 320 270" width="100%">
          <Path d="M0 158 160 112 320 158V270H0Z" fill={colors.skin.floor} />
          <Circle cx="160" cy="110" fill={colors.skin.sun1} r="58" />
          {[0, 1, 2, 3, 4].map(i => (
            <Rect
              key={i}
              fill={colors.skin.bg}
              height={5 + i * 2}
              width={124 - i * 18}
              x={98 + i * 9}
              y={70 + i * 18}
            />
          ))}
          <Path
            d="M160 158 0 260M160 158 50 260M160 158 105 260M160 158 215 260M160 158 270 260M160 158 320 260M0 184H320M0 210H320M0 239H320"
            fill="none"
            stroke={colors.skin.grid}
            strokeWidth={2}
          />
          <Path
            d="M38 160Q20 110 40 62M40 120Q14 102 18 82M40 104Q62 78 63 58M278 160Q300 110 280 62M280 120Q306 102 302 82"
            fill="none"
            stroke={colors.skin.palm}
            strokeLinecap="round"
            strokeWidth={7}
          />
        </Svg>
      </Animated.View>
      <Text style={[styles.caption, { color: colors.textSecondary }]}>
        REBOBINANDO LA NOCHE · VHS
      </Text>
    </SceneFrame>
  );
}

export function Batch3ThemeScene({
  kind,
  kit,
}: {
  kind: Batch3Kind;
  kit: PlayerKit;
}) {
  if (kind === 'constelacion') return <Constellation kit={kit} />;
  if (kind === 'jardin') return <Garden kit={kit} />;
  if (kind === 'origami') return <Origami kit={kit} />;
  if (kind === 'cyberpunk') return <Cyberpunk kit={kit} />;
  return <Vaporwave kit={kit} />;
}

const useStyles = createStyles(colors => ({
  frame: {
    alignSelf: 'center',
    aspectRatio: 1.16,
    borderRadius: colors.design.radius.lg,
    maxHeight: 300,
    overflow: 'hidden',
    width: '100%',
  },
  absolute: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
  stars: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 2,
    justifyContent: 'center',
    paddingHorizontal: 8,
    paddingTop: 7,
  },
  star: {
    alignItems: 'center',
    borderRadius: 12,
    height: 48,
    justifyContent: 'center',
    maxWidth: '23%',
    minWidth: '18%',
    paddingHorizontal: 3,
  },
  starTitle: { maxWidth: 62, fontSize: 10 },
  caption: {
    bottom: 7,
    fontSize: 10,
    left: 5,
    position: 'absolute',
    right: 5,
    textAlign: 'center',
  },
  butterfly: { fontSize: 28, position: 'absolute', right: 26, top: 74 },
  crane: { alignSelf: 'center', height: '78%', width: '82%' },
  glitch: {
    bottom: 35,
    fontSize: 15,
    left: 8,
    position: 'absolute',
    right: 8,
    textAlign: 'center',
  },
  vapor: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0 },
}));
