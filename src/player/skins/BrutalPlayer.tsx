import { useEffect, useState } from 'react';
import {
  Image,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  cancelAnimation,
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withTiming,
} from 'react-native-reanimated';
import { ChevronDown, Heart } from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { createStyles, useColors } from '../../theme/theme';
import { formatTime } from '../../utils/formatTime';
import {
  DragHeader,
  SeekArea,
  playerTools,
  useTicker,
  useTrackChange,
  usePlayerKit,
  type SkinProps,
} from './kit';

const SEGMENTS = 26;
const HAMMERS = 12;
const STRIPS = 4;
const SLAM = 5;

const noise = (seed: number) => {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
};

/** Text that runs across the band in a loop, and stops when the music does. */
function Ticker({
  text,
  running,
  color,
}: {
  text: string;
  running: boolean;
  color: string;
}) {
  const styles = useStyles();
  const reducedMotion = useReducedMotion();
  const [width, setWidth] = useState(0);
  const x = useSharedValue(0);
  useEffect(() => {
    if (!running || reducedMotion || width <= 0) {
      cancelAnimation(x);
      return;
    }
    x.value = 0;
    x.value = withRepeat(
      withTiming(-width, { duration: width * 14, easing: Easing.linear }),
      -1,
    );
    return () => cancelAnimation(x);
  }, [reducedMotion, running, width, x]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateX: x.value }],
  }));
  return (
    <View style={styles.tickerBand}>
      <Animated.View style={[styles.tickerRow, style]}>
        {[0, 1].map(copy => (
          <Text
            key={copy}
            numberOfLines={1}
            onLayout={
              copy === 0
                ? event => setWidth(event.nativeEvent.layout.width)
                : undefined
            }
            style={[styles.tickerText, { color }]}
          >
            {text}
          </Text>
        ))}
      </Animated.View>
    </View>
  );
}

export function BrutalPlayer({ covered, headerGesture, onClose }: SkinProps) {
  const kit = usePlayerKit({ covered });
  const { colors, type } = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const [slam, setSlam] = useState(0);
  const beat = useTicker(kit.lively && !reducedMotion, 140);
  const coverHeight = Math.max(150, Math.min(width * 0.62, height * 0.3));
  const strip = coverHeight / STRIPS;

  useEffect(() => {
    if (slam <= 0) return;
    const timer = setTimeout(() => setSlam(value => value - 1), 70);
    return () => clearTimeout(timer);
  }, [slam]);
  useTrackChange(kit.track?.id, () => setSlam(reducedMotion ? 0 : SLAM));

  if (!kit.track) return null;
  const { hot, onHot, paper } = colors.skin;
  const flash = slam >= SLAM - 1;
  const bg = flash ? colors.text : colors.background;
  const fg = flash ? colors.background : colors.text;
  const played = kit.progress * SEGMENTS;
  const press = (action: () => void) => () => {
    if (!reducedMotion) setSlam(SLAM);
    action();
  };
  const tools = playerTools(kit);
  const cells = [
    tools[0],
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
    {
      key: 'menu',
      caption: 'Más',
      label: `Más acciones para ${kit.track.title}`,
      active: false,
      onPress: kit.openMenu,
    },
  ];

  return (
    <View
      style={[
        styles.player,
        { backgroundColor: bg, paddingBottom: insets.bottom },
      ]}
    >
      <DragHeader
        gesture={headerGesture}
        style={[styles.top, { paddingTop: insets.top, borderColor: fg }]}
      >
        <Pressable
          accessibilityLabel="Cerrar reproductor"
          accessibilityRole="button"
          onPress={onClose}
          style={[styles.topCell, { borderColor: fg }]}
        >
          <ChevronDown color={fg} size={30} strokeWidth={3.5} />
        </Pressable>
        <Text style={[type.headline, styles.clock, { color: fg }]}>
          {formatTime(kit.position)} / {formatTime(kit.duration)}
        </Text>
        <Pressable
          accessibilityLabel={
            kit.favorite ? 'Quitar de favoritas' : 'Añadir a favoritas'
          }
          accessibilityRole="button"
          accessibilityState={{ selected: kit.favorite }}
          onPress={kit.toggleFavorite}
          style={[
            styles.topCell,
            styles.topRight,
            { borderColor: fg, backgroundColor: kit.favorite ? fg : bg },
          ]}
        >
          <Heart
            color={kit.favorite ? bg : fg}
            fill={kit.favorite ? bg : 'none'}
            size={28}
            strokeWidth={3}
          />
        </Pressable>
      </DragHeader>

      <View
        style={[styles.cover, { height: coverHeight, backgroundColor: fg }]}
      >
        {Array.from({ length: STRIPS }, (_, row) => (
          <View key={row} style={[styles.strip, { height: strip }]}>
            <View
              style={{
                position: 'absolute',
                top: -row * strip,
                left: slam
                  ? Math.round((noise(row * 3 + slam) - 0.5) * 150)
                  : 0,
                width,
                height: coverHeight,
              }}
            >
              {kit.track?.artwork ? (
                <Image
                  resizeMode="cover"
                  source={{ uri: kit.track.artwork }}
                  style={{ width, height: coverHeight }}
                />
              ) : (
                <View
                  style={{ width, height: coverHeight, backgroundColor: hot }}
                >
                  <View
                    style={[
                      styles.blockCircle,
                      {
                        backgroundColor: colors.text,
                        width: coverHeight,
                        height: coverHeight,
                        borderRadius: coverHeight / 2,
                      },
                    ]}
                  />
                  <View style={[styles.blockBar, { backgroundColor: paper }]} />
                </View>
              )}
            </View>
          </View>
        ))}
        <View pointerEvents="none" style={styles.hammers}>
          {Array.from({ length: HAMMERS }, (_, index) => (
            <View
              key={index}
              style={[
                styles.hammer,
                {
                  backgroundColor: fg,
                  height: kit.lively
                    ? 14 +
                      Math.floor(noise(index * 7 + beat) * 5) *
                        (coverHeight / 9)
                    : 8,
                },
              ]}
            />
          ))}
        </View>
      </View>

      <Ticker
        color={bg}
        running={kit.lively}
        text={`${kit.track.title} / ${kit.track.artist} / `}
      />

      <View style={styles.titleBox}>
        <Text
          accessibilityRole="header"
          adjustsFontSizeToFit
          minimumFontScale={0.5}
          numberOfLines={2}
          style={[
            styles.title,
            { color: fg, transform: [{ translateY: -slam * 10 }] },
          ]}
        >
          {kit.track.title}
        </Text>
      </View>

      <SeekArea kit={kit} style={[styles.segments, { borderColor: fg }]}>
        {Array.from({ length: SEGMENTS }, (_, index) => (
          <View
            key={index}
            style={[
              styles.segment,
              { backgroundColor: index < played ? fg : bg, borderColor: bg },
            ]}
          />
        ))}
      </SeekArea>

      <View style={[styles.transport, { borderColor: fg }]}>
        <Pressable
          accessibilityLabel="Canción anterior"
          accessibilityRole="button"
          onPress={press(kit.previous)}
          style={[styles.transportCell, { borderColor: fg }]}
        >
          <Svg height={42} viewBox="0 0 24 24" width={42}>
            <Path d="M3 3h4v18H3zM21 3v18L8 12z" fill={fg} />
          </Svg>
        </Pressable>
        <Pressable
          accessibilityLabel={kit.isPlaying ? 'Pausar' : 'Reproducir'}
          accessibilityRole="button"
          disabled={!kit.ready}
          onPress={press(kit.toggle)}
          style={[styles.playCell, { backgroundColor: hot }]}
        >
          <Text style={[styles.playText, { color: onHot }]}>
            {kit.isPlaying ? 'Pausa' : 'Play'}
          </Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Siguiente canción"
          accessibilityRole="button"
          onPress={press(kit.next)}
          style={[
            styles.transportCell,
            styles.transportRight,
            { borderColor: fg },
          ]}
        >
          <Svg height={42} viewBox="0 0 24 24" width={42}>
            <Path d="M17 3h4v18h-4zM3 3l13 9-13 9z" fill={fg} />
          </Svg>
        </Pressable>
      </View>

      <View style={styles.grid}>
        {cells.map(cell => (
          <Pressable
            key={cell.key}
            accessibilityLabel={cell.label}
            accessibilityRole="button"
            accessibilityState={{ selected: cell.active }}
            onPress={cell.onPress}
            style={[
              styles.cell,
              { borderColor: fg, backgroundColor: cell.active ? fg : bg },
            ]}
          >
            <Text
              numberOfLines={1}
              style={[type.label, { color: cell.active ? bg : fg }]}
            >
              {cell.caption}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const useStyles = createStyles(colors => ({
  player: { flex: 1 },
  top: {
    flexDirection: 'row',
    alignItems: 'stretch',
    borderBottomWidth: 4,
    minHeight: 60,
  },
  topCell: {
    width: 64,
    minHeight: 56,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 4,
  },
  topRight: { borderRightWidth: 0, borderLeftWidth: 4 },
  clock: {
    flex: 1,
    textAlign: 'center',
    textAlignVertical: 'center',
    fontVariant: ['tabular-nums'],
  },
  cover: { overflow: 'hidden' },
  strip: { overflow: 'hidden' },
  blockCircle: { position: 'absolute', right: -20, top: -10 },
  blockBar: { position: 'absolute', left: 0, right: 0, bottom: 24, height: 26 },
  hammers: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 5,
    paddingHorizontal: 5,
  },
  hammer: { flex: 1 },
  tickerBand: {
    height: 46,
    overflow: 'hidden',
    backgroundColor: colors.text,
    justifyContent: 'center',
  },
  tickerRow: { flexDirection: 'row' },
  tickerText: {
    fontFamily: colors.design.fonts.display,
    fontSize: 28,
    textTransform: 'uppercase',
  },
  titleBox: {
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: 12,
    minHeight: 90,
  },
  title: {
    fontFamily: colors.design.fonts.display,
    fontSize: 80,
    lineHeight: 82,
    textTransform: 'uppercase',
  },
  segments: {
    height: 44,
    flexDirection: 'row',
    borderTopWidth: 4,
    borderBottomWidth: 4,
  },
  segment: { flex: 1, borderRightWidth: 2 },
  transport: { flexDirection: 'row', height: 96, borderBottomWidth: 4 },
  transportCell: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 4,
  },
  transportRight: { borderRightWidth: 0, borderLeftWidth: 4 },
  playCell: { flex: 2, alignItems: 'center', justifyContent: 'center' },
  playText: {
    fontFamily: colors.design.fonts.display,
    fontSize: 52,
    textTransform: 'uppercase',
  },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: {
    width: '25%',
    minHeight: 58,
    alignItems: 'center',
    justifyContent: 'center',
    borderRightWidth: 2,
    borderBottomWidth: 2,
  },
}));
