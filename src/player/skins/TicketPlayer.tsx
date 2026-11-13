import { useEffect, useState, type ComponentType, type ReactNode } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type StyleProp,
  type ViewStyle,
} from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withSpring,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import {
  ChevronDown,
  FileText,
  Heart,
  ListMusic,
  MoreHorizontal,
  Music,
  Repeat,
  Repeat1,
  Shuffle,
  X,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, {
  Circle,
  Defs,
  Line,
  LinearGradient,
  Path,
  Pattern,
  Rect,
  Stop,
} from 'react-native-svg';
import { RepeatMode } from 'react-native-track-player';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { createStyles, useColors } from '../../theme/theme';
import { formatTime } from '../../utils/formatTime';
import {
  DragHeader,
  SeekArea,
  useTrackChange,
  usePlayerKit,
  type PlayerKit,
  type SkinProps,
} from './kit';

const STUB_HEIGHT = 100;
const BARS = Array.from({ length: 52 }, (_, index) => ({
  weight: [2, 4, 1, 3, 2, 1, 5, 2][(index * 7) % 8],
  gap: [2, 1, 3, 2, 1, 2][(index * 5) % 6],
}));
const two = (value: number) => String(value).padStart(2, '0');

/** A dashed perforation line, drawn so it shows on every Android version. */
function Perforation({
  color,
  vertical,
}: {
  color: string;
  vertical?: boolean;
}) {
  return (
    <Svg
      height={vertical ? '100%' : 2}
      pointerEvents="none"
      width={vertical ? 2 : '100%'}
    >
      <Line
        stroke={color}
        strokeDasharray="5 4"
        strokeWidth={2}
        x1={vertical ? 1 : 0}
        x2={vertical ? 1 : '100%'}
        y1={vertical ? 0 : 1}
        y2={vertical ? '100%' : 1}
      />
    </Svg>
  );
}

/* ───────── the show poster ───────── */

/** A stage light that sweeps from side to side while the music plays. */
function Spotlight({
  playing,
  left,
  period,
  reverse,
  height,
}: {
  playing: boolean;
  left: number;
  period: number;
  reverse?: boolean;
  height: number;
}) {
  const reduced = useReducedMotion();
  const sway = useSharedValue(0.5);
  useEffect(() => {
    if (playing && !reduced) {
      sway.value = withRepeat(
        withTiming(reverse ? 0 : 1, {
          duration: period,
          easing: Easing.inOut(Easing.sin),
        }),
        -1,
        true,
      );
    } else {
      cancelAnimation(sway);
      sway.value = withTiming(0.5, { duration: 400 });
    }
  }, [period, playing, reduced, reverse, sway]);
  const style = useAnimatedStyle(() => ({
    opacity: playing ? 1 : 0.35,
    transform: [{ rotate: `${(sway.value - 0.5) * 32}deg` }],
  }));
  const id = `beam-${left}`;
  return (
    <Animated.View
      pointerEvents="none"
      style={[styles.beam, { left, height: height + 40 }, style]}
    >
      <Svg
        height="100%"
        viewBox="0 0 90 100"
        preserveAspectRatio="none"
        width={90}
      >
        <Defs>
          <LinearGradient id={id} x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0" stopColor="#ffffff" stopOpacity={0.5} />
            <Stop offset="1" stopColor="#ffffff" stopOpacity={0} />
          </LinearGradient>
        </Defs>
        <Path d="M40 0 L50 0 L90 100 L0 100 Z" fill={`url(#${id})`} />
      </Svg>
    </Animated.View>
  );
}

/** The cover as the show poster, with printing dots and two stage lights. */
function Poster({ kit, height }: { kit: PlayerKit; height: number }) {
  const { colors } = useColors();
  const local = useStyles();
  const { stamp, paper, ink } = colors.skin;
  const artwork = kit.track?.artwork ?? null;
  return (
    <View style={[local.poster, { height, backgroundColor: ink }]}>
      {artwork ? (
        <Image
          resizeMode="cover"
          source={{ uri: artwork }}
          style={StyleSheet.absoluteFill}
        />
      ) : (
        <View style={[StyleSheet.absoluteFill, local.noArt]}>
          <Music color={paper} size={height * 0.36} strokeWidth={1.6} />
        </View>
      )}
      <Spotlight height={height} left={24} period={4200} playing={kit.lively} />
      <Spotlight
        height={height}
        left={180}
        period={3400}
        playing={kit.lively}
        reverse
      />
      <Svg pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Defs>
          <Pattern
            height={5}
            id="halftone"
            patternUnits="userSpaceOnUse"
            width={5}
          >
            <Circle cx={2.5} cy={2.5} fill="#000000" opacity={0.22} r={1} />
          </Pattern>
        </Defs>
        <Rect fill="url(#halftone)" height="100%" width="100%" />
      </Svg>
      <Text style={[local.live, { backgroundColor: stamp, color: paper }]}>
        EN VIVO
      </Text>
    </View>
  );
}

/** The ADMITIDO stamp; it lands when the music starts and after a song change. */
function Stamp({
  value,
  playing,
}: {
  value: SharedValue<number>;
  playing: boolean;
}) {
  const { colors } = useColors();
  const local = useStyles();
  const style = useAnimatedStyle(() => ({
    opacity: playing ? value.value * 0.9 : 0,
    transform: [{ rotate: '-14deg' }, { scale: 1.8 - value.value * 0.8 }],
  }));
  return (
    <Animated.Text
      pointerEvents="none"
      style={[
        local.stamp,
        { color: colors.skin.stamp, borderColor: colors.skin.stamp },
        style,
      ]}
    >
      ADMITIDO
    </Animated.Text>
  );
}

/* ───────── controls ───────── */

/** A tear-off stub: it lifts and tilts for a moment when tapped. */
function Stub({
  label,
  onPress,
  disabled,
  tilt,
  origin,
  grow,
  style,
  children,
}: {
  grow?: boolean;
  label: string;
  onPress: () => void;
  disabled?: boolean;
  tilt: number;
  origin: string;
  style: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const local = useStyles();
  const reduced = useReducedMotion();
  const tear = useSharedValue(0);
  const lift = useAnimatedStyle(() => ({
    transform: [
      { translateY: -5 * tear.value },
      { rotate: `${tilt * 0.55 * tear.value}deg` },
    ],
  }));
  return (
    <Animated.View
      style={[
        grow ? local.stubGrow : local.stubSide,
        { transformOrigin: origin },
        lift,
      ]}
    >
      <Pressable
        accessibilityLabel={label}
        accessibilityRole="button"
        accessibilityState={{ disabled }}
        disabled={disabled}
        onPress={() => {
          if (!reduced) {
            tear.value = withSequence(
              withTiming(1, { duration: 110, easing: Easing.out(Easing.quad) }),
              withSpring(0, { damping: 16, stiffness: 200 }),
            );
          }
          onPress();
        }}
        style={[local.stub, style, disabled && local.dim]}
      >
        {children}
      </Pressable>
    </Animated.View>
  );
}

type IconProps = { color: string; size: number; strokeWidth: number };

/** A festival wristband with its clasp; the active one turns ink and shows ✓. */
function Band({
  caption,
  label,
  active,
  onPress,
  disabled,
  Icon,
  bg,
  fg,
  tilt,
}: {
  caption: string;
  label: string;
  active?: boolean;
  onPress: () => void;
  disabled?: boolean;
  Icon: ComponentType<IconProps>;
  bg: string;
  fg: string;
  tilt: number;
}) {
  const { colors } = useColors();
  const local = useStyles();
  const { ink, paper } = colors.skin;
  const back = active ? ink : bg;
  const fore = active ? paper : fg;
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        local.band,
        {
          backgroundColor: back,
          transform: [{ rotate: `${tilt}deg` }, { scale: pressed ? 0.95 : 1 }],
        },
        disabled && local.dim,
      ]}
    >
      <Svg pointerEvents="none" style={StyleSheet.absoluteFill}>
        <Defs>
          <Pattern
            height={9}
            id={`weave-${caption}`}
            patternTransform="rotate(45)"
            patternUnits="userSpaceOnUse"
            width={9}
          >
            <Rect fill="#ffffff" height={9} opacity={0.12} width={4} />
          </Pattern>
        </Defs>
        <Rect fill={`url(#weave-${caption})`} height="100%" width="100%" />
      </Svg>
      <View style={local.clasp}>
        <View style={local.claspDot} />
      </View>
      <Icon color={fore} size={18} strokeWidth={2.4} />
      <Text numberOfLines={1} style={[local.bandText, { color: fore }]}>
        {caption}
      </Text>
      {active ? <Text style={[local.bandText, { color: fore }]}>✓</Text> : null}
    </Pressable>
  );
}

/** Timer, speed, equalizer and the song menu, kept out of the way. */
function MoreOptions({
  kit,
  onClose,
}: {
  kit: PlayerKit;
  onClose: () => void;
}) {
  const { colors } = useColors();
  const local = useStyles();
  const insets = useSafeAreaInsets();
  const { paper, ink, perf } = colors.skin;
  const rows = [
    {
      key: 'sleep',
      label: 'Temporizador',
      value: kit.sleepOn ? kit.sleepCaption : 'Apagado',
      onPress: kit.openSleep,
    },
    {
      key: 'speed',
      label: 'Velocidad',
      value: `${kit.rate}×`,
      onPress: kit.openSpeed,
    },
    {
      key: 'eq',
      label: 'Ecualizador',
      value: kit.equalizerOn ? 'Activado' : 'Apagado',
      onPress: kit.openEqualizer,
    },
    {
      key: 'menu',
      label: 'Más acciones de la canción',
      value: '›',
      onPress: kit.openMenu,
    },
  ];
  return (
    <View style={StyleSheet.absoluteFill}>
      <Pressable
        accessibilityLabel="Cerrar opciones"
        accessibilityRole="button"
        onPress={onClose}
        style={[StyleSheet.absoluteFill, local.scrim]}
      />
      <View
        style={[
          local.panel,
          { bottom: insets.bottom + 16, backgroundColor: paper },
        ]}
      >
        <View style={local.panelHead}>
          <Text style={[local.panelTitle, { color: ink }]}>MÁS OPCIONES</Text>
          <Pressable
            accessibilityLabel="Cerrar opciones"
            accessibilityRole="button"
            onPress={onClose}
            style={local.panelClose}
          >
            <X color={ink} size={22} strokeWidth={2.6} />
          </Pressable>
        </View>
        {rows.map(row => (
          <Pressable
            key={row.key}
            accessibilityLabel={`${row.label}: ${row.value}`}
            accessibilityRole="button"
            onPress={() => {
              onClose();
              row.onPress();
            }}
            style={({ pressed }) => [pressed && local.pressed]}
          >
            <Perforation color={perf} />
            <View style={local.panelRow}>
              <Text style={[local.panelLabel, { color: ink }]}>
                {row.label}
              </Text>
              <Text style={[local.panelValue, { color: ink }]}>
                {row.value}
              </Text>
            </View>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/* ───────── player ───────── */

export function TicketPlayer({ covered, headerGesture, onClose }: SkinProps) {
  const kit = usePlayerKit({ covered });
  const { colors } = useColors();
  const local = useStyles();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const [more, setMore] = useState(false);
  const enter = useSharedValue(0);
  const fall = useSharedValue(0);
  const stamp = useSharedValue(1);
  const shine = useSharedValue(0);
  useEffect(() => {
    if (covered) setMore(false);
  }, [covered]);

  // The stamp lands each time the music starts.
  useEffect(() => {
    if (reduced) {
      stamp.value = 1;
      return;
    }
    stamp.value = kit.isPlaying
      ? withSequence(
          withTiming(0, { duration: 0 }),
          withDelay(
            120,
            withTiming(1, { duration: 220, easing: Easing.in(Easing.quad) }),
          ),
        )
      : 0;
  }, [kit.isPlaying, reduced, stamp]);

  // The holographic foil shimmers while the music plays.
  useEffect(() => {
    if (kit.lively && !reduced) {
      shine.value = withRepeat(
        withTiming(1, { duration: 3200, easing: Easing.linear }),
        -1,
      );
    } else {
      cancelAnimation(shine);
    }
  }, [kit.lively, reduced, shine]);

  // A new song: the stub tears loose and drops a little, the new ticket eases
  // in from the right, the stub settles back into place, then it is stamped.
  // Small, smooth moves with no bounce, all on the UI thread.
  useTrackChange(kit.track?.id, () => {
    if (reduced) return;
    fall.value = withSequence(
      withTiming(1, { duration: 260, easing: Easing.out(Easing.quad) }),
      withDelay(
        320,
        withTiming(0, { duration: 380, easing: Easing.inOut(Easing.cubic) }),
      ),
    );
    enter.value = withSequence(
      withDelay(220, withTiming(1, { duration: 0 })),
      withTiming(0, { duration: 420, easing: Easing.out(Easing.cubic) }),
    );
    stamp.value = withSequence(
      withTiming(0, { duration: 0 }),
      withDelay(
        1000,
        withTiming(1, { duration: 220, easing: Easing.in(Easing.quad) }),
      ),
    );
  });

  const ticketStyle = useAnimatedStyle(() => ({
    opacity: 1 - enter.value * 0.6,
    transform: [{ translateX: enter.value * width * 0.28 }],
  }));
  const stubStyle = useAnimatedStyle(() => ({
    transform: [
      { translateY: fall.value * 60 },
      { rotate: `${fall.value * 5}deg` },
    ],
  }));
  const foilStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: -shine.value * (width - 28) }],
  }));

  if (!kit.track) return null;
  const track = kit.track;
  const { paper, ink, perf, faded, stamp: red } = colors.skin;
  const poster = Math.round(Math.max(130, Math.min(height * 0.26, 230)));
  const moving = !kit.ready || kit.busy;
  const n = kit.queueIndex;
  const serial = String(1207 + n * 31).padStart(5, '0');
  const RepeatIcon = kit.repeatMode === RepeatMode.Track ? Repeat1 : Repeat;
  const info = [
    ['PUERTA', String(3 + (n % 4))],
    ['FILA', 'ABCD'[n % 4]],
    ['ASIENTO', two(12 + ((n * 3) % 60))],
    ['DURA', formatTime(kit.duration || track.duration)],
  ];
  const bands = [
    [red, paper],
    [faded, ink],
    [perf, paper],
    [faded, ink],
    [red, paper],
  ];

  return (
    <View
      style={[
        local.player,
        { paddingTop: insets.top, paddingBottom: insets.bottom + 12 },
      ]}
    >
      <DragHeader gesture={headerGesture} style={local.top}>
        <Pressable
          accessibilityLabel="Cerrar reproductor"
          accessibilityRole="button"
          onPress={onClose}
          style={local.topButton}
        >
          <ChevronDown color={colors.text} size={26} strokeWidth={2.6} />
        </Pressable>
        <Text numberOfLines={1} style={local.topTitle}>
          ADMISIÓN GENERAL · Nº {serial}
        </Text>
        <Pressable
          accessibilityLabel={
            kit.favorite ? 'Quitar de favoritas' : 'Añadir a favoritas'
          }
          accessibilityRole="button"
          accessibilityState={{ selected: kit.favorite }}
          onPress={kit.toggleFavorite}
          style={local.topButton}
        >
          <Heart
            color={kit.favorite ? paper : colors.text}
            fill={kit.favorite ? paper : 'none'}
            size={24}
            strokeWidth={2.4}
          />
        </Pressable>
      </DragHeader>

      <View style={local.stage}>
        <Animated.View style={ticketStyle}>
          <View style={[local.body, { backgroundColor: paper }]}>
            <View style={local.foil}>
              <Animated.View style={[{ width: (width - 28) * 2 }, foilStyle]}>
                <Svg height={8} width="100%">
                  <Defs>
                    <LinearGradient id="foil" x1="0" x2="1" y1="0" y2="0">
                      {[
                        red,
                        faded,
                        '#ffffff',
                        faded,
                        red,
                        faded,
                        '#ffffff',
                        faded,
                        red,
                      ].map((color, index) => (
                        <Stop
                          key={index}
                          offset={index / 8}
                          stopColor={color}
                        />
                      ))}
                    </LinearGradient>
                  </Defs>
                  <Rect fill="url(#foil)" height={8} width="100%" />
                </Svg>
              </Animated.View>
            </View>
            <View style={local.presents}>
              <Text style={[local.tiny, { color: ink }]}>
                MI MÚSICA PRESENTA
              </Text>
              <Text style={[local.tiny, { color: ink }]}>
                FUNCIÓN {two(n + 1)}
              </Text>
            </View>
            <Text
              accessibilityRole="header"
              numberOfLines={1}
              style={[local.title, { color: ink }]}
            >
              {track.title}
            </Text>
            <Text numberOfLines={1} style={[local.artist, { color: ink }]}>
              {track.artist} · EN VIVO
            </Text>
            <View>
              <Poster height={poster} kit={kit} />
              <Stamp playing={kit.isPlaying} value={stamp} />
            </View>
            <View style={[local.info, { borderColor: ink }]}>
              {info.map(([key, value], index) => (
                <View key={key} style={local.infoCell}>
                  <Text style={[local.infoKey, { color: ink }]}>{key}</Text>
                  <Text
                    numberOfLines={1}
                    style={[local.infoValue, { color: ink }]}
                  >
                    {value}
                  </Text>
                  {index < info.length - 1 ? (
                    <View style={local.infoRule}>
                      <Perforation color={perf} vertical />
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
            <SeekArea
              kit={kit}
              label="Código de barras. Toca para cambiar la posición"
              style={local.barcode}
            >
              {BARS.map((bar, index) => (
                <View
                  key={index}
                  style={{
                    flex: bar.weight,
                    marginRight: bar.gap,
                    backgroundColor:
                      index / BARS.length < kit.progress ? ink : faded,
                  }}
                />
              ))}
            </SeekArea>
            <View style={local.times}>
              <Text style={[local.time, { color: ink }]}>
                {formatTime(kit.position)}
              </Text>
              <Text style={[local.serial, { color: ink }]}>
                *{48230 + n * 7319}*
              </Text>
              <Text style={[local.time, { color: ink }]}>
                -{formatTime(Math.max(0, kit.duration - kit.position))}
              </Text>
            </View>
          </View>

          <Animated.View
            style={[local.stubPiece, { backgroundColor: paper }, stubStyle]}
          >
            <Perforation color={perf} />
            <View style={local.stubRow}>
              <Stub
                disabled={moving}
                label="Canción anterior"
                onPress={kit.previous}
                origin="100% 100%"
                style={{ backgroundColor: faded, borderColor: perf }}
                tilt={-7}
              >
                <Svg height={24} viewBox="0 0 24 24" width={24}>
                  <Path d="M6 5h2v14H6zM19 5v14L9 12z" fill={ink} />
                </Svg>
                <Text style={[local.stubText, { color: ink }]}>ANTERIOR</Text>
              </Stub>
              <Stub
                disabled={!kit.ready}
                label={kit.isPlaying ? 'Pausar' : 'Reproducir'}
                onPress={kit.toggle}
                grow
                origin="50% 100%"
                style={[
                  local.playStub,
                  { backgroundColor: ink, borderColor: faded },
                ]}
                tilt={0}
              >
                <Svg height={22} viewBox="0 0 24 24" width={22}>
                  <Path
                    d={
                      kit.isPlaying
                        ? 'M5 4h5v16H5zM14 4h5v16h-5z'
                        : 'M7 4v16l13-8z'
                    }
                    fill={paper}
                  />
                </Svg>
                <Text
                  numberOfLines={1}
                  style={[local.playText, { color: paper }]}
                >
                  {kit.isPlaying ? 'PAUSA' : 'ENTRAR'}
                </Text>
              </Stub>
              <Stub
                disabled={moving}
                label="Siguiente canción"
                onPress={kit.next}
                origin="0% 100%"
                style={{ backgroundColor: faded, borderColor: perf }}
                tilt={7}
              >
                <Svg height={24} viewBox="0 0 24 24" width={24}>
                  <Path d="M16 5h2v14h-2zM5 5l10 7-10 7z" fill={ink} />
                </Svg>
                <Text style={[local.stubText, { color: ink }]}>SIGUIENTE</Text>
              </Stub>
            </View>
            <View
              style={[
                local.notch,
                local.notchLeft,
                { backgroundColor: colors.background },
              ]}
            />
            <View
              style={[
                local.notch,
                local.notchRight,
                { backgroundColor: colors.background },
              ]}
            />
          </Animated.View>
        </Animated.View>

        <View style={local.bands}>
          <View style={local.bandRow}>
            <Band
              Icon={ListMusic}
              bg={bands[0][0]}
              caption="CARTELERA"
              fg={bands[0][1]}
              label={`Abrir cola de reproducción con ${kit.queueCount} canciones`}
              onPress={kit.openQueue}
              tilt={-1}
            />
            <Band
              Icon={FileText}
              bg={bands[1][0]}
              caption="LETRAS"
              fg={bands[1][1]}
              label={`Abrir letras de ${track.title}`}
              onPress={kit.openLyrics}
              tilt={0.8}
            />
            <Band
              Icon={Shuffle}
              active={kit.shuffle}
              bg={bands[2][0]}
              caption="MEZCLA"
              disabled={moving}
              fg={bands[2][1]}
              label={kit.shuffle ? 'Desactivar mezcla' : 'Activar mezcla'}
              onPress={kit.toggleShuffle}
              tilt={-0.6}
            />
          </View>
          <View style={local.bandRow}>
            <Band
              Icon={RepeatIcon}
              active={kit.repeatOn}
              bg={bands[3][0]}
              caption="REPETIR"
              disabled={!kit.ready}
              fg={bands[3][1]}
              label={kit.repeatLabel}
              onPress={kit.cycleRepeat}
              tilt={1}
            />
            <Band
              Icon={MoreHorizontal}
              active={more}
              bg={bands[4][0]}
              caption="MÁS"
              fg={bands[4][1]}
              label="Más opciones: temporizador, velocidad, ecualizador y acciones"
              onPress={() => setMore(true)}
              tilt={-0.8}
            />
          </View>
        </View>
      </View>

      {more ? <MoreOptions kit={kit} onClose={() => setMore(false)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  beam: { position: 'absolute', top: -20, width: 90, transformOrigin: 'top' },
});

const useStyles = createStyles(colors => {
  const slab = colors.design.fonts.display;
  const mono = colors.design.fonts.body;
  const monoBold = colors.design.fonts.label;
  return {
    player: {
      flex: 1,
      paddingHorizontal: 14,
      backgroundColor: colors.background,
    },
    top: { flexDirection: 'row', alignItems: 'center', minHeight: 52 },
    topButton: {
      width: 48,
      height: 48,
      alignItems: 'center',
      justifyContent: 'center',
    },
    topTitle: {
      flex: 1,
      textAlign: 'center',
      color: colors.textSecondary,
      fontFamily: monoBold,
      fontSize: 13,
      letterSpacing: 1,
    },
    stage: { flex: 1, justifyContent: 'space-evenly', gap: 14 },
    body: {
      borderTopLeftRadius: 14,
      borderTopRightRadius: 14,
      paddingHorizontal: 18,
      paddingTop: 20,
      paddingBottom: 12,
      gap: 8,
      boxShadow: '0 12px 26px rgba(0,0,0,0.35)',
    },
    foil: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      height: 8,
      overflow: 'hidden',
      borderTopLeftRadius: 14,
      borderTopRightRadius: 14,
    },
    presents: { flexDirection: 'row', justifyContent: 'space-between' },
    tiny: { fontFamily: monoBold, fontSize: 11, letterSpacing: 2.4 },
    title: {
      fontFamily: slab,
      fontSize: 28,
      lineHeight: 36,
      textTransform: 'uppercase',
    },
    artist: { fontFamily: monoBold, fontSize: 15, marginTop: -6 },
    poster: {
      borderRadius: 6,
      overflow: 'hidden',
      alignItems: 'center',
      justifyContent: 'center',
    },
    noArt: { alignItems: 'center', justifyContent: 'center' },
    live: {
      position: 'absolute',
      left: 10,
      top: 10,
      paddingHorizontal: 8,
      paddingVertical: 2,
      borderRadius: 3,
      fontFamily: slab,
      fontSize: 13,
    },
    stamp: {
      position: 'absolute',
      right: 4,
      bottom: -16,
      paddingHorizontal: 10,
      paddingVertical: 4,
      borderWidth: 3,
      borderRadius: 6,
      fontFamily: slab,
      fontSize: 20,
      letterSpacing: 2.4,
      backgroundColor: 'rgba(255,255,255,0.08)',
    },
    info: {
      flexDirection: 'row',
      borderTopWidth: 2,
      borderBottomWidth: 2,
      marginTop: 6,
    },
    infoCell: { flex: 1, paddingVertical: 6, paddingHorizontal: 4, gap: 2 },
    infoKey: { fontFamily: mono, fontSize: 10, letterSpacing: 1.4 },
    infoValue: { fontFamily: slab, fontSize: 18 },
    infoRule: { position: 'absolute', right: 0, top: 4, bottom: 4 },
    barcode: { height: 52, flexDirection: 'row', alignItems: 'stretch' },
    times: { flexDirection: 'row', justifyContent: 'space-between' },
    time: { fontFamily: monoBold, fontSize: 13, fontVariant: ['tabular-nums'] },
    serial: { fontFamily: mono, fontSize: 13 },
    stubPiece: {
      transformOrigin: '20% 0%',
      height: STUB_HEIGHT,
      borderBottomLeftRadius: 14,
      borderBottomRightRadius: 14,
      boxShadow: '0 12px 26px rgba(0,0,0,0.35)',
    },
    stubRow: {
      flex: 1,
      flexDirection: 'row',
      gap: 8,
      paddingHorizontal: 10,
      paddingTop: 8,
      paddingBottom: 12,
    },
    stubSide: { width: 88 },
    stubGrow: { flex: 1 },
    stub: {
      flex: 1,
      borderRadius: 8,
      borderWidth: 2,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    playStub: { flexDirection: 'row', gap: 9 },
    stubText: { fontFamily: monoBold, fontSize: 11, letterSpacing: 1.3 },
    playText: { fontFamily: slab, fontSize: 15, letterSpacing: 2.2 },
    notch: {
      position: 'absolute',
      top: -11,
      width: 22,
      height: 22,
      borderRadius: 11,
    },
    notchLeft: { left: -11 },
    notchRight: { right: -11 },
    dim: { opacity: 0.45 },
    pressed: { opacity: 0.7 },
    bands: { gap: 10 },
    bandRow: { flexDirection: 'row', gap: 8 },
    band: {
      flex: 1,
      height: 46,
      borderRadius: 6,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 7,
      paddingLeft: 8,
      paddingRight: 10,
      overflow: 'hidden',
      boxShadow: '0 3px 0 rgba(0,0,0,0.3)',
    },
    clasp: {
      width: 18,
      height: 30,
      borderRadius: 4,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: 'rgba(0,0,0,0.35)',
      boxShadow: 'inset 0 0 0 2px rgba(255,255,255,0.25)',
    },
    claspDot: {
      width: 6,
      height: 6,
      borderRadius: 3,
      backgroundColor: 'rgba(255,255,255,0.6)',
    },
    bandText: {
      flexShrink: 1,
      fontFamily: monoBold,
      fontSize: 12,
      letterSpacing: 1.1,
    },
    scrim: { backgroundColor: colors.scrim },
    panel: {
      position: 'absolute',
      left: 14,
      right: 14,
      borderRadius: 14,
      paddingHorizontal: 14,
      paddingTop: 10,
      paddingBottom: 6,
    },
    panelHead: { flexDirection: 'row', alignItems: 'center' },
    panelTitle: { flex: 1, fontFamily: slab, fontSize: 20, lineHeight: 28 },
    panelClose: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    panelRow: {
      minHeight: 52,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    panelLabel: { fontFamily: mono, fontSize: 16 },
    panelValue: { fontFamily: slab, fontSize: 16 },
  };
});
