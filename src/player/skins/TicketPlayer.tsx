import { useEffect } from 'react';
import { Image, Text, useWindowDimensions, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {
  ChevronDown,
  Heart,
  MoreVertical,
  Music2,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RepeatMode } from 'react-native-track-player';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { createStyles, spacing, useColors } from '../../theme/theme';
import { IconButton } from '../../ui/Buttons';
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

const BARS = 44;

export function TicketPlayer({ covered, headerGesture, onClose }: SkinProps) {
  const kit = usePlayerKit({ covered });
  const { colors, type } = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const enter = useSharedValue(0);
  const stub = useSharedValue(0);
  const stamp = useSharedValue(1);

  // A new song tears the old stub away, slides in a new ticket and stamps it.
  useTrackChange(kit.track?.id, () => {
    if (reducedMotion) return;
    stub.value = withSequence(
      withTiming(1, { duration: 0 }),
      withDelay(
        380,
        withTiming(0, { duration: 420, easing: Easing.out(Easing.cubic) }),
      ),
    );
    enter.value = withSequence(
      withTiming(1, { duration: 0 }),
      withTiming(0, { duration: 520, easing: Easing.out(Easing.cubic) }),
    );
    stamp.value = withSequence(
      withTiming(0, { duration: 0 }),
      withDelay(
        800,
        withTiming(1, { duration: 220, easing: Easing.in(Easing.quad) }),
      ),
    );
  });
  useEffect(() => {
    stamp.value = 1;
  }, [stamp]);

  const ticket = useAnimatedStyle(() => ({
    transform: [{ translateX: enter.value * width }],
  }));
  const stubStyle = useAnimatedStyle(() => ({
    opacity: 1 - stub.value * 0.2,
    transform: [
      { translateY: stub.value * 380 },
      { rotate: `${stub.value * 14}deg` },
    ],
  }));
  const stampStyle = useAnimatedStyle(() => ({
    opacity: stamp.value > 0 ? 0.92 : 0,
    transform: [{ rotate: '-11deg' }, { scale: 2.3 - stamp.value * 1.3 }],
  }));

  if (!kit.track) return null;
  const s = colors.skin;
  const art = Math.max(120, Math.min(width * 0.46, height * 0.22));
  const printed = kit.progress * BARS;
  const seed = Number(kit.track.id) || 3;
  const RepeatIcon = kit.repeatMode === RepeatMode.Track ? Repeat1 : Repeat;

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

      <View style={styles.stage}>
        <Animated.View
          style={[styles.ticket, { backgroundColor: s.paper }, ticket]}
        >
          <View style={[styles.art, { height: art }]}>
            {kit.track.artwork ? (
              <Image
                resizeMode="cover"
                source={{ uri: kit.track.artwork }}
                style={styles.fill}
              />
            ) : (
              <Music2 color={s.ink} size={48} />
            )}
          </View>
          <View style={styles.info}>
            <Text
              accessibilityRole="header"
              numberOfLines={1}
              style={[type.headline, { color: s.ink }]}
            >
              {kit.track.title}
            </Text>
            <View style={styles.fields}>
              {[
                ['Artista', kit.track.artist],
                ['Álbum', kit.track.album],
                ['Pista', `${kit.queueIndex + 1} de ${kit.queueCount}`],
                ['Duración', formatTime(kit.duration)],
              ].map(([name, value]) => (
                <View key={name} style={styles.field}>
                  <Text style={[type.caption, { color: s.ink }]}>{name}</Text>
                  <Text
                    numberOfLines={1}
                    style={[type.bodyStrong, { color: s.ink }]}
                  >
                    {value}
                  </Text>
                </View>
              ))}
            </View>
          </View>
          <Animated.View
            pointerEvents="none"
            style={[
              styles.stamp,
              { borderColor: s.stamp, backgroundColor: s.paper },
              stampStyle,
            ]}
          >
            <Text style={[styles.stampText, { color: s.stamp }]}>ADMITIDO</Text>
          </Animated.View>
          <View style={[styles.perforation, { borderColor: s.perf }]} />
          <View style={[styles.notch, styles.notchLeft]} />
          <View style={[styles.notch, styles.notchRight]} />
        </Animated.View>
        <Animated.View
          style={[styles.stub, { backgroundColor: s.paper }, stubStyle]}
        >
          <SeekArea
            kit={kit}
            label="Código de barras. Toca para cambiar la posición"
            style={styles.barcode}
          >
            {Array.from({ length: BARS }, (_, index) => (
              <View
                key={index}
                style={{
                  width: 2 + ((index * 7 + seed * 3) % 4),
                  backgroundColor: index < printed ? s.ink : s.faded,
                }}
              />
            ))}
          </SeekArea>
          <View style={styles.stubTimes}>
            <Text style={[type.bodyStrong, styles.tabular, { color: s.ink }]}>
              {formatTime(kit.position)}
            </Text>
            <Text style={[type.bodyStrong, styles.tabular, { color: s.ink }]}>
              faltan {formatTime(kit.duration - kit.position)}
            </Text>
          </View>
        </Animated.View>
      </View>

      <View style={styles.transport}>
        <IconButton
          accessibilityState={{ selected: kit.shuffle }}
          disabled={!kit.ready || kit.busy}
          label={kit.shuffle ? 'Desactivar mezcla' : 'Activar mezcla'}
          onPress={kit.toggleShuffle}
        >
          <Shuffle
            color={kit.shuffle ? colors.accent : colors.text}
            size={23}
          />
        </IconButton>
        <IconButton label="Canción anterior" onPress={kit.previous}>
          <SkipBack color={colors.text} fill={colors.text} size={28} />
        </IconButton>
        <Tap
          accessibilityLabel={kit.isPlaying ? 'Pausar' : 'Reproducir'}
          accessibilityRole="button"
          disabled={!kit.ready}
          onPress={kit.toggle}
          pressedScale={0.95}
          style={[styles.play, { backgroundColor: colors.control }]}
        >
          <PlayPauseIcon
            color={colors.onControl}
            isPlaying={kit.isPlaying}
            size={30}
          />
        </Tap>
        <IconButton label="Siguiente canción" onPress={kit.next}>
          <SkipForward color={colors.text} fill={colors.text} size={28} />
        </IconButton>
        <IconButton
          accessibilityState={{ selected: kit.repeatOn }}
          disabled={!kit.ready}
          label={kit.repeatLabel}
          onPress={kit.cycleRepeat}
        >
          <RepeatIcon
            color={kit.repeatOn ? colors.accent : colors.text}
            size={23}
          />
        </IconButton>
      </View>

      <View style={styles.tools}>
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
  flex: { flex: 1 },
  stage: { flex: 1, justifyContent: 'center' },
  ticket: {
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
    overflow: 'hidden',
    paddingBottom: 18,
  },
  art: { alignItems: 'center', justifyContent: 'center', overflow: 'hidden' },
  fill: { position: 'absolute', left: 0, right: 0, top: 0, bottom: 0 },
  info: { padding: spacing.lg, gap: spacing.sm },
  fields: { flexDirection: 'row', flexWrap: 'wrap', rowGap: spacing.sm },
  field: { width: '50%', paddingRight: spacing.sm },
  stamp: {
    position: 'absolute',
    right: 18,
    top: 24,
    borderWidth: 4,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  stampText: { fontFamily: colors.design.fonts.display, fontSize: 24 },
  perforation: {
    position: 'absolute',
    left: 18,
    right: 18,
    bottom: 0,
    borderTopWidth: 3,
    borderStyle: 'dashed',
  },
  notch: {
    position: 'absolute',
    bottom: -14,
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: colors.background,
  },
  notchLeft: { left: -14 },
  notchRight: { right: -14 },
  stub: {
    borderBottomLeftRadius: 10,
    borderBottomRightRadius: 10,
    padding: spacing.lg,
    gap: spacing.sm,
  },
  barcode: {
    height: 88,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'stretch',
  },
  stubTimes: { flexDirection: 'row', justifyContent: 'space-between' },
  tabular: { fontVariant: ['tabular-nums'] },
  transport: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
  },
  play: {
    width: 104,
    height: 68,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tools: { flexDirection: 'row' },
  tool: {
    flex: 1,
    minHeight: 52,
    alignItems: 'center',
    justifyContent: 'center',
  },
}));
