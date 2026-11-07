import { useEffect, type ReactNode } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { ChevronDown, Heart, MoreVertical } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path } from 'react-native-svg';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { createStyles, spacing, useColors } from '../../theme/theme';
import { IconButton } from '../../ui/Buttons';
import { formatTime } from '../../utils/formatTime';
import {
  DragHeader,
  SeekArea,
  playerTools,
  useTrackChange,
  usePlayerKit,
  type SkinProps,
} from './kit';

const HUB = 'M0 -16v8M0 8v8M-16 0h8M8 0h8';

/** A reel hub that turns with the tape; faster while rewinding. */
function Hub({
  angle,
  size,
  x,
}: {
  angle: SharedValue<number>;
  size: number;
  x: number;
}) {
  const style = useAnimatedStyle(() => ({
    transform: [{ rotate: `${angle.value}deg` }],
  }));
  return (
    <Animated.View
      style={[
        {
          position: 'absolute',
          left: x - size / 2,
          top: 0,
          width: size,
          height: size,
        },
        style,
      ]}
    >
      <Svg height={size} viewBox="-20 -20 40 40" width={size}>
        <Circle fill="#f2efe8" r="17" />
        <Path d={HUB} stroke="#2a1a12" strokeLinecap="round" strokeWidth={4} />
      </Svg>
    </Animated.View>
  );
}

/** A Memphis shape that floats up and down behind the cassette. */
function Floating({
  children,
  style,
  period,
}: {
  children: ReactNode;
  style: object;
  period: number;
}) {
  const reducedMotion = useReducedMotion();
  const y = useSharedValue(0);
  useEffect(() => {
    if (reducedMotion) return;
    y.value = withRepeat(
      withTiming(1, { duration: period, easing: Easing.inOut(Easing.sin) }),
      -1,
      true,
    );
    return () => cancelAnimation(y);
  }, [period, reducedMotion, y]);
  const animated = useAnimatedStyle(() => ({
    transform: [{ translateY: (y.value - 0.5) * 16 }],
  }));
  return (
    <Animated.View
      pointerEvents="none"
      style={[{ position: 'absolute' }, style, animated]}
    >
      {children}
    </Animated.View>
  );
}

export function MixtapePlayer({ covered, headerGesture, onClose }: SkinProps) {
  const kit = usePlayerKit({ covered });
  const { colors, type } = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const shell = width - spacing.lg * 2;
  const k = shell / 362;
  const windowWidth = 210 * k;
  const reelSize = 34 * k;
  const left = useSharedValue(0);
  const right = useSharedValue(0);
  const wind = useSharedValue(0);
  const reveal = useSharedValue(1);
  const playing = useSharedValue(kit.lively);
  const leftPack = useSharedValue(1 - kit.progress);
  playing.value = kit.lively && !reducedMotion;
  leftPack.value = 1 - kit.progress;

  const frame = useFrameCallback(info => {
    'worklet';
    const dt = Math.min(0.05, (info.timeSincePreviousFrame ?? 16) / 1000);
    const base = playing.value ? 96 : 0;
    const boost = wind.value * 1000;
    const turn = (base + boost) * dt;
    const packLeft = 20 + leftPack.value * 34;
    const packRight = 20 + (1 - leftPack.value) * 34;
    left.value = (left.value + turn * (30 / packLeft)) % 360;
    right.value = (right.value + turn * (30 / packRight)) % 360;
  }, false);
  useEffect(() => {
    frame.setActive(kit.visible && !reducedMotion);
  }, [frame, kit.visible, reducedMotion]);

  useTrackChange(kit.track?.id, () => {
    if (reducedMotion) return;
    wind.value = withSequence(
      withTiming(1, { duration: 80 }),
      withTiming(0, { duration: 900 }),
    );
    reveal.value = withSequence(
      withTiming(0, { duration: 0 }),
      withTiming(1, { duration: 900, easing: Easing.out(Easing.quad) }),
    );
  });

  const shake = useAnimatedStyle(() => ({
    transform: [{ translateX: Math.sin(left.value * 0.7) * wind.value * 2 }],
  }));
  const writing = useAnimatedStyle(() => ({ width: `${reveal.value * 100}%` }));

  if (!kit.track) return null;
  const s = colors.skin;
  const pack = (fraction: number) => (20 + fraction * 34) * k * 2;
  const tools = playerTools(kit);
  const keyStyle = (down: boolean) => [
    styles.key,
    {
      backgroundColor: down ? s.on : s.key,
      transform: [{ translateY: down ? 5 : 0 }],
    },
  ];
  const keyInk = (down: boolean) => (down ? s.onInk : s.keyInk);
  const strip = [
    { ...tools[0], caption: 'Cola' },
    tools[1],
    {
      key: 'shuffle',
      caption: 'Mezcla',
      label: kit.shuffle ? 'Desactivar mezcla' : 'Activar mezcla',
      active: kit.shuffle,
      onPress: kit.toggleShuffle,
    },
    {
      key: 'repeat',
      caption: 'Repetir',
      label: kit.repeatLabel,
      active: kit.repeatOn,
      onPress: kit.cycleRepeat,
    },
    tools[2],
    tools[3],
    { ...tools[4], caption: 'EQ' },
  ];

  return (
    <View
      style={[
        styles.player,
        { paddingTop: insets.top, paddingBottom: insets.bottom + spacing.sm },
      ]}
    >
      <Floating period={2600} style={{ left: 90, top: insets.top + 40 }}>
        <Svg height={24} width={84}>
          <Path
            d="M2 16 q 10 -22 20 0 t 20 0 t 20 0 t 20 0"
            fill="none"
            stroke={s.m1}
            strokeLinecap="round"
            strokeWidth={6}
          />
        </Svg>
      </Floating>
      <Floating period={3200} style={{ right: 100, top: insets.top + 36 }}>
        <Svg height={36} width={40}>
          <Path d="M20 0 L 40 36 L 0 36 Z" fill={s.m2} />
        </Svg>
      </Floating>
      <Floating period={2200} style={{ right: 64, top: insets.top + 60 }}>
        <Svg height={36} width={36}>
          <Circle
            cx={18}
            cy={18}
            fill="none"
            r={13}
            stroke={s.m3}
            strokeWidth={6}
          />
        </Svg>
      </Floating>

      <DragHeader gesture={headerGesture} style={styles.top}>
        <IconButton label="Cerrar reproductor" onPress={onClose}>
          <ChevronDown color={colors.text} size={26} />
        </IconButton>
        <View style={styles.flex} />
        <IconButton
          accessibilityState={{ selected: kit.favorite }}
          label={kit.favorite ? 'Quitar de favoritas' : 'Añadir a favoritas'}
          onPress={kit.toggleFavorite}
        >
          <Heart
            color={kit.favorite ? colors.accent : colors.text}
            fill={kit.favorite ? colors.accent : 'none'}
            size={24}
          />
        </IconButton>
        <IconButton
          label={`Más acciones para ${kit.track.title}`}
          onPress={kit.openMenu}
        >
          <MoreVertical color={colors.text} size={23} />
        </IconButton>
      </DragHeader>

      <View style={styles.body}>
        <Animated.View
          style={[
            styles.shell,
            { height: 236 * k, backgroundColor: s.shell },
            shake,
          ]}
        >
          <View
            style={[
              styles.label,
              { height: 150 * k, backgroundColor: s.label },
            ]}
          >
            <View style={[styles.stripe, { backgroundColor: s.stripe }]} />
            <Animated.View style={[styles.writing, writing]}>
              <Text
                accessibilityRole="header"
                numberOfLines={1}
                style={[
                  type.headline,
                  styles.handwriting,
                  { color: s.ink, width: shell - 70 * k },
                ]}
              >
                {kit.track.title} · {kit.track.artist}
              </Text>
            </Animated.View>
            <View
              style={[
                styles.window,
                {
                  width: windowWidth,
                  height: 76 * k,
                  borderRadius: 38 * k,
                  backgroundColor: s.window,
                  left: 60 * k,
                  top: 62 * k,
                },
              ]}
            >
              <View
                style={[
                  styles.packLeft,
                  {
                    width: pack(1 - kit.progress),
                    height: pack(1 - kit.progress),
                    borderRadius: pack(1 - kit.progress) / 2,
                    left: 42 * k - pack(1 - kit.progress) / 2,
                    top: 38 * k - pack(1 - kit.progress) / 2,
                  },
                ]}
              />
              <View
                style={[
                  styles.packLeft,
                  {
                    width: pack(kit.progress),
                    height: pack(kit.progress),
                    borderRadius: pack(kit.progress) / 2,
                    left: 168 * k - pack(kit.progress) / 2,
                    top: 38 * k - pack(kit.progress) / 2,
                  },
                ]}
              />
              <View
                style={{
                  position: 'absolute',
                  top: 38 * k - reelSize / 2,
                  left: 0,
                  right: 0,
                  height: reelSize,
                }}
              >
                <Hub angle={left} size={reelSize} x={42 * k} />
                <Hub angle={right} size={reelSize} x={168 * k} />
              </View>
            </View>
            <Text style={[styles.side, { color: s.ink, top: 88 * k }]}>A</Text>
            <Text style={[styles.total, { color: s.ink, top: 92 * k }]}>
              {formatTime(kit.duration)}
            </Text>
          </View>
          <View
            style={[
              styles.edge,
              {
                backgroundColor: s.edge,
                height: 58 * k,
                left: 62 * k,
                right: 62 * k,
              },
            ]}
          />
        </Animated.View>

        <View style={styles.counterRow}>
          <Text style={[type.title, { color: colors.textSecondary }]}>
            Pista {kit.queueIndex + 1} de {kit.queueCount}
          </Text>
          <Text
            accessibilityLabel={`Contador de cinta ${formatTime(kit.position)}`}
            style={[
              styles.counter,
              { backgroundColor: s.counter, color: s.counterInk },
            ]}
          >
            {String(Math.floor(kit.position) % 1000).padStart(3, '0')}
          </Text>
        </View>

        <SeekArea kit={kit} style={styles.seek}>
          <View style={styles.rail}>
            <View
              style={[styles.railFill, { width: `${kit.progress * 100}%` }]}
            />
          </View>
        </SeekArea>
        <View style={styles.times}>
          <Text
            style={[
              type.bodyStrong,
              styles.tabular,
              { color: colors.textSecondary },
            ]}
          >
            {formatTime(kit.position)}
          </Text>
          <Text
            style={[
              type.bodyStrong,
              styles.tabular,
              { color: colors.textSecondary },
            ]}
          >
            quedan {formatTime(kit.duration - kit.position)}
          </Text>
        </View>
      </View>

      <View style={[styles.deck, { backgroundColor: s.deck }]}>
        <Pressable
          accessibilityLabel="Canción anterior"
          accessibilityRole="button"
          onPress={kit.previous}
          style={keyStyle(false)}
        >
          <Svg height={32} viewBox="0 0 24 24" width={32}>
            <Path d="M11 5v14L2 12zM21 5v14l-9-7z" fill={keyInk(false)} />
          </Svg>
        </Pressable>
        <Pressable
          accessibilityLabel="Reproducir"
          accessibilityRole="button"
          accessibilityState={{ selected: kit.isPlaying }}
          disabled={!kit.ready}
          onPress={() => !kit.isPlaying && kit.toggle()}
          style={keyStyle(kit.isPlaying)}
        >
          <Svg height={32} viewBox="0 0 24 24" width={32}>
            <Path d="M7 4v16l13-8z" fill={keyInk(kit.isPlaying)} />
          </Svg>
        </Pressable>
        <Pressable
          accessibilityLabel="Pausar"
          accessibilityRole="button"
          accessibilityState={{ selected: !kit.isPlaying }}
          disabled={!kit.ready}
          onPress={() => kit.isPlaying && kit.toggle()}
          style={keyStyle(!kit.isPlaying)}
        >
          <Svg height={32} viewBox="0 0 24 24" width={32}>
            <Path
              d="M6 4h4v16H6zM14 4h4v16h-4z"
              fill={keyInk(!kit.isPlaying)}
            />
          </Svg>
        </Pressable>
        <Pressable
          accessibilityLabel="Siguiente canción"
          accessibilityRole="button"
          onPress={kit.next}
          style={keyStyle(false)}
        >
          <Svg height={32} viewBox="0 0 24 24" width={32}>
            <Path d="M3 5l9 7-9 7zM13 5l9 7-9 7z" fill={keyInk(false)} />
          </Svg>
        </Pressable>
      </View>

      <View style={styles.tools}>
        {strip.map(tool => (
          <Pressable
            key={tool.key}
            accessibilityLabel={tool.label}
            accessibilityRole="button"
            accessibilityState={{ selected: tool.active }}
            onPress={tool.onPress}
            style={styles.tool}
          >
            <Text
              numberOfLines={1}
              style={[
                type.label,
                { color: tool.active ? colors.accent : colors.text },
              ]}
            >
              {tool.caption}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const useStyles = createStyles(colors => ({
  player: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.lg,
  },
  top: { flexDirection: 'row', alignItems: 'center', minHeight: 56 },
  flex: { flex: 1 },
  body: { flex: 1, justifyContent: 'center', gap: spacing.sm },
  shell: { borderRadius: 14, elevation: 10 },
  label: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 14,
    borderRadius: 6,
    overflow: 'hidden',
  },
  stripe: { position: 'absolute', left: 0, right: 0, top: 0, height: 12 },
  writing: {
    position: 'absolute',
    left: 14,
    top: 16,
    height: 44,
    overflow: 'hidden',
  },
  handwriting: { fontSize: 36 },
  window: { position: 'absolute', overflow: 'hidden' },
  packLeft: { position: 'absolute', backgroundColor: '#2a1a12' },
  side: {
    position: 'absolute',
    left: 16,
    fontSize: 26,
    fontFamily: colors.design.fonts.title,
  },
  total: {
    position: 'absolute',
    right: 12,
    fontSize: 16,
    fontFamily: colors.design.fonts.label,
  },
  edge: {
    position: 'absolute',
    bottom: 0,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  counterRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: spacing.sm,
  },
  counter: {
    fontFamily: colors.design.fonts.title,
    fontSize: 26,
    letterSpacing: 4,
    paddingHorizontal: 10,
    paddingVertical: 2,
  },
  seek: { height: 44, justifyContent: 'center' },
  rail: { height: 12, backgroundColor: colors.outline },
  railFill: { height: 12, backgroundColor: colors.accent },
  times: { flexDirection: 'row', justifyContent: 'space-between' },
  tabular: { fontVariant: ['tabular-nums'] },
  deck: {
    flexDirection: 'row',
    gap: 4,
    padding: 6,
    borderRadius: 10,
    height: 150,
    marginTop: spacing.md,
  },
  key: {
    flex: 1,
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'flex-end',
    paddingBottom: 20,
  },
  tools: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    paddingTop: spacing.sm,
  },
  tool: {
    minWidth: 48,
    minHeight: 48,
    paddingHorizontal: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
