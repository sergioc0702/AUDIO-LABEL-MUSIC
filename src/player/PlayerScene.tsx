import { useEffect, useMemo, useRef, type ComponentType } from 'react';
import {
  Animated,
  Easing,
  Image,
  StyleSheet,
  View,
  useWindowDimensions,
} from 'react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { motionDuration, motionEasing } from '../theme/motion';
import type { PlayerSceneId, PlayerTheme } from '../theme/playerThemes';

type SceneProps = {
  colors: string[];
  background: string;
  artwork: string | null;
  /** True only while music plays and the player is on screen. */
  active: boolean;
};

/** Repeats 0 to 1. Stops, and costs nothing, while `active` is false. */
function useLoop(
  active: boolean,
  duration: number,
  { reverse = false, delay = 0 }: { reverse?: boolean; delay?: number } = {},
) {
  const value = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (!active) {
      return;
    }
    const forward = Animated.timing(value, {
      toValue: 1,
      duration,
      easing: reverse ? motionEasing.loop : Easing.linear,
      useNativeDriver: true,
    });
    const steps = reverse
      ? [
          forward,
          Animated.timing(value, {
            toValue: 0,
            duration,
            easing: motionEasing.loop,
            useNativeDriver: true,
          }),
        ]
      : [
          forward,
          Animated.timing(value, {
            toValue: 0,
            duration: 0,
            useNativeDriver: true,
          }),
        ];
    const loop = Animated.loop(Animated.sequence(steps));
    const start = setTimeout(() => loop.start(), delay);
    return () => {
      clearTimeout(start);
      loop.stop();
    };
  }, [active, delay, duration, reverse, value]);

  return value;
}

function Glow({ color, id }: { color: string; id: string }) {
  return (
    <Svg height="100%" width="100%">
      <Defs>
        <RadialGradient id={id} cx="50%" cy="50%" r="50%">
          <Stop offset="0" stopColor={color} stopOpacity={1} />
          <Stop offset="1" stopColor={color} stopOpacity={0} />
        </RadialGradient>
      </Defs>
      <Circle cx="50%" cy="50%" r="50%" fill={`url(#${id})`} />
    </Svg>
  );
}

const auroraLights = [
  { x: -0.3, y: -0.1, size: 1.3, opacity: 0.34, travel: 0.1, pace: 9000 },
  { x: 0.4, y: 0.18, size: 1.05, opacity: 0.28, travel: 0.14, pace: 12000 },
  { x: -0.2, y: 0.6, size: 1.2, opacity: 0.2, travel: 0.12, pace: 15000 },
];

function AuroraLight({
  color,
  index,
  active,
}: {
  color: string;
  index: number;
  active: boolean;
}) {
  const { width, height } = useWindowDimensions();
  const light = auroraLights[index];
  const drift = useLoop(active, light.pace, { reverse: true });
  const size = width * light.size;
  const travel = width * light.travel;

  return (
    <Animated.View
      renderToHardwareTextureAndroid
      style={[
        styles.absolute,
        {
          height: size,
          left: width * light.x,
          opacity: light.opacity,
          top: height * light.y,
          width: size,
          transform: [
            {
              translateX: drift.interpolate({
                inputRange: [0, 1],
                outputRange: [-travel, travel],
              }),
            },
            {
              translateY: drift.interpolate({
                inputRange: [0, 1],
                outputRange: [travel * 0.7, -travel * 0.7],
              }),
            },
            {
              scale: drift.interpolate({
                inputRange: [0, 1],
                outputRange: [1, 1.16],
              }),
            },
          ],
        },
      ]}
    >
      <Glow color={color} id={`aurora-${index}`} />
    </Animated.View>
  );
}

function AuroraScene({ colors, active }: SceneProps) {
  return (
    <>
      {colors.map((color, index) => (
        <AuroraLight key={color} active={active} color={color} index={index} />
      ))}
    </>
  );
}

function CoverScene({ artwork, background, active }: SceneProps) {
  const { width, height } = useWindowDimensions();
  const drift = useLoop(active, 14000, { reverse: true });
  const size = Math.max(width, height) * 1.25;

  return (
    <>
      {artwork ? (
        <Animated.View
          style={[
            styles.absolute,
            {
              height: size,
              left: (width - size) / 2,
              top: (height - size) / 2,
              width: size,
              transform: [
                {
                  translateX: drift.interpolate({
                    inputRange: [0, 1],
                    outputRange: [-width * 0.08, width * 0.08],
                  }),
                },
                {
                  scale: drift.interpolate({
                    inputRange: [0, 1],
                    outputRange: [1, 1.12],
                  }),
                },
              ],
            },
          ]}
        >
          <Image
            blurRadius={40}
            source={{ uri: artwork }}
            style={StyleSheet.absoluteFill}
          />
        </Animated.View>
      ) : null}
      <View
        style={[
          StyleSheet.absoluteFill,
          styles.coverScrim,
          { backgroundColor: background },
        ]}
      />
    </>
  );
}

function Ring({
  color,
  index,
  count,
  active,
}: {
  color: string;
  index: number;
  count: number;
  active: boolean;
}) {
  const { width, height } = useWindowDimensions();
  const duration = 7000;
  const wave = useLoop(active, duration, {
    delay: (duration / count) * index,
  });
  const size = width * 0.85;

  return (
    <Animated.View
      style={[
        styles.ring,
        {
          borderColor: color,
          borderRadius: size / 2,
          height: size,
          left: (width - size) / 2,
          top: height * 0.34 - size / 2,
          width: size,
          opacity: wave.interpolate({
            inputRange: [0, 0.12, 1],
            outputRange: [0, 0.5, 0],
          }),
          transform: [
            {
              scale: wave.interpolate({
                inputRange: [0, 1],
                outputRange: [0.7, 2.1],
              }),
            },
          ],
        },
      ]}
    />
  );
}

function WavesScene({ colors, active }: SceneProps) {
  const rings = [0, 1, 2, 3];
  return (
    <>
      {rings.map(index => (
        <Ring
          key={index}
          active={active}
          color={colors[0]}
          count={rings.length}
          index={index}
        />
      ))}
    </>
  );
}

function Ember({
  color,
  left,
  size,
  duration,
  delay,
  active,
}: {
  color: string;
  left: number;
  size: number;
  duration: number;
  delay: number;
  active: boolean;
}) {
  const { width, height } = useWindowDimensions();
  const rise = useLoop(active, duration, { delay });

  return (
    <Animated.View
      style={[
        styles.absolute,
        {
          backgroundColor: color,
          borderRadius: size / 2,
          bottom: -size,
          height: size,
          left: width * left,
          width: size,
          opacity: rise.interpolate({
            inputRange: [0, 0.1, 0.7, 1],
            outputRange: [0, 0.85, 0.5, 0],
          }),
          transform: [
            {
              translateY: rise.interpolate({
                inputRange: [0, 1],
                outputRange: [0, -height * 0.95],
              }),
            },
            {
              translateX: rise.interpolate({
                inputRange: [0, 0.5, 1],
                outputRange: [0, width * 0.05, -width * 0.02],
              }),
            },
          ],
        },
      ]}
    />
  );
}

function EmbersScene({ colors, active }: SceneProps) {
  const embers = useMemo(
    () =>
      Array.from({ length: 18 }, (_, index) => ({
        color: colors[index % colors.length],
        left: ((index * 37) % 100) / 100,
        size: 3 + ((index * 5) % 5),
        duration: 7000 + ((index * 1300) % 6000),
        delay: (index * 700) % 7000,
      })),
    [colors],
  );

  return (
    <>
      {embers.map((ember, index) => (
        <Ember key={index} active={active} {...ember} />
      ))}
    </>
  );
}

function SunsetScene({ colors, background, active }: SceneProps) {
  const { width, height } = useWindowDimensions();
  const breath = useLoop(active, 8000, { reverse: true });
  const sun = width * 1.15;

  return (
    <>
      <Svg height="100%" style={StyleSheet.absoluteFill} width="100%">
        <Defs>
          <LinearGradient id="sky" x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0.35" stopColor={background} stopOpacity={1} />
            <Stop offset="1" stopColor={colors[0]} stopOpacity={0.5} />
          </LinearGradient>
        </Defs>
        <Rect fill="url(#sky)" height="100%" width="100%" />
      </Svg>
      <Animated.View
        renderToHardwareTextureAndroid
        style={[
          styles.sun,
          {
            height: sun,
            left: (width - sun) / 2,
            top: height - sun * 0.62,
            width: sun,
            transform: [
              {
                scale: breath.interpolate({
                  inputRange: [0, 1],
                  outputRange: [0.92, 1.1],
                }),
              },
            ],
          },
        ]}
      >
        <Glow color={colors[2]} id="sun" />
      </Animated.View>
    </>
  );
}

const scenes: Record<
  Exclude<PlayerSceneId, 'none'>,
  ComponentType<SceneProps>
> = {
  aurora: AuroraScene,
  cover: CoverScene,
  embers: EmbersScene,
  sunset: SunsetScene,
  waves: WavesScene,
};

export function PlayerScene({
  theme,
  artwork,
  active,
}: {
  theme: PlayerTheme;
  artwork: string | null;
  active: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const energy = useRef(new Animated.Value(active ? 1 : 0.5)).current;

  useEffect(() => {
    Animated.timing(energy, {
      toValue: active ? 1 : 0.5,
      duration: reducedMotion ? 0 : motionDuration.enter * 2,
      easing: motionEasing.enter,
      useNativeDriver: true,
    }).start();
  }, [active, energy, reducedMotion]);

  if (theme.scene === 'none') {
    return null;
  }
  const Scene = scenes[theme.scene];

  return (
    <Animated.View
      pointerEvents="none"
      style={[StyleSheet.absoluteFill, { opacity: energy }]}
    >
      <Scene
        active={active && !reducedMotion}
        artwork={artwork}
        background={theme.palette.background}
        colors={theme.sceneColors}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  absolute: { position: 'absolute' },
  sun: { opacity: 0.45, position: 'absolute' },
  coverScrim: { opacity: 0.55 },
  ring: { borderWidth: 2, position: 'absolute' },
});
