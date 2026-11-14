import { memo, useEffect, useRef, useState, type ReactNode } from 'react';
import { AppState, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  type SharedValue,
} from 'react-native-reanimated';
import Svg, { Circle, Ellipse, G, Path, Rect } from 'react-native-svg';
import { useReducedMotion } from '../../hooks/useReducedMotion';

import type { DogMood } from './dogMood';

export type { DogMood };

type Pose = {
  bounce: number;
  bob: number;
  bobHz: number;
  tail: number;
  tailHz: number;
  tailBase: number;
  ear: number;
  flap: number;
  tilt: number;
  sway: number;
  drop: number;
  joy: number;
  lid: number;
  lookX: number;
  lookY: number;
  brow: number;
  smile: number;
  mouth: number;
  tongue: number;
  tear: number;
  sweat: number;
  hearts: number;
  paws: number;
  jitter: number;
  blush: number;
  bubble: number;
};

/** One pose per mood; the dog eases from one to the next. */
const POSES: Record<DogMood, Pose> = {
  triste: {
    bounce: 0,
    bob: 1.2,
    bobHz: 0.32,
    tail: 2,
    tailHz: 0.5,
    tailBase: 18,
    ear: 4,
    flap: 0,
    tilt: -5,
    sway: 0,
    drop: 15,
    joy: 0,
    lid: 1,
    lookX: 0,
    lookY: 6,
    brow: 20,
    smile: -1,
    mouth: 0,
    tongue: 0,
    tear: 1,
    sweat: 0,
    hearts: 0,
    paws: 0,
    jitter: 0,
    blush: 0.2,
    bubble: 1,
  },
  ansioso: {
    bounce: 0,
    bob: 1.6,
    bobHz: 3.2,
    tail: 7,
    tailHz: 4.5,
    tailBase: 0,
    ear: -3,
    flap: 3,
    tilt: 7,
    sway: 0,
    drop: 3,
    joy: 0,
    lid: 0.42,
    lookX: 4,
    lookY: 7,
    brow: 15,
    smile: -0.35,
    mouth: 0.34,
    tongue: 0,
    tear: 0,
    sweat: 1,
    hearts: 0,
    paws: 1,
    jitter: 1.1,
    blush: 0.45,
    bubble: 1,
  },
  tranquilo: {
    bounce: 0,
    bob: 3,
    bobHz: 1.1,
    tail: 16,
    tailHz: 1.8,
    tailBase: 0,
    ear: 0,
    flap: 1.2,
    tilt: 0,
    sway: 3,
    drop: 0,
    joy: 0,
    lid: 0,
    lookX: 0,
    lookY: 0,
    brow: 0,
    smile: 0.6,
    mouth: 0,
    tongue: 0,
    tear: 0,
    sweat: 0,
    hearts: 0,
    paws: 0,
    jitter: 0,
    blush: 0.55,
    bubble: 0,
  },
  feliz: {
    bounce: 22,
    bob: 0,
    bobHz: 1.75,
    tail: 32,
    tailHz: 6,
    tailBase: 0,
    ear: -10,
    flap: 9,
    tilt: 0,
    sway: 5,
    drop: -2,
    joy: 1,
    lid: 0,
    lookX: 0,
    lookY: 0,
    brow: -6,
    smile: 1,
    mouth: 1,
    tongue: 1,
    tear: 0,
    sweat: 0,
    hearts: 1,
    paws: 0,
    jitter: 0,
    blush: 0.9,
    bubble: 1,
  },
};

const SAYS: Partial<Record<DogMood, string>> = {
  triste: '¿Y la música?',
  ansioso: '¡Súbele!',
  feliz: '¡Guau, guau!',
};

const DESCRIBES: Record<DogMood, string> = {
  triste: 'El perrito está triste porque la música está en pausa',
  ansioso: 'El perrito pide que subas el volumen',
  tranquilo: 'El perrito mueve la cabeza con la música',
  feliz: 'El perrito salta de felicidad con el volumen alto',
};

const FUR = '#fff6ea';
const SHADE = '#e8d3bd';
const GOLD = '#dca566';
const GOLD_DARK = '#b57d42';
const LINE = '#6e4a3a';
const BLUSH = '#ff9fb2';
const VIEW = '-14 -30 328 328';
const EAR =
  'M70 74 C 40 82 24 120 28 160 C 30 184 26 198 36 210 Q 46 200 54 212 Q 64 200 74 208 C 82 176 88 122 86 96 C 85 82 80 72 70 74 Z';
const EAR_FUR = 'M50 112 C 44 136 44 164 50 190 M68 106 C 64 134 62 164 62 192';
const DROP = 'M0 -13 C 6 -4 10 1 10 6 A10 10 0 0 1 -10 6 C -10 1 -6 -4 0 -13 Z';
const HEART =
  'M0 8 C -12 -2 -10 -13 -3 -13 C 0 -13 0 -9 0 -9 C 0 -9 0 -13 3 -13 C 10 -13 12 -2 0 8 Z';
const HEARTS = [
  { x: 6, offset: 0, speed: 0.42 },
  { x: 296, offset: 0.27, speed: 0.36 },
  { x: 26, offset: 0.55, speed: 0.48 },
  { x: 276, offset: 0.8, speed: 0.4 },
];

const AnimatedPath = Animated.createAnimatedComponent(Path);

/** Tears, sweat and hearts: each one travels and fades on its own loop. */
function Falling({
  pose,
  time,
  field,
  offset,
  speed,
  travel,
  start = 0,
  grow = false,
  origin,
  k,
  children,
}: {
  pose: SharedValue<Pose>;
  time: SharedValue<number>;
  field: 'tear' | 'sweat' | 'hearts';
  offset: number;
  speed: number;
  travel: number;
  start?: number;
  grow?: boolean;
  origin?: string;
  k: number;
  children: ReactNode;
}) {
  const style = useAnimatedStyle(() => {
    const cycle = (time.value * speed + offset) % 1;
    return {
      opacity: pose.value[field] * Math.sin(cycle * Math.PI),
      transform: [
        { translateY: (start + cycle * travel) * k },
        { scale: grow ? 0.7 + cycle * 0.7 : 1 },
      ],
    };
  });
  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFill,
        origin ? { transformOrigin: origin } : null,
        style,
      ]}
    >
      {children}
    </Animated.View>
  );
}

/** A full-size drawing layer; every layer shares the same coordinates. */
function Art({ size, children }: { size: number; children: ReactNode }) {
  return (
    <Svg height={size} viewBox={VIEW} width={size}>
      {children}
    </Svg>
  );
}

export const ShihTzu = memo(function ShihTzuView({
  mood,
  size,
  bow,
  active,
  quiet = false,
}: {
  mood: DogMood;
  size: number;
  bow: string;
  /** Moves only while true; otherwise it holds the pose of its mood. */
  active: boolean;
  quiet?: boolean;
}) {
  const reducedMotion = useReducedMotion();
  const [appState, setAppState] = useState(AppState.currentState);
  const k = size / 328;
  const at = (x: number, y: number) => `${(x + 14) * k}px ${(y + 30) * k}px`;
  const pose = useSharedValue<Pose>(POSES[mood]);
  const goal = useSharedValue<Pose>(POSES[mood]);
  const transitioning = useSharedValue(false);
  const time = useSharedValue(0.15);
  const bob = useSharedValue(0);
  const wag = useSharedValue(0);
  const said = useRef(SAYS[mood] ?? SAYS.feliz ?? '');
  if (SAYS[mood]) said.current = SAYS[mood] ?? said.current;
  const previousMood = useRef(mood);
  const moving =
    active && !reducedMotion && (appState === 'active' || appState === null);

  const frame = useFrameCallback(info => {
    'worklet';
    const dt = Math.min(0.05, (info.timeSincePreviousFrame ?? 16) / 1000);
    if (transitioning.value) {
      const ease = 1 - Math.pow(0.87, dt * 30);
      const from = pose.value;
      const to = goal.value;
      const next = { ...from };
      let unsettled = false;
      for (const key in to) {
        const name = key as keyof Pose;
        next[name] = from[name] + (to[name] - from[name]) * ease;
        if (Math.abs(to[name] - next[name]) > 0.01) unsettled = true;
      }
      pose.value = unsettled ? next : to;
      transitioning.value = unsettled;
    }
    const current = pose.value;
    time.value += dt;
    bob.value += current.bobHz * dt * Math.PI * 2;
    wag.value += current.tailHz * dt * Math.PI * 2;
  }, false);

  useEffect(() => {
    const subscription = AppState.addEventListener('change', setAppState);
    return () => subscription.remove();
  }, []);

  useEffect(() => {
    const changed = previousMood.current !== mood;
    previousMood.current = mood;
    goal.value = POSES[mood];
    transitioning.value = moving && changed;
    if (!moving) {
      pose.value = POSES[mood];
      frame.setActive(false);
      return;
    }
    // Every mood keeps moving, the sad one too: it breathes and its tears fall.
    frame.setActive(true);
  }, [frame, goal, mood, moving, pose, transitioning]);

  const root = useAnimatedStyle(() => {
    const v = pose.value;
    const hop = Math.abs(Math.sin(bob.value));
    const landing = Math.pow(1 - hop, 4) * (v.bounce / 22);
    return {
      transform: [
        { translateX: Math.sin(time.value * 31) * v.jitter * k },
        { translateY: -hop * v.bounce * k },
        { scaleX: 1 + landing * 0.07 },
        { scaleY: 1 - landing * 0.09 + Math.sin(bob.value) * 0.006 },
      ],
    };
  });
  const shadow = useAnimatedStyle(() => {
    const hop = Math.abs(Math.sin(bob.value));
    return {
      transform: [{ scaleX: 1 - (hop * (pose.value.bounce / 22) * 26) / 96 }],
    };
  });
  const tail = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${
          pose.value.tailBase + Math.sin(wag.value) * pose.value.tail
        }deg`,
      },
    ],
  }));
  const pawLeft = useAnimatedStyle(() => ({
    transform: [
      {
        translateY:
          -Math.max(0, Math.sin(time.value * 14)) * 9 * pose.value.paws * k,
      },
    ],
  }));
  const pawRight = useAnimatedStyle(() => ({
    transform: [
      {
        translateY:
          -Math.max(0, -Math.sin(time.value * 14)) * 9 * pose.value.paws * k,
      },
    ],
  }));
  const head = useAnimatedStyle(() => {
    const v = pose.value;
    return {
      transform: [
        { translateY: (v.drop + Math.sin(bob.value) * v.bob) * k },
        { rotate: `${v.tilt + Math.sin(bob.value) * v.sway}deg` },
      ],
    };
  });
  const knot = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${Math.sin(wag.value * 0.5) * (2 + pose.value.flap * 0.7)}deg`,
      },
    ],
  }));
  const blush = useAnimatedStyle(() => ({ opacity: pose.value.blush }));
  const openEyes = useAnimatedStyle(() => ({ opacity: 1 - pose.value.joy }));
  const blink = useAnimatedStyle(() => ({
    transform: [
      {
        scaleY:
          (time.value % 3.7 < 0.13 ? 0.08 : 1) * (1 + pose.value.lid * 0.08),
      },
    ],
  }));
  const look = useAnimatedStyle(() => ({
    transform: [
      {
        translateX:
          pose.value.lookX * (0.55 + 0.45 * Math.sin(time.value * 2.4)) * k,
      },
      { translateY: pose.value.lookY * k },
    ],
  }));
  const lids = useAnimatedStyle(() => ({
    opacity: Math.min(1, pose.value.lid * 4),
    transform: [{ translateY: pose.value.lid * 10 * k }],
  }));
  const joy = useAnimatedStyle(() => ({ opacity: pose.value.joy }));
  const browLeft = useAnimatedStyle(() => ({
    transform: [{ rotate: `${-pose.value.brow}deg` }],
  }));
  const browRight = useAnimatedStyle(() => ({
    transform: [{ rotate: `${pose.value.brow}deg` }],
  }));
  const open = useAnimatedStyle(() => {
    const wobble = pose.value.mouth * (0.72 + 0.28 * Math.sin(time.value * 17));
    return {
      transform: [
        { scaleX: Math.max(0.001, Math.min(1, wobble * 1.5)) },
        { scaleY: Math.max(0.001, wobble) },
      ],
    };
  });
  const tongue = useAnimatedStyle(() => ({
    transform: [
      { translateY: pose.value.tongue * 8 * k },
      { scaleY: Math.max(0.001, pose.value.tongue) },
    ],
  }));
  const mouthLeft = useAnimatedProps(() => {
    const s = pose.value.smile;
    return { d: `M124 ${170 - s * 5} Q137 ${172 + s * 13} 150 170` };
  });
  const mouthRight = useAnimatedProps(() => {
    const s = pose.value.smile;
    return { d: `M150 170 Q163 ${172 + s * 13} 176 ${170 - s * 5}` };
  });
  const earLeft = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${
          -pose.value.ear + Math.sin(time.value * 11) * pose.value.flap
        }deg`,
      },
    ],
  }));
  const earRight = useAnimatedStyle(() => ({
    transform: [
      {
        rotate: `${
          pose.value.ear - Math.sin(time.value * 11) * pose.value.flap * 0.8
        }deg`,
      },
    ],
  }));
  const bubble = useAnimatedStyle(() => ({
    opacity: quiet ? 0 : pose.value.bubble,
  }));

  const layer = (style: object, origin?: [number, number]) => [
    StyleSheet.absoluteFill,
    origin ? { transformOrigin: at(origin[0], origin[1]) } : null,
    style,
  ];

  return (
    <View
      accessible
      accessibilityLabel={DESCRIBES[mood]}
      accessibilityRole="image"
      pointerEvents="none"
      style={{ width: size, height: size }}
    >
      <Animated.View style={layer(shadow, [150, 284])}>
        <Art size={size}>
          <Ellipse
            cx="150"
            cy="284"
            fill="#000000"
            opacity={0.1}
            rx="96"
            ry="10"
          />
        </Art>
      </Animated.View>
      <Animated.View style={layer(root, [150, 284])}>
        <Animated.View style={layer(tail, [212, 236])}>
          <Art size={size}>
            <Path
              d="M210 244 C 244 240 262 212 254 178 C 276 186 292 212 284 240 C 276 266 240 274 212 262 Z"
              fill={GOLD}
              stroke={LINE}
              strokeLinejoin="round"
              strokeWidth={3.5}
            />
            <Path
              d="M256 196 C 270 206 276 224 268 240"
              fill="none"
              stroke={GOLD_DARK}
              strokeLinecap="round"
              strokeWidth={3}
            />
          </Art>
        </Animated.View>
        <View style={StyleSheet.absoluteFill}>
          <Art size={size}>
            <Path
              d="M94 196 C 72 232 62 258 66 278 Q 82 268 94 282 Q 110 270 126 284 Q 150 272 174 284 Q 190 270 206 282 Q 218 268 234 278 C 238 258 228 232 206 196 Z"
              fill={FUR}
              stroke={LINE}
              strokeLinejoin="round"
              strokeWidth={3.5}
            />
            <Path
              d="M94 200 C 78 228 70 250 69 270 Q 84 262 96 270 C 100 244 106 222 118 204 Z"
              fill={GOLD}
            />
            <Path
              d="M206 200 C 222 228 230 250 231 270 Q 216 262 204 270 C 200 244 194 222 182 204 Z"
              fill={GOLD}
            />
          </Art>
        </View>
        <Animated.View style={layer(pawLeft)}>
          <Art size={size}>
            <Ellipse
              cx="122"
              cy="272"
              fill={FUR}
              rx="23"
              ry="15"
              stroke={LINE}
              strokeWidth={3.5}
            />
            <Path
              d="M114 268 v8 M124 267 v9 M133 268 v8"
              fill="none"
              stroke={LINE}
              strokeLinecap="round"
              strokeWidth={2.6}
            />
          </Art>
        </Animated.View>
        <Animated.View style={layer(pawRight)}>
          <Art size={size}>
            <Ellipse
              cx="178"
              cy="272"
              fill={FUR}
              rx="23"
              ry="15"
              stroke={LINE}
              strokeWidth={3.5}
            />
            <Path
              d="M169 268 v8 M178 267 v9 M188 268 v8"
              fill="none"
              stroke={LINE}
              strokeLinecap="round"
              strokeWidth={2.6}
            />
          </Art>
        </Animated.View>
        <Animated.View style={layer(head, [150, 200])}>
          <View style={StyleSheet.absoluteFill}>
            <Art size={size}>
              <Path
                d="M92 182 Q 98 232 122 220 Q 130 244 150 230 Q 170 244 178 220 Q 202 232 208 182 Z"
                fill={FUR}
                stroke={LINE}
                strokeLinejoin="round"
                strokeWidth={3.5}
              />
            </Art>
          </View>
          <Animated.View style={layer(knot, [150, 52])}>
            <Art size={size}>
              <Path
                d="M150 56 C 128 42 114 18 128 2 C 134 16 140 12 146 -2 C 150 12 156 12 164 -2 C 172 14 168 18 176 4 C 188 20 172 44 150 56 Z"
                fill={GOLD}
                stroke={LINE}
                strokeLinejoin="round"
                strokeWidth={3.5}
              />
            </Art>
          </Animated.View>
          <View style={StyleSheet.absoluteFill}>
            <Art size={size}>
              <Path
                d="M150 40 C 214 40 246 88 244 132 C 242 178 200 204 150 204 C 100 204 58 178 56 132 C 54 88 86 40 150 40 Z"
                fill={FUR}
                stroke={LINE}
                strokeWidth={3.5}
              />
              <Path
                d="M70 124 C 72 90 104 72 130 84 C 142 92 140 132 128 152 C 110 168 76 158 70 124 Z"
                fill={GOLD}
              />
              <Path
                d="M230 124 C 228 90 196 72 170 84 C 158 92 160 132 172 152 C 190 168 224 158 230 124 Z"
                fill={GOLD}
              />
            </Art>
          </View>
          <Animated.View style={layer(blush)}>
            <Art size={size}>
              <Ellipse cx="88" cy="166" fill={BLUSH} rx="17" ry="10" />
              <Ellipse cx="212" cy="166" fill={BLUSH} rx="17" ry="10" />
            </Art>
          </Animated.View>
          <Animated.View style={layer(openEyes)}>
            <Animated.View style={layer(blink, [150, 128])}>
              <Animated.View style={layer(look)}>
                <Art size={size}>
                  <Ellipse cx="110" cy="128" fill="#2a1b1b" rx="21" ry="21" />
                  <Ellipse cx="190" cy="128" fill="#2a1b1b" rx="21" ry="21" />
                  <Circle cx="102" cy="120" fill="#ffffff" r="7.5" />
                  <Circle cx="182" cy="120" fill="#ffffff" r="7.5" />
                  <Circle cx="118" cy="136" fill="#ffffff" r="3.8" />
                  <Circle cx="198" cy="136" fill="#ffffff" r="3.8" />
                </Art>
              </Animated.View>
            </Animated.View>
            <Animated.View style={layer(lids)}>
              <Art size={size}>
                <Rect
                  fill={GOLD}
                  height="24"
                  transform="rotate(-15 110 128)"
                  width="52"
                  x="84"
                  y="82"
                />
                <Rect
                  fill={GOLD}
                  height="24"
                  transform="rotate(15 190 128)"
                  width="52"
                  x="164"
                  y="82"
                />
              </Art>
            </Animated.View>
          </Animated.View>
          <Animated.View style={layer(joy)}>
            <Art size={size}>
              <G
                fill="none"
                stroke="#2a1b1b"
                strokeLinecap="round"
                strokeWidth={7.5}
              >
                <Path d="M90 136 Q 110 104 130 136" />
                <Path d="M170 136 Q 190 104 210 136" />
              </G>
            </Art>
          </Animated.View>
          <Animated.View style={layer(browLeft, [110, 90])}>
            <Art size={size}>
              <Path
                d="M92 94 Q 110 84 128 94"
                fill="none"
                stroke={FUR}
                strokeLinecap="round"
                strokeWidth={7}
              />
            </Art>
          </Animated.View>
          <Animated.View style={layer(browRight, [190, 90])}>
            <Art size={size}>
              <Path
                d="M172 94 Q 190 84 208 94"
                fill="none"
                stroke={FUR}
                strokeLinecap="round"
                strokeWidth={7}
              />
            </Art>
          </Animated.View>
          <View style={StyleSheet.absoluteFill}>
            <Art size={size}>
              <Ellipse cx="124" cy="166" fill="#ffffff" rx="32" ry="25" />
              <Ellipse cx="176" cy="166" fill="#ffffff" rx="32" ry="25" />
              <Ellipse cx="150" cy="184" fill="#ffffff" rx="24" ry="16" />
              <Path
                d="M104 176 q 6 8 16 8 M196 176 q -6 8 -16 8"
                fill="none"
                stroke={SHADE}
                strokeLinecap="round"
                strokeWidth={3}
              />
            </Art>
          </View>
          <Animated.View style={layer(open, [150, 180])}>
            <Art size={size}>
              <Ellipse cx="150" cy="180" fill="#8c3448" rx="16" ry="15" />
            </Art>
          </Animated.View>
          <Animated.View style={layer(tongue, [150, 180])}>
            <Art size={size}>
              <Ellipse cx="150" cy="180" fill="#ff8fa6" rx="10" ry="11" />
            </Art>
          </Animated.View>
          <View style={StyleSheet.absoluteFill}>
            <Art size={size}>
              <AnimatedPath
                animatedProps={mouthLeft}
                fill="none"
                stroke={LINE}
                strokeLinecap="round"
                strokeWidth={3.6}
              />
              <AnimatedPath
                animatedProps={mouthRight}
                fill="none"
                stroke={LINE}
                strokeLinecap="round"
                strokeWidth={3.6}
              />
              <Path
                d="M150 158 V 170"
                fill="none"
                stroke={LINE}
                strokeLinecap="round"
                strokeWidth={3.6}
              />
              <Path
                d="M136 142 Q 150 134 164 142 Q 166 152 150 160 Q 134 152 136 142 Z"
                fill="#33211f"
              />
              <Ellipse
                cx="144"
                cy="143"
                fill="#ffffff"
                opacity={0.75}
                rx="5"
                ry="2.6"
              />
            </Art>
          </View>
          <Animated.View style={layer(earLeft, [66, 86])}>
            <Art size={size}>
              <Path
                d={EAR}
                fill={GOLD}
                stroke={LINE}
                strokeLinejoin="round"
                strokeWidth={3.5}
              />
              <Path
                d={EAR_FUR}
                fill="none"
                stroke={GOLD_DARK}
                strokeLinecap="round"
                strokeWidth={3}
              />
            </Art>
          </Animated.View>
          <Animated.View style={layer(earRight, [234, 86])}>
            <Art size={size}>
              <G transform="translate(300 0) scale(-1 1)">
                <Path
                  d={EAR}
                  fill={GOLD}
                  stroke={LINE}
                  strokeLinejoin="round"
                  strokeWidth={3.5}
                />
                <Path
                  d={EAR_FUR}
                  fill="none"
                  stroke={GOLD_DARK}
                  strokeLinecap="round"
                  strokeWidth={3}
                />
              </G>
            </Art>
          </Animated.View>
          <View style={StyleSheet.absoluteFill}>
            <Art size={size}>
              <Path
                d="M150 54 C 130 38 108 40 110 56 C 108 72 130 74 150 58 Z"
                fill={bow}
                stroke={LINE}
                strokeLinejoin="round"
                strokeWidth={3.5}
              />
              <Path
                d="M150 54 C 170 38 192 40 190 56 C 192 72 170 74 150 58 Z"
                fill={bow}
                stroke={LINE}
                strokeLinejoin="round"
                strokeWidth={3.5}
              />
              <Circle
                cx="150"
                cy="56"
                fill={bow}
                r="8.5"
                stroke={LINE}
                strokeWidth={3.5}
              />
            </Art>
          </View>
          <Falling
            field="tear"
            k={k}
            offset={0}
            pose={pose}
            speed={0.55}
            time={time}
            travel={62}
          >
            <Art size={size}>
              <Path
                d={DROP}
                fill="#8fd6ff"
                stroke="#3f9ccc"
                strokeWidth={2}
                transform="translate(102 150) scale(0.8)"
              />
            </Art>
          </Falling>
          <Falling
            field="tear"
            k={k}
            offset={0.5}
            pose={pose}
            speed={0.55}
            time={time}
            travel={62}
          >
            <Art size={size}>
              <Path
                d={DROP}
                fill="#8fd6ff"
                stroke="#3f9ccc"
                strokeWidth={2}
                transform="translate(198 150) scale(0.65)"
              />
            </Art>
          </Falling>
          <Falling
            field="sweat"
            k={k}
            offset={0}
            pose={pose}
            speed={0.9}
            time={time}
            travel={34}
          >
            <Art size={size}>
              <Path
                d={DROP}
                fill="#8fd6ff"
                stroke="#3f9ccc"
                strokeWidth={2}
                transform="translate(244 70)"
              />
            </Art>
          </Falling>
        </Animated.View>
      </Animated.View>
      {HEARTS.map(heart => (
        <Falling
          key={heart.x}
          field="hearts"
          grow
          k={k}
          offset={heart.offset}
          origin={at(heart.x, 84)}
          pose={pose}
          speed={heart.speed}
          start={84}
          time={time}
          travel={-104}
        >
          <Art size={size}>
            <Path
              d={HEART}
              fill={bow}
              stroke={LINE}
              strokeWidth={2.6}
              transform={`translate(${heart.x} 0)`}
            />
          </Art>
        </Falling>
      ))}
      {quiet ? null : (
        <Animated.View style={layer(bubble)}>
          <Art size={size}>
            <Rect
              fill="#ffffff"
              height="40"
              rx="18"
              stroke={LINE}
              strokeWidth={3}
              width="134"
              x="-10"
              y="-26"
            />
            <Path
              d="M84 12 L 100 34 L 104 12"
              fill="#ffffff"
              stroke={LINE}
              strokeLinejoin="round"
              strokeWidth={3}
            />
            <Rect fill="#ffffff" height="5" width="24" x="82" y="8" />
          </Art>
          <Text
            numberOfLines={1}
            style={[
              styles.say,
              {
                left: 4 * k,
                top: 4 * k,
                width: 134 * k,
                height: 40 * k,
                fontSize: 19 * k,
                lineHeight: 40 * k,
              },
            ]}
          >
            {said.current}
          </Text>
        </Animated.View>
      )}
    </View>
  );
});

const styles = StyleSheet.create({
  say: {
    color: LINE,
    fontFamily: 'Fredoka-Bold',
    position: 'absolute',
    textAlign: 'center',
  },
});
