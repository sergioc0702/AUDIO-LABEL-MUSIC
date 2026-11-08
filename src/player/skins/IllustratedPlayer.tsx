import { useEffect, useRef } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  ReduceMotion,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {
  Heart,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
} from 'lucide-react-native';
import { RepeatMode } from 'react-native-track-player';
import Svg, { Circle, Ellipse, Line, Path, Rect } from 'react-native-svg';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useMediaVolume } from '../../hooks/useMediaVolume';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { IconButton } from '../../ui/Buttons';
import { createStyles, spacing, useColors } from '../../theme/theme';
import { formatTime } from '../../utils/formatTime';
import { PlayPauseIcon } from '../PlayPauseIcon';
import {
  DragHeader,
  SeekArea,
  playerTools,
  useTrackChange,
  type PlayerKit,
  type SkinProps,
} from './kit';

export type IllustratedKind =
  | 'acuario'
  | 'radio'
  | 'pixel'
  | 'acuarela'
  | 'neon';

function Loop({
  active,
  duration,
  children,
}: {
  active: boolean;
  duration: number;
  children: React.ReactNode;
}) {
  const phase = useSharedValue(0);
  useEffect(() => {
    phase.value = active
      ? withRepeat(
          withTiming(1, { duration, reduceMotion: ReduceMotion.System }),
          -1,
          true,
        )
      : withTiming(0, { duration: 700, reduceMotion: ReduceMotion.System });
  }, [active, duration, phase]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: Math.sin(phase.value * Math.PI * 2) * 5 }],
  }));
  return <Animated.View style={style}>{children}</Animated.View>;
}

function AquariumScene({ kit }: { kit: PlayerKit }) {
  const { colors } = useColors();
  const styles = useStyles();
  const s = colors.skin;
  return (
    <View style={styles.scene}>
      <Svg height="100%" width="100%" viewBox="0 0 320 270">
        <Rect fill={s.glass} height="250" rx="42" width="300" x="10" y="10" />
        <Path d="M10 182 Q80 160 160 184 T310 178 V260 H10Z" fill={s.water} />
        <Path
          d="M10 215 Q100 195 170 218 T310 210 V260 H10Z"
          fill={s.deep}
          opacity={0.55}
        />
        <Path d="M10 238 Q85 222 158 239 T310 232 V260 H10Z" fill={s.sand} />
        {[45, 72, 247, 275].map((x, i) => (
          <Path
            key={x}
            d={`M${x} 238 Q${x + (i % 2 ? 18 : -16)} 188 ${x + 4} ${
              154 + i * 9
            }`}
            fill="none"
            stroke={s.plant}
            strokeLinecap="round"
            strokeWidth={8}
          />
        ))}
        {[0, 1, 2, 3, 4, 5].map(i => (
          <Circle
            key={i}
            cx={34 + i * 47}
            cy={44 + (i % 3) * 32}
            fill="none"
            r={5 + (i % 3) * 2}
            stroke={s.bubble}
            strokeWidth={2}
            opacity={0.72}
          />
        ))}
      </Svg>
      <View pointerEvents="none" style={styles.fishLayer}>
        {(s.fish ?? '#ff8b5e,#ffd04a,#ff5c8a')
          .split(',')
          .slice(0, 3)
          .map((fish, index) => (
            <Loop
              key={`${fish}-${index}`}
              active={kit.visible}
              duration={kit.lively ? 1700 + index * 380 : 6500}
            >
              <View
                style={[
                  styles.fish,
                  { top: 88 + index * 42, left: 45 + index * 68 },
                ]}
              >
                <Svg height={34} width={54} viewBox="0 0 54 34">
                  <Path d="M13 17 0 5 3 17 0 29Z" fill={fish} />
                  <Ellipse cx={29} cy={17} fill={fish} rx={21} ry={12} />
                  <Circle cx={38} cy={13} fill={s.ink} r={2.5} />
                </Svg>
              </View>
            </Loop>
          ))}
      </View>
    </View>
  );
}

function RadioScene({ kit }: { kit: PlayerKit }) {
  const { colors } = useColors();
  const styles = useStyles();
  const s = colors.skin;
  const angle = useSharedValue(-30);
  const reduced = useReducedMotion();
  const last = useRef(kit.track?.id);
  useEffect(() => {
    if (kit.track?.id && last.current && kit.track.id !== last.current) {
      angle.value = withTiming(
        reduced ? 20 : 25 + ((kit.track.id.length * 41) % 130),
        {
          duration: reduced ? 0 : 620,
          reduceMotion: ReduceMotion.System,
        },
      );
    }
    last.current = kit.track?.id;
  }, [angle, kit.track?.id, reduced]);
  const needleStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${angle.value}deg` }],
  }));
  return (
    <Pressable
      accessibilityLabel="Sintonizar siguiente canción"
      accessibilityRole="button"
      onPress={kit.next}
      style={[
        styles.scene,
        {
          backgroundColor: s.cabinet ?? colors.surfaceHigh,
          borderRadius: 24,
          padding: 16,
        },
      ]}
    >
      <View
        style={[
          styles.radioFace,
          {
            backgroundColor: s.dial ?? colors.surface,
            borderColor: s.cabinetDark ?? colors.outline,
          },
        ]}
      >
        <Svg height="100%" width="100%" viewBox="0 0 320 240">
          <Rect
            fill={s.grille ?? colors.surfaceHigh}
            height="84"
            rx="12"
            width="250"
            x="35"
            y="132"
          />
          {Array.from({ length: 8 }, (_, i) => (
            <Line
              key={i}
              stroke={s.grilleLine ?? colors.outline}
              strokeWidth={3}
              x1={48}
              x2={272}
              y1={142 + i * 9}
              y2={142 + i * 9}
            />
          ))}
          <Circle
            cx="160"
            cy="85"
            fill={s.glow ?? colors.accent}
            opacity={kit.lively ? 0.8 : 0.35}
            r="27"
          />
          <Circle
            cx="160"
            cy="85"
            fill={s.dial ?? colors.surface}
            r="20"
            stroke={s.dialInk ?? colors.text}
            strokeWidth="3"
          />
          <Line
            stroke={s.needle ?? colors.accent}
            strokeWidth="4"
            x1="45"
            x2="275"
            y1="78"
            y2="78"
          />
          <Circle cx="54" cy="78" fill={s.dialInk ?? colors.text} r="4" />
          <Circle cx="266" cy="78" fill={s.dialInk ?? colors.text} r="4" />
        </Svg>
        <Animated.View style={[styles.radioNeedle, needleStyle]} />
      </View>
      <View style={styles.radioKnobs}>
        {[0, 1].map(i => (
          <View
            key={i}
            style={[
              styles.knob,
              {
                backgroundColor: s.knob ?? colors.surfaceHigh,
                borderColor: s.knobInk ?? colors.outline,
              },
            ]}
          />
        ))}
      </View>
      <Text style={[styles.sceneCaption, { color: colors.onAccent }]}>
        Toca el dial para sintonizar
      </Text>
    </Pressable>
  );
}

function PixelScene({ kit }: { kit: PlayerKit }) {
  const { colors } = useColors();
  const styles = useStyles();
  const reduced = useReducedMotion();
  const jump = useSharedValue(0);
  const last = useRef(kit.track?.id);
  useEffect(() => {
    if (kit.track?.id && last.current && kit.track.id !== last.current) {
      jump.value = withSequence(
        withTiming(reduced ? 0 : -38, {
          duration: reduced ? 0 : 150,
          reduceMotion: ReduceMotion.System,
        }),
        withTiming(0, {
          duration: reduced ? 0 : 350,
          reduceMotion: ReduceMotion.System,
        }),
      );
    }
    last.current = kit.track?.id;
  }, [jump, kit.track?.id, reduced]);
  const jumpStyle = useAnimatedStyle(() => ({
    transform: [{ translateY: jump.value }],
  }));
  return (
    <View
      style={[
        styles.scene,
        styles.pixelScene,
        { backgroundColor: colors.skin.screen ?? colors.surfaceHigh },
      ]}
    >
      <View style={styles.pixelBars}>
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map(n => (
          <View
            key={n}
            style={[
              styles.pixelBar,
              {
                height: 16 + ((n * 19 + (kit.track?.title.length ?? 0)) % 42),
                backgroundColor: n % 2 ? colors.skin.s1 : colors.skin.s2,
              },
            ]}
          />
        ))}
      </View>
      <Animated.View style={[styles.pixelHero, jumpStyle]}>
        <View
          style={[styles.pixelBlock, { backgroundColor: colors.skin.s2 }]}
        />
        <View
          style={[styles.pixelEyes, { backgroundColor: colors.skin.ink }]}
        />
        <View style={[styles.pixelBase, { backgroundColor: colors.skin.s1 }]} />
      </Animated.View>
      <View style={styles.pixelGround}>
        {Array.from({ length: 18 }, (_, i) => (
          <View
            key={i}
            style={[
              styles.pixelTile,
              { backgroundColor: i % 2 ? colors.skin.s2 : colors.skin.s1 },
            ]}
          />
        ))}
      </View>
      {!kit.isPlaying ? (
        <Text style={[styles.pauseStamp, { color: colors.skin.ink }]}>
          PAUSA
        </Text>
      ) : null}
    </View>
  );
}

function WatercolorScene({ kit }: { kit: PlayerKit }) {
  const { colors } = useColors();
  const styles = useStyles();
  const reduced = useReducedMotion();
  const drop = useSharedValue(0);
  useTrackChange(kit.track?.id, () => {
    drop.value = withSequence(
      withTiming(reduced ? 0 : 1, {
        duration: reduced ? 0 : 220,
        reduceMotion: ReduceMotion.System,
      }),
      withTiming(0, {
        duration: reduced ? 0 : 520,
        reduceMotion: ReduceMotion.System,
      }),
    );
  });
  const dropStyle = useAnimatedStyle(() => ({
    opacity: 0.15 + drop.value * 0.45,
    transform: [{ scale: 0.85 + drop.value * 0.35 }],
  }));
  const blobs = (colors.skin.blobs ?? '#d4b7d9,#e5a89b,#a7c8ae').split(',');
  return (
    <View
      style={[
        styles.scene,
        styles.waterScene,
        { backgroundColor: colors.skin.paper2 ?? colors.surfaceHigh },
      ]}
    >
      <Svg height="100%" width="100%" viewBox="0 0 320 270">
        <Circle
          cx="92"
          cy="110"
          fill={blobs[0]}
          opacity={kit.lively ? 0.64 : 0.82}
          r="66"
        />
        <Circle
          cx="205"
          cy="96"
          fill={blobs[1]}
          opacity={kit.lively ? 0.56 : 0.76}
          r="60"
        />
        <Circle
          cx="165"
          cy="178"
          fill={blobs[2]}
          opacity={kit.lively ? 0.62 : 0.8}
          r="74"
        />
        <Path
          d="M52 215 Q150 178 264 214"
          fill="none"
          stroke={colors.skin.accent}
          strokeLinecap="round"
          strokeWidth="5"
          opacity={0.65}
        />
      </Svg>
      <Animated.View
        style={[
          styles.waterDrop,
          dropStyle,
          { backgroundColor: colors.skin.accent },
        ]}
      />
    </View>
  );
}

function NeonScene({ kit }: { kit: PlayerKit }) {
  const { colors } = useColors();
  const styles = useStyles();
  const volume = useMediaVolume(kit.visible);
  const reduced = useReducedMotion();
  const flicker = useSharedValue(1);
  useTrackChange(kit.track?.id, () => {
    flicker.value = withSequence(
      withTiming(reduced ? 1 : 0.15, {
        duration: reduced ? 0 : 90,
        reduceMotion: ReduceMotion.System,
      }),
      withTiming(1, {
        duration: reduced ? 0 : 260,
        reduceMotion: ReduceMotion.System,
      }),
    );
  });
  const flickerStyle = useAnimatedStyle(() => ({ opacity: flicker.value }));
  const sliderWidth = useSharedValue(1);
  const sendVolume = (x: number) =>
    volume.change(Math.max(0, Math.min(1, x / sliderWidth.value)));
  const textColor = colors.skin.tubeA ?? colors.accent;
  return (
    <View
      style={[
        styles.scene,
        styles.neonScene,
        {
          backgroundColor: colors.skin.wall ?? colors.background,
          borderColor: colors.skin.mortar ?? colors.outline,
        },
      ]}
    >
      <View
        style={[
          styles.neonSignFrame,
          { borderColor: colors.skin.tubeB ?? colors.accent },
        ]}
      >
        <Animated.View style={flickerStyle}>
          <Text
            numberOfLines={2}
            style={[
              styles.neonTitle,
              {
                color: textColor,
                textShadowColor: textColor,
                opacity: kit.isPlaying ? 0.62 + volume.level * 0.38 : 0.32,
              },
            ]}
          >
            {kit.track?.title}
          </Text>
          <Text
            numberOfLines={1}
            style={[
              styles.neonArtist,
              { color: colors.skin.tubeB ?? colors.accent },
            ]}
          >
            {kit.track?.artist}
          </Text>
        </Animated.View>
      </View>
      <View style={styles.volumeRow}>
        <Text style={[styles.volumeLabel, { color: colors.textSecondary }]}>
          Volumen real
        </Text>
        <Pressable
          accessibilityActions={[
            { name: 'increment', label: 'Subir volumen' },
            { name: 'decrement', label: 'Bajar volumen' },
          ]}
          accessibilityLabel="Volumen del teléfono"
          accessibilityRole="adjustable"
          accessibilityValue={{
            min: 0,
            max: 100,
            now: Math.round(volume.level * 100),
          }}
          disabled={volume.fixed}
          onLayout={event => {
            sliderWidth.value = event.nativeEvent.layout.width;
          }}
          onAccessibilityAction={event =>
            volume.change(
              volume.level +
                (event.nativeEvent.actionName === 'increment' ? 0.05 : -0.05),
            )
          }
          onMoveShouldSetResponder={() => !volume.fixed}
          onResponderGrant={event => sendVolume(event.nativeEvent.locationX)}
          onResponderMove={event => sendVolume(event.nativeEvent.locationX)}
          style={[styles.volumeTrack, { backgroundColor: colors.surfaceHigh }]}
        >
          <View style={styles.volumeBar}>
            <View
              style={[
                styles.volumeFill,
                {
                  backgroundColor: textColor,
                  width: `${Math.round(volume.level * 100)}%`,
                },
              ]}
            />
          </View>
        </Pressable>
        <Text style={[styles.volumePercent, { color: colors.textSecondary }]}>
          {Math.round(volume.level * 100)}%
        </Text>
      </View>
    </View>
  );
}

function Scene({ kind, kit }: { kind: IllustratedKind; kit: PlayerKit }) {
  if (kind === 'acuario') return <AquariumScene kit={kit} />;
  if (kind === 'radio') return <RadioScene kit={kit} />;
  if (kind === 'pixel') return <PixelScene kit={kit} />;
  if (kind === 'acuarela') return <WatercolorScene kit={kit} />;
  return <NeonScene kit={kit} />;
}

export function IllustratedPlayer({
  kind,
  kit,
  tools,
  headerGesture,
  onClose,
}: SkinProps & {
  kind: IllustratedKind;
  kit: PlayerKit;
  tools: ReturnType<typeof playerTools>;
}) {
  const { colors, type } = useColors();
  const style = useStyles();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const landscape = width > height;
  if (!kit.track) return null;
  const toolRows = [
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
      caption:
        kit.repeatMode === RepeatMode.Track
          ? 'Canción'
          : kit.repeatMode === RepeatMode.Queue
          ? 'Cola'
          : 'Repetir',
      label: kit.repeatLabel,
      active: kit.repeatOn,
      onPress: kit.cycleRepeat,
    },
    tools[2],
    tools[3],
    tools[4],
    {
      key: 'menu',
      caption: 'Más',
      label: `Más acciones para ${kit.track.title}`,
      active: false,
      onPress: kit.openMenu,
    },
  ];
  const { skin } = colors;
  const playerTitle =
    kind === 'acuario'
      ? 'Pecera'
      : kind === 'radio'
      ? 'Radio de bulbos'
      : kind === 'pixel'
      ? 'Nivel de música'
      : kind === 'acuarela'
      ? 'Acuarela sonora'
      : 'Neón de bar';
  return (
    <View
      style={[
        style.player,
        { paddingTop: insets.top, paddingBottom: insets.bottom + 8 },
      ]}
    >
      <DragHeader
        gesture={headerGesture}
        style={[style.header, { backgroundColor: colors.background }]}
      >
        <IconButton label="Cerrar reproductor" onPress={onClose}>
          <Text style={[type.title, { color: colors.text }]}>⌄</Text>
        </IconButton>
        <View style={style.headerInfo}>
          <Text
            numberOfLines={1}
            style={[type.label, { color: colors.textSecondary }]}
          >
            {playerTitle}
          </Text>
          <Text
            numberOfLines={1}
            style={[type.caption, { color: colors.textSecondary }]}
          >
            {kit.sourceLabel}
          </Text>
        </View>
        <IconButton
          label={kit.favorite ? 'Quitar de favoritas' : 'Añadir a favoritas'}
          onPress={kit.toggleFavorite}
        >
          <Heart
            color={kit.favorite ? colors.accent : colors.text}
            fill={kit.favorite ? colors.accent : 'transparent'}
            size={22}
          />
        </IconButton>
      </DragHeader>

      <ScrollView
        contentContainerStyle={style.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={[style.columns, landscape && style.landscape]}>
          <View style={style.artColumn}>
            <Scene kind={kind} kit={kit} />
            <View style={style.trackInfo}>
              <View style={style.songTitles}>
                <Text
                  numberOfLines={2}
                  style={[type.headline, style.trackTitle]}
                >
                  {kit.track.title}
                </Text>
                <Text
                  numberOfLines={1}
                  style={[type.body, { color: colors.textSecondary }]}
                >
                  {kit.track.artist}
                </Text>
                {kit.track.album ? (
                  <Text
                    numberOfLines={1}
                    style={[type.caption, { color: colors.textSecondary }]}
                  >
                    {kit.track.album}
                  </Text>
                ) : null}
              </View>
              <IconButton
                label={
                  kit.favorite ? 'Quitar de favoritas' : 'Añadir a favoritas'
                }
                onPress={kit.toggleFavorite}
              >
                <Heart
                  color={kit.favorite ? colors.accent : colors.textSecondary}
                  fill={kit.favorite ? colors.accent : 'transparent'}
                  size={24}
                />
              </IconButton>
            </View>
            <SeekArea kit={kit} style={style.seekTouch}>
              {kind === 'pixel' ? (
                <View style={style.expBars}>
                  {Array.from({ length: 24 }, (_, i) => (
                    <View
                      key={i}
                      style={{
                        flex: 1,
                        backgroundColor:
                          i / 24 < kit.progress
                            ? colors.accent
                            : colors.surfaceHigh,
                        marginRight: 2,
                      }}
                    />
                  ))}
                </View>
              ) : (
                <View
                  style={[
                    style.seekLine,
                    { backgroundColor: colors.surfaceHigh },
                  ]}
                >
                  <View
                    style={[
                      style.seekFill,
                      {
                        width: `${kit.progress * 100}%`,
                        backgroundColor:
                          kind === 'acuarela' ? skin.accent : colors.accent,
                      },
                    ]}
                  />
                  <View
                    style={[
                      style.seekDot,
                      {
                        left: `${kit.progress * 100}%`,
                        backgroundColor: colors.accent,
                        borderColor: colors.background,
                      },
                    ]}
                  />
                </View>
              )}
            </SeekArea>
            <View style={style.times}>
              <Text style={[type.caption, { color: colors.textSecondary }]}>
                {formatTime(kit.position)}
              </Text>
              <Text style={[type.caption, { color: colors.textSecondary }]}>
                {formatTime(kit.duration)}
              </Text>
            </View>
          </View>

          <View style={style.controlsColumn}>
            <View style={style.transport}>
              <IconButton
                label="Canción anterior"
                disabled={!kit.ready || kit.busy}
                onPress={kit.previous}
              >
                <SkipBack color={colors.text} fill={colors.text} size={24} />
              </IconButton>
              <Pressable
                accessibilityLabel={kit.isPlaying ? 'Pausar' : 'Reproducir'}
                accessibilityRole="button"
                disabled={!kit.ready}
                onPress={kit.toggle}
                style={[style.playButton, { backgroundColor: colors.control }]}
              >
                <PlayPauseIcon
                  color={colors.onControl}
                  isPlaying={kit.isPlaying}
                  size={32}
                />
              </Pressable>
              <IconButton
                label="Canción siguiente"
                disabled={!kit.ready || kit.busy}
                onPress={kit.next}
              >
                <SkipForward color={colors.text} fill={colors.text} size={24} />
              </IconButton>
            </View>
            <View style={style.stateRow}>
              <IconButton
                label={kit.shuffle ? 'Desactivar mezcla' : 'Activar mezcla'}
                onPress={kit.toggleShuffle}
              >
                <Shuffle
                  color={kit.shuffle ? colors.accent : colors.textSecondary}
                  size={22}
                />
              </IconButton>
              <IconButton label={kit.repeatLabel} onPress={kit.cycleRepeat}>
                {kit.repeatMode === RepeatMode.Track ? (
                  <Repeat1 color={colors.accent} size={22} />
                ) : (
                  <Repeat
                    color={kit.repeatOn ? colors.accent : colors.textSecondary}
                    size={22}
                  />
                )}
              </IconButton>
              <Text style={[type.caption, { color: colors.textSecondary }]}>
                {kit.queueIndex + 1} / {kit.queueCount}
              </Text>
            </View>
            <View style={style.toolsGrid}>
              {toolRows.map(item => (
                <Pressable
                  key={item.key}
                  accessibilityLabel={item.label}
                  accessibilityRole="button"
                  accessibilityState={{ selected: item.active }}
                  onPress={item.onPress}
                  style={[
                    style.tool,
                    {
                      backgroundColor: item.active
                        ? colors.accent
                        : colors.surfaceHigh,
                    },
                  ]}
                >
                  <Text
                    numberOfLines={1}
                    style={[
                      type.label,
                      style.toolText,
                      { color: item.active ? colors.onAccent : colors.text },
                    ]}
                  >
                    {item.caption}
                  </Text>
                </Pressable>
              ))}
            </View>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const useStyles = createStyles(colors => ({
  player: { backgroundColor: colors.background, flex: 1 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    minHeight: 56,
    paddingHorizontal: spacing.xs,
  },
  headerInfo: { alignItems: 'center', flex: 1, minWidth: 0 },
  content: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingBottom: spacing.md,
    paddingHorizontal: spacing.lg,
  },
  columns: { gap: spacing.md },
  landscape: { flexDirection: 'row', alignItems: 'center' },
  artColumn: { flex: 1, minWidth: 0 },
  controlsColumn: { flex: 1, justifyContent: 'center', minWidth: 0 },
  scene: {
    alignSelf: 'center',
    aspectRatio: 1.16,
    borderRadius: colors.design.radius.lg,
    maxHeight: 300,
    overflow: 'hidden',
    width: '100%',
  },
  fishLayer: { ...StyleSheet.absoluteFill },
  fish: { position: 'absolute' },
  radioFace: { borderRadius: 18, borderWidth: 4, flex: 1, overflow: 'hidden' },
  radioNeedle: {
    backgroundColor: colors.skin.needle ?? colors.accent,
    height: 4,
    left: '50%',
    position: 'absolute',
    top: '32%',
    transform: [{ translateX: -2 }],
    width: '36%',
  },
  radioKnobs: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
    justifyContent: 'center',
    paddingTop: 10,
  },
  knob: { borderRadius: 20, borderWidth: 2, height: 32, width: 32 },
  sceneCaption: { fontSize: 12, paddingTop: 8, textAlign: 'center' },
  pixelScene: { justifyContent: 'flex-end', paddingBottom: 18 },
  pixelBars: {
    alignItems: 'flex-end',
    bottom: 58,
    flexDirection: 'row',
    gap: 5,
    justifyContent: 'center',
    left: 0,
    opacity: 0.45,
    position: 'absolute',
    right: 0,
  },
  pixelBar: { width: 10 },
  pixelHero: {
    alignItems: 'center',
    alignSelf: 'center',
    marginBottom: 5,
    width: 58,
  },
  pixelBlock: { height: 34, width: 44 },
  pixelEyes: { height: 4, marginTop: -24, width: 20 },
  pixelBase: { height: 18, marginTop: 8, width: 58 },
  pixelGround: { flexDirection: 'row', height: 12 },
  pixelTile: { flex: 1, height: 12 },
  pauseStamp: {
    fontSize: 18,
    left: 0,
    position: 'absolute',
    right: 0,
    textAlign: 'center',
    top: 18,
  },
  waterScene: { alignItems: 'center', justifyContent: 'center' },
  waterDrop: {
    borderRadius: 16,
    height: 32,
    position: 'absolute',
    right: '25%',
    top: '24%',
    width: 32,
  },
  neonScene: {
    alignItems: 'center',
    borderWidth: 5,
    justifyContent: 'center',
    padding: spacing.md,
  },
  neonSignFrame: {
    alignItems: 'center',
    borderRadius: 14,
    borderWidth: 3,
    justifyContent: 'center',
    minHeight: 130,
    padding: spacing.md,
    width: '100%',
  },
  neonTitle: {
    fontSize: 27,
    fontWeight: '800',
    textAlign: 'center',
    textShadowRadius: 14,
  },
  neonArtist: { fontSize: 17, marginTop: 8, textAlign: 'center' },
  volumeRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
    marginTop: 14,
    width: '100%',
  },
  volumeLabel: { fontSize: 11 },
  volumeTrack: {
    alignItems: 'center',
    borderRadius: 99,
    flex: 1,
    height: 48,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  volumeBar: {
    borderRadius: 99,
    height: 12,
    overflow: 'hidden',
    width: '100%',
  },
  volumeFill: { height: 12 },
  volumePercent: { fontSize: 11, minWidth: 32, textAlign: 'right' },
  trackInfo: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.xs,
    paddingTop: spacing.sm,
  },
  songTitles: { flex: 1, minWidth: 0 },
  trackTitle: { color: colors.text, fontSize: 21 },
  seekTouch: { height: 44, justifyContent: 'center' },
  seekLine: { borderRadius: 8, height: 8, position: 'relative', width: '100%' },
  seekFill: {
    borderRadius: 8,
    height: 8,
    left: 0,
    position: 'absolute',
    top: 0,
  },
  seekDot: {
    borderRadius: 10,
    borderWidth: 2,
    height: 16,
    marginLeft: -8,
    position: 'absolute',
    top: -4,
    width: 16,
  },
  expBars: { flexDirection: 'row', height: 18, width: '100%' },
  times: { flexDirection: 'row', justifyContent: 'space-between' },
  transport: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  playButton: {
    alignItems: 'center',
    borderRadius: 36,
    height: 72,
    justifyContent: 'center',
    marginHorizontal: spacing.md,
    width: 72,
  },
  stateRow: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-evenly',
    minHeight: 48,
  },
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.xs,
    justifyContent: 'center',
    paddingTop: spacing.xs,
  },
  tool: {
    alignItems: 'center',
    borderRadius: colors.design.radius.full,
    height: 48,
    justifyContent: 'center',
    minWidth: '22%',
    paddingHorizontal: 10,
  },
  toolText: { fontSize: 12 },
}));
