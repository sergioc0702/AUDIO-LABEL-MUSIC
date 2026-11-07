import { useEffect } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useFrameCallback,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {
  ChevronDown,
  Heart,
  MoreVertical,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Path, Rect } from 'react-native-svg';
import { RepeatMode } from 'react-native-track-player';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { createStyles, spacing, useColors } from '../../theme/theme';
import { IconButton } from '../../ui/Buttons';
import { Cover } from '../../ui/Cover';
import { Tap } from '../../ui/Tap';
import { formatTime } from '../../utils/formatTime';
import { PlayPauseIcon } from '../PlayPauseIcon';
import {
  DragHeader,
  SeekArea,
  playerTools,
  useTrackChange,
  usePlayerKit,
  type SkinProps,
} from './kit';

const FULL_SPEED = 200; // degrees per second, about 33 rpm

export function TurntablePlayer({
  covered,
  headerGesture,
  onClose,
}: SkinProps) {
  const kit = usePlayerKit({ covered });
  const { colors, type } = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const platter = Math.max(220, Math.min(width - 56, height * 0.4, 380));
  const spin = useSharedValue(0);
  const speed = useSharedValue(kit.lively ? FULL_SPEED : 0);
  const needle = useSharedValue(-40);
  const arm = useSharedValue(0);
  const swap = useSharedValue(0);
  const running = useSharedValue(kit.lively);
  const clock = useSharedValue(0);
  running.value = kit.lively && !reducedMotion;

  // The platter coasts to a stop on pause instead of freezing.
  const frame = useFrameCallback(info => {
    'worklet';
    const dt = Math.min(0.05, (info.timeSincePreviousFrame ?? 16) / 1000);
    const target = running.value ? FULL_SPEED : 0;
    speed.value += (target - speed.value) * Math.min(1, dt * 1.6);
    spin.value = (spin.value + speed.value * dt) % 360;
    clock.value += dt;
    const t = clock.value * 30;
    const level = running.value
      ? -28 +
        40 * Math.abs(Math.sin(t * 0.19) * Math.sin(t * 0.043 + 1)) +
        Math.sin(t * 0.9) * 4
      : -44;
    needle.value += (level - needle.value) * Math.min(1, dt * 7);
  }, false);
  useEffect(() => {
    frame.setActive(kit.visible && !reducedMotion);
  }, [frame, kit.visible, reducedMotion]);

  useEffect(() => {
    arm.value = withTiming(kit.isPlaying ? 12 + kit.progress * 18 : 0, {
      duration: reducedMotion ? 0 : 700,
      easing: Easing.out(Easing.cubic),
    });
  }, [arm, kit.isPlaying, kit.progress, reducedMotion]);

  useTrackChange(kit.track?.id, () => {
    if (reducedMotion) return;
    swap.value = withSequence(
      withTiming(-1, { duration: 0 }),
      withTiming(0, { duration: 520, easing: Easing.out(Easing.cubic) }),
    );
  });

  const disc = useAnimatedStyle(() => ({
    transform: [
      { translateX: swap.value * width },
      { rotate: `${spin.value}deg` },
    ],
  }));
  const strobe = useAnimatedStyle(() => ({
    transform: [{ rotate: `${spin.value * 0.25}deg` }],
  }));
  const armStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${arm.value}deg` }],
  }));
  const vu = useAnimatedStyle(() => ({
    transform: [{ rotate: `${needle.value}deg` }],
  }));

  if (!kit.track) return null;
  const { mat, key, keyEdge, arm: armColor, meter, meterInk } = colors.skin;
  const RepeatIcon = kit.repeatMode === RepeatMode.Track ? Repeat1 : Repeat;
  const label = platter * 0.38;
  const k = platter / 330;

  return (
    <View
      style={[styles.player, { paddingBottom: insets.bottom + spacing.sm }]}
    >
      <DragHeader
        gesture={headerGesture}
        style={[styles.top, { paddingTop: insets.top }]}
      >
        <IconButton label="Cerrar reproductor" onPress={onClose}>
          <ChevronDown color={colors.text} size={26} />
        </IconButton>
        <Text numberOfLines={1} style={[type.secondary, styles.source]}>
          Desde {kit.sourceLabel}
        </Text>
        <IconButton
          label={`Más acciones para ${kit.track.title}`}
          onPress={kit.openMenu}
        >
          <MoreVertical color={colors.text} size={23} />
        </IconButton>
      </DragHeader>

      <View style={styles.deck}>
        <View style={{ width: platter, height: platter }}>
          <Animated.View
            style={[
              styles.fill,
              styles.mat,
              { borderRadius: platter / 2, backgroundColor: mat },
              strobe,
            ]}
          >
            <Svg height={platter} width={platter}>
              <Circle
                cx={platter / 2}
                cy={platter / 2}
                fill="none"
                r={platter / 2 - 4}
                stroke={colors.accent}
                strokeDasharray="3 9"
                strokeWidth={4}
              />
            </Svg>
          </Animated.View>
          <Animated.View style={[styles.fill, styles.center, disc]}>
            <Svg height={platter} viewBox="0 0 330 330" width={platter}>
              <Circle cx="165" cy="165" fill="#101012" r="154" />
              {[142, 128, 114, 100, 86].map(r => (
                <Circle
                  key={r}
                  cx="165"
                  cy="165"
                  fill="none"
                  r={r}
                  stroke={r % 28 === 2 ? '#2b2b30' : '#26262b'}
                  strokeWidth={1}
                />
              ))}
            </Svg>
            <View
              style={[
                styles.label,
                { width: label, height: label, borderRadius: label / 2 },
              ]}
            >
              <Cover round size={label} uri={kit.track.artwork} />
              <View style={[styles.spindle, { backgroundColor: mat }]} />
            </View>
          </Animated.View>
          <View pointerEvents="none" style={[styles.fill, styles.center]}>
            <Svg height={platter} viewBox="0 0 330 330" width={platter}>
              <Path
                d="M165 11 A154 154 0 0 1 274 56 L222 108 A80 80 0 0 0 165 85 Z"
                fill="#ffffff"
                opacity={0.06}
              />
            </Svg>
          </View>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.arm,
              {
                width: 120 * k,
                height: 280 * k,
                right: -40 * k,
                top: -18 * k,
                transformOrigin: `${80 * k}px ${30 * k}px`,
              },
              armStyle,
            ]}
          >
            <Svg height={280 * k} viewBox="0 0 120 280" width={120 * k}>
              <Path
                d="M80 30 L80 225 L70 260"
                fill="none"
                stroke={armColor}
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={7}
              />
              <Rect
                fill={armColor}
                height="28"
                rx="3"
                transform="rotate(16 70 267)"
                width="20"
                x="60"
                y="253"
              />
              <Circle cx="80" cy="30" fill={armColor} r="17" />
              <Circle cx="80" cy="30" fill={colors.background} r="6" />
            </Svg>
          </Animated.View>
        </View>
      </View>

      <View style={styles.meta}>
        <View style={styles.titles}>
          <Text
            accessibilityRole="header"
            numberOfLines={2}
            style={type.display}
          >
            {kit.track.title}
          </Text>
          <Text numberOfLines={1} style={type.secondary}>
            {kit.track.artist}
          </Text>
        </View>
        <View style={[styles.meter, { backgroundColor: meter }]}>
          <Svg height={64} viewBox="0 0 112 70" width={102}>
            <Path
              d="M12 56 A44 44 0 0 1 100 56"
              fill="none"
              stroke={meterInk}
              strokeWidth={1.5}
            />
            <Path
              d="M82 25 A44 44 0 0 1 100 56"
              fill="none"
              stroke="#c8321f"
              strokeWidth={4}
            />
          </Svg>
          <Animated.View
            style={[styles.needle, { backgroundColor: meterInk }, vu]}
          />
          <View style={[styles.hub, { backgroundColor: meterInk }]} />
        </View>
      </View>

      <SeekArea kit={kit} style={styles.seek}>
        <View style={styles.rail}>
          <View
            style={[styles.railFill, { width: `${kit.progress * 100}%` }]}
          />
        </View>
      </SeekArea>
      <View style={styles.times}>
        <Text style={[type.caption, styles.tabular]}>
          {formatTime(kit.position)}
        </Text>
        <Text style={[type.caption, styles.tabular]}>
          {formatTime(kit.duration)}
        </Text>
      </View>

      <View style={styles.keys}>
        {[
          {
            label: kit.shuffle ? 'Desactivar mezcla' : 'Activar mezcla',
            onPress: kit.toggleShuffle,
            on: kit.shuffle,
            icon: (
              <Shuffle
                color={kit.shuffle ? colors.accent : colors.text}
                size={22}
              />
            ),
          },
          {
            label: 'Canción anterior',
            onPress: kit.previous,
            on: false,
            icon: <SkipBack color={colors.text} fill={colors.text} size={26} />,
          },
          {
            label: kit.isPlaying ? 'Pausar' : 'Reproducir',
            onPress: kit.toggle,
            on: true,
            play: true,
            icon: (
              <PlayPauseIcon
                color={colors.onControl}
                isPlaying={kit.isPlaying}
                size={28}
              />
            ),
          },
          {
            label: 'Siguiente canción',
            onPress: kit.next,
            on: false,
            icon: (
              <SkipForward color={colors.text} fill={colors.text} size={26} />
            ),
          },
          {
            label: kit.repeatLabel,
            onPress: kit.cycleRepeat,
            on: kit.repeatOn,
            icon: (
              <RepeatIcon
                color={kit.repeatOn ? colors.accent : colors.text}
                size={22}
              />
            ),
          },
        ].map(item => (
          <Tap
            key={item.label}
            accessibilityLabel={item.label}
            accessibilityRole="button"
            accessibilityState={item.play ? undefined : { selected: item.on }}
            onPress={item.onPress}
            pressedScale={0.94}
            style={[
              styles.key,
              {
                backgroundColor: item.play ? colors.control : key,
                borderColor: keyEdge,
              },
            ]}
          >
            {item.icon}
          </Tap>
        ))}
      </View>

      <View style={styles.tools}>
        <IconButton
          accessibilityState={{ selected: kit.favorite }}
          label={kit.favorite ? 'Quitar de favoritas' : 'Añadir a favoritas'}
          onPress={kit.toggleFavorite}
        >
          <Heart
            color={kit.favorite ? colors.accent : colors.text}
            fill={kit.favorite ? colors.accent : 'none'}
            size={22}
          />
        </IconButton>
        {playerTools(kit).map(tool => (
          <Tap
            key={tool.key}
            accessibilityLabel={tool.label}
            accessibilityRole="button"
            onPress={tool.onPress}
            style={styles.tool}
          >
            <Text
              numberOfLines={1}
              style={[type.label, tool.active && { color: colors.accent }]}
            >
              {tool.key === 'equalizer' ? 'EQ' : tool.caption}
            </Text>
          </Tap>
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
  source: { flex: 1, textAlign: 'center' },
  deck: {
    flex: 1,
    alignItems: 'flex-start',
    justifyContent: 'center',
    minHeight: 230,
  },
  fill: { position: 'absolute', left: 0, top: 0, right: 0, bottom: 0 },
  center: { alignItems: 'center', justifyContent: 'center' },
  mat: { overflow: 'hidden', elevation: 8 },
  label: {
    position: 'absolute',
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  spindle: { position: 'absolute', width: 12, height: 12, borderRadius: 6 },
  arm: { position: 'absolute' },
  meta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.md,
  },
  titles: { flex: 1, minWidth: 0 },
  meter: {
    width: 108,
    height: 68,
    borderRadius: 6,
    overflow: 'hidden',
    alignItems: 'center',
    justifyContent: 'center',
  },
  needle: {
    position: 'absolute',
    left: 52,
    top: 18,
    width: 2.4,
    height: 46,
    transformOrigin: '1.2px 46px',
  },
  hub: {
    position: 'absolute',
    left: 48,
    top: 58,
    width: 11,
    height: 11,
    borderRadius: 6,
  },
  seek: { height: 40, justifyContent: 'center' },
  rail: {
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.outline,
    overflow: 'hidden',
  },
  railFill: { height: 6, backgroundColor: colors.accent },
  times: { flexDirection: 'row', justifyContent: 'space-between' },
  tabular: { fontVariant: ['tabular-nums'] },
  keys: { flexDirection: 'row', gap: spacing.sm, paddingVertical: spacing.md },
  key: {
    flex: 1,
    minHeight: 72,
    borderRadius: 8,
    borderBottomWidth: 4,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tools: { flexDirection: 'row', alignItems: 'center' },
  tool: {
    flex: 1,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
