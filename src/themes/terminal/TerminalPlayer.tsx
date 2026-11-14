import {
  memo,
  useCallback,
  useEffect,
  useState,
  type ComponentType,
} from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import Animated, {
  Easing,
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import {
  ChevronDown,
  FileText,
  Heart,
  ListMusic,
  Repeat,
  Repeat1,
  Shuffle,
  X,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Defs, Path, Pattern, Rect } from 'react-native-svg';
import { RepeatMode } from 'react-native-track-player';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { getPixelCover } from '../../native/musicLibrary';
import { createStyles, useColors } from '../../theme/theme';
import { formatTime } from '../../utils/formatTime';
import {
  DragHeader,
  SeekArea,
  useTrackChange,
  usePlayerKit,
  type PlayerKit,
  type SkinProps,
} from '../../player/kit/playerKit';

/** Side of the pixel-art cover, in pixels. */
const PIXELS = 64;
const PRINT_STEPS = 32;
const WAVE_BARS = 44;
const LOG_MAX = 5;
const PRINT_MS = 30;

const two = (value: number) => String(value).padStart(2, '0');

/** A stable number from a string, so each song keeps its own pattern. */
function hash(text: string) {
  let value = 7;
  for (let index = 0; index < text.length; index++) {
    value = (value * 31 + text.charCodeAt(index)) % 2147483647;
  }
  return value;
}

/* ───────── pixel cover ───────── */

const imageCache = new Map<string, string>();

/**
 * The cover as pixel art in the theme's colors, made once on the phone and
 * kept. `failed` is true when the song has no cover or it cannot be read.
 */
function usePixelCover(artwork: string | null, dark: string, light: string) {
  const key = artwork ? `${artwork}|${dark}|${light}` : null;
  const [uri, setUri] = useState<string | null>(() =>
    key ? imageCache.get(key) ?? null : null,
  );
  const [failed, setFailed] = useState(!artwork);
  useEffect(() => {
    if (!artwork || !key) {
      setUri(null);
      setFailed(true);
      return;
    }
    const cached = imageCache.get(key);
    if (cached) {
      setUri(cached);
      setFailed(false);
      return;
    }
    let alive = true;
    setUri(null);
    setFailed(false);
    getPixelCover(artwork, PIXELS, dark, light)
      .then(made => {
        if (!alive) return;
        if (made) imageCache.set(key, made);
        setUri(made);
        setFailed(!made);
      })
      .catch(() => {
        if (alive) setFailed(true);
      });
    return () => {
      alive = false;
    };
  }, [artwork, dark, key, light]);
  return { uri, failed };
}

/**
 * The pixel cover. A clip on the UI thread prints it top to bottom when it
 * changes, and a band of light sweeps it while the music plays.
 */
const CoverArt = memo(function CoverArtView({
  uri,
  failed,
  size,
  color,
  dim,
  cursor,
  playing,
}: {
  uri: string | null;
  failed: boolean;
  size: number;
  color: string;
  dim: string;
  cursor: string;
  playing: boolean;
}) {
  const styles = useStyles();
  const reduced = useReducedMotion();
  const step = size / PRINT_STEPS;
  const shown = useSharedValue(uri ? size : 0);
  const sweep = useSharedValue(0);
  useEffect(() => {
    if (!uri) {
      shown.value = 0;
      return;
    }
    if (reduced) {
      shown.value = size;
      return;
    }
    shown.value = 0;
    shown.value = withTiming(size, {
      duration: PRINT_STEPS * PRINT_MS,
      easing: Easing.steps(PRINT_STEPS, true),
    });
  }, [reduced, shown, size, uri]);
  useEffect(() => {
    if (playing && !reduced) {
      sweep.value = 0;
      sweep.value = withRepeat(
        withTiming(1, { duration: 3200, easing: Easing.linear }),
        -1,
      );
    } else {
      cancelAnimation(sweep);
      sweep.value = 0;
    }
  }, [playing, reduced, sweep]);
  const clip = useAnimatedStyle(() => ({ height: shown.value }));
  const caret = useAnimatedStyle(() => ({
    opacity: shown.value < size ? 1 : 0,
    transform: [{ translateY: Math.min(shown.value, size - step) }],
  }));
  const band = useAnimatedStyle(() => ({
    opacity: sweep.value > 0 ? 0.14 : 0,
    transform: [{ translateY: -30 + sweep.value * (size + 30) }],
  }));
  if (failed) {
    return (
      <View
        style={[
          styles.noCover,
          { width: size, height: size, borderColor: dim },
        ]}
      >
        <Text style={[styles.noCoverText, { color: dim }]}>
          [ sin portada ]
        </Text>
      </View>
    );
  }
  return (
    <View
      pointerEvents="none"
      style={[styles.cover, { width: size, height: size }]}
    >
      <Animated.View style={[styles.clip, clip]}>
        {uri ? (
          <Image
            fadeDuration={0}
            source={{ uri }}
            style={{ width: size, height: size }}
          />
        ) : null}
      </Animated.View>
      <Svg height={size} style={StyleSheet.absoluteFill} width={size}>
        <Defs>
          <Pattern
            height={3}
            id="scan"
            patternUnits="userSpaceOnUse"
            width={size}
          >
            <Rect fill="#000000" height={1} opacity={0.25} width={size} y={2} />
          </Pattern>
        </Defs>
        <Rect fill="url(#scan)" height={size} width={size} />
      </Svg>
      <Animated.View style={[styles.sweep, { backgroundColor: color }, band]} />
      <Animated.View
        style={[
          styles.caret,
          { width: step * 1.6, height: step, backgroundColor: cursor },
          caret,
        ]}
      />
    </View>
  );
});

/* ───────── small pieces ───────── */

/** The prompt at the end of the log, with a block cursor that blinks. */
function Prompt({ color, dim }: { color: string; dim: string }) {
  const styles = useStyles();
  const reduced = useReducedMotion();
  const on = useSharedValue(1);
  useEffect(() => {
    if (reduced) return;
    on.value = withRepeat(
      withSequence(
        withTiming(1, { duration: 500, easing: Easing.steps(1) }),
        withTiming(0, { duration: 500, easing: Easing.steps(1) }),
      ),
      -1,
    );
    return () => cancelAnimation(on);
  }, [on, reduced]);
  const blink = useAnimatedStyle(() => ({ opacity: on.value }));
  return (
    <View style={styles.promptRow}>
      <Text style={[styles.logLine, { color: dim }]}>~/música $ </Text>
      <Animated.View
        style={[styles.block, { backgroundColor: color }, blink]}
      />
    </View>
  );
}

type IconProps = { color: string; size: number; strokeWidth: number };

function Command({
  label,
  caption,
  active,
  onPress,
  disabled,
  Icon,
}: {
  label: string;
  caption: string;
  active?: boolean;
  onPress: () => void;
  disabled?: boolean;
  Icon?: ComponentType<IconProps>;
}) {
  const { colors } = useColors();
  const styles = useStyles();
  const { band, bandInk } = colors.skin;
  const color = active ? bandInk ?? colors.background : colors.text;
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected: active, disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.command,
        active && { backgroundColor: band, borderColor: band },
        pressed && styles.pressed,
        disabled && styles.dim,
      ]}
    >
      {Icon ? <Icon color={color} size={16} strokeWidth={2.6} /> : null}
      <Text numberOfLines={1} style={[styles.commandText, { color }]}>
        {caption}
      </Text>
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
  const styles = useStyles();
  const insets = useSafeAreaInsets();
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
        style={[StyleSheet.absoluteFill, styles.scrim]}
      />
      <View style={[styles.panel, { bottom: insets.bottom + 16 }]}>
        <View style={styles.panelHead}>
          <Text style={styles.panelTitle}>más opciones</Text>
          <Pressable
            accessibilityLabel="Cerrar opciones"
            accessibilityRole="button"
            onPress={onClose}
            style={styles.panelClose}
          >
            <X
              color={colors.skin.bandInk ?? colors.background}
              size={22}
              strokeWidth={3}
            />
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
            style={({ pressed }) => [
              styles.panelRow,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.panelLabel}>
              <Text style={{ color: colors.skin.cmd }}>$ </Text>
              {row.label.toLowerCase()}
            </Text>
            <Text style={[styles.panelLabel, { color: colors.skin.cmd }]}>
              {row.value}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/* ───────── player ───────── */

export function TerminalPlayer({ covered, headerGesture, onClose }: SkinProps) {
  const kit = usePlayerKit({ covered });
  const { colors } = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const [more, setMore] = useState(false);
  const [log, setLog] = useState<string[]>(() => [
    '[ok] biblioteca local lista',
    kit.track ? `> reproduciendo "${kit.track.title}"` : '> sin canción',
  ]);
  // Dark parts of the cover use the darker theme color, so a light theme
  // still shows the picture the right way round.
  const shadow = colors.isLight ? colors.text : colors.background;
  const shine = colors.isLight ? colors.background : colors.text;
  const cover = usePixelCover(kit.track?.artwork ?? null, shadow, shine);
  const say = useCallback(
    (...lines: string[]) =>
      setLog(current => [...current, ...lines].slice(-LOG_MAX)),
    [],
  );
  useTrackChange(kit.track?.id, () => {
    if (kit.track) {
      say('$ render --pixel cover.jpg', `> reproduciendo "${kit.track.title}"`);
    }
  });
  useEffect(() => {
    if (covered) setMore(false);
  }, [covered]);

  if (!kit.track) return null;
  const track = kit.track;
  const { cmd, dim, band, bandInk } = colors.skin;
  const ink = bandInk ?? colors.background;
  const inner = width - 32;
  const coverSize = Math.round(Math.min(inner * 0.56, height * 0.27));
  const seed = hash(track.id);
  const wave = Array.from(
    { length: WAVE_BARS },
    (_, index) =>
      0.2 +
      0.8 *
        Math.abs(
          Math.sin(index * 0.55 + (seed % 7)) *
            Math.cos(index * 0.21 + (seed % 5)),
        ),
  );
  const played = kit.progress * WAVE_BARS;
  const RepeatIcon = kit.repeatMode === RepeatMode.Track ? Repeat1 : Repeat;
  const moving = !kit.ready || kit.busy;
  const onoff = (value: boolean) => (value ? 'on' : 'off');
  const facts = [
    ['pista', `${two(kit.queueIndex + 1)}/${two(kit.queueCount)}`],
    ['dura ', formatTime(kit.duration || track.duration)],
    ['año  ', track.year ? String(track.year) : '—'],
    ['vel  ', `${kit.rate}×`],
    ['eq   ', onoff(kit.equalizerOn)],
    ['mezc ', onoff(kit.shuffle)],
  ];
  const swatches = [
    colors.text,
    cmd,
    dim,
    band,
    colors.outline,
    colors.surface,
  ];

  return (
    <View style={[styles.player, { paddingBottom: insets.bottom + 12 }]}>
      <DragHeader
        gesture={headerGesture}
        style={[styles.band, { paddingTop: insets.top, backgroundColor: band }]}
      >
        <Pressable
          accessibilityLabel="Cerrar reproductor"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.bandButton}
        >
          <ChevronDown color={ink} size={26} strokeWidth={3} />
        </Pressable>
        <Text numberOfLines={1} style={[styles.bandTitle, { color: ink }]}>
          mimusica — tty1
        </Text>
        <Pressable
          accessibilityLabel={
            kit.favorite ? 'Quitar de favoritas' : 'Añadir a favoritas'
          }
          accessibilityRole="button"
          accessibilityState={{ selected: kit.favorite }}
          onPress={kit.toggleFavorite}
          style={styles.bandButton}
        >
          <Heart
            color={ink}
            fill={kit.favorite ? ink : 'none'}
            size={22}
            strokeWidth={2.6}
          />
        </Pressable>
      </DragHeader>

      <View style={styles.body}>
        <Text numberOfLines={1} style={[styles.small, { color: dim }]}>
          ~/música ${' '}
          <Text style={[styles.strong, { color: cmd }]}>now-playing</Text>
        </Text>
        <Text accessibilityRole="header" numberOfLines={1} style={styles.title}>
          {track.title}
        </Text>
        <Text numberOfLines={1} style={[styles.small, { color: dim }]}>
          por <Text style={{ color: colors.text }}>{track.artist}</Text> ·{' '}
          {track.album}
        </Text>

        <View style={styles.fetch}>
          <CoverArt
            color={colors.text}
            cursor={cmd}
            dim={dim}
            failed={cover.failed}
            playing={kit.lively}
            size={coverSize}
            uri={cover.uri}
          />
          <View style={styles.facts}>
            <Text numberOfLines={1} style={[styles.fact, { color: cmd }]}>
              pista@mimusica
            </Text>
            <Text numberOfLines={1} style={[styles.fact, { color: dim }]}>
              ──────────
            </Text>
            {facts.map(([key, value]) => (
              <Text key={key} numberOfLines={1} style={styles.fact}>
                <Text style={{ color: cmd }}>{key}</Text> {value}
              </Text>
            ))}
            <View style={styles.swatches}>
              {swatches.map((swatch, index) => (
                <View
                  key={index}
                  style={[styles.swatch, { backgroundColor: swatch }]}
                />
              ))}
            </View>
          </View>
        </View>
        <Text numberOfLines={1} style={[styles.small, { color: dim }]}>
          $ render --pixel cover.jpg · {PIXELS}×{PIXELS}
        </Text>

        <SeekArea
          kit={kit}
          label="Forma de la canción. Toca para cambiar la posición"
          style={styles.wave}
        >
          {wave.map((level, index) => (
            <View
              key={index}
              style={[
                styles.waveBar,
                {
                  height: `${Math.round(level * 100)}%`,
                  backgroundColor:
                    index < played ? colors.text : colors.outline,
                },
              ]}
            />
          ))}
        </SeekArea>
        <View style={styles.times}>
          <Text style={styles.time}>[{formatTime(kit.position)}]</Text>
          <Text style={[styles.time, { color: dim }]}>
            [-{formatTime(Math.max(0, kit.duration - kit.position))}]
          </Text>
        </View>

        <View
          importantForAccessibility="no-hide-descendants"
          style={styles.log}
        >
          {log.map((line, index) => (
            <Text
              key={`${index}-${line}`}
              numberOfLines={1}
              style={[
                styles.logLine,
                { color: index === log.length - 1 ? colors.text : dim },
              ]}
            >
              {line}
            </Text>
          ))}
          <Prompt color={colors.text} dim={dim} />
        </View>

        <View style={styles.commands}>
          <Command
            Icon={ListMusic}
            caption="cola"
            label={`Abrir cola de reproducción con ${kit.queueCount} canciones`}
            onPress={kit.openQueue}
          />
          <Command
            Icon={FileText}
            caption="letras"
            label={`Abrir letras de ${track.title}`}
            onPress={kit.openLyrics}
          />
          <Command
            Icon={Shuffle}
            active={kit.shuffle}
            caption="mezcla"
            disabled={moving}
            label={kit.shuffle ? 'Desactivar mezcla' : 'Activar mezcla'}
            onPress={() => {
              say(`$ shuffle ${onoff(!kit.shuffle)}`);
              kit.toggleShuffle();
            }}
          />
          <Command
            Icon={RepeatIcon}
            active={kit.repeatOn}
            caption="repetir"
            disabled={!kit.ready}
            label={kit.repeatLabel}
            onPress={() => {
              say('$ repeat --next');
              kit.cycleRepeat();
            }}
          />
          <Command
            active={more}
            caption="más…"
            label="Más opciones: temporizador, velocidad, ecualizador y acciones"
            onPress={() => setMore(true)}
          />
        </View>

        <View style={styles.transport}>
          <Pressable
            accessibilityLabel="Canción anterior"
            accessibilityRole="button"
            accessibilityState={{ disabled: moving }}
            disabled={moving}
            onPress={kit.previous}
            style={({ pressed }) => [
              styles.skip,
              pressed && styles.pressed,
              moving && styles.dim,
            ]}
          >
            <Svg height={26} viewBox="0 0 24 24" width={26}>
              <Path d="M5 4h3v16H5zM20 4v16L9 12z" fill={colors.text} />
            </Svg>
          </Pressable>
          <Pressable
            accessibilityLabel={kit.isPlaying ? 'Pausar' : 'Reproducir'}
            accessibilityRole="button"
            accessibilityState={{ disabled: !kit.ready }}
            disabled={!kit.ready}
            onPress={() => {
              say(kit.isPlaying ? '$ pause' : '$ play');
              kit.toggle();
            }}
            style={({ pressed }) => [
              styles.play,
              { backgroundColor: band },
              pressed && styles.pressed,
              !kit.ready && styles.dim,
            ]}
          >
            <Svg height={28} viewBox="0 0 24 24" width={28}>
              <Path
                d={
                  kit.isPlaying ? 'M5 4h5v16H5zM14 4h5v16h-5z' : 'M6 3v18l15-9z'
                }
                fill={ink}
              />
            </Svg>
            <Text style={[styles.playText, { color: ink }]}>
              {kit.isPlaying ? 'pausa' : 'play'}
            </Text>
          </Pressable>
          <Pressable
            accessibilityLabel="Siguiente canción"
            accessibilityRole="button"
            accessibilityState={{ disabled: moving }}
            disabled={moving}
            onPress={kit.next}
            style={({ pressed }) => [
              styles.skip,
              pressed && styles.pressed,
              moving && styles.dim,
            ]}
          >
            <Svg height={26} viewBox="0 0 24 24" width={26}>
              <Path d="M16 4h3v16h-3zM4 4l11 8-11 8z" fill={colors.text} />
            </Svg>
          </Pressable>
        </View>
      </View>

      {more ? <MoreOptions kit={kit} onClose={() => setMore(false)} /> : null}
    </View>
  );
}

const useStyles = createStyles(colors => {
  const mono = colors.design.fonts.body;
  const bold = colors.design.fonts.display;
  const line = { borderWidth: 2, borderColor: colors.outline };
  return {
    player: { flex: 1, backgroundColor: colors.background },
    band: { flexDirection: 'row', alignItems: 'center', minHeight: 44 },
    bandButton: {
      width: 52,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    bandTitle: {
      flex: 1,
      textAlign: 'center',
      fontFamily: bold,
      fontSize: 14,
    },
    body: { flex: 1, paddingHorizontal: 16, paddingTop: 12, gap: 8 },
    small: { fontFamily: mono, fontSize: 13 },
    strong: { fontFamily: bold },
    title: { color: colors.text, fontFamily: bold, fontSize: 24 },
    fetch: { flexDirection: 'row', gap: 12, marginTop: 4 },
    clip: { overflow: 'hidden' },
    cover: { overflow: 'hidden', backgroundColor: colors.surface },
    noCover: {
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 2,
      borderStyle: 'dashed',
    },
    noCoverText: { fontFamily: mono, fontSize: 12 },
    sweep: { position: 'absolute', left: 0, right: 0, top: 0, height: 26 },
    caret: { position: 'absolute', left: 0, top: 0 },
    facts: { flex: 1, gap: 5 },
    fact: { color: colors.text, fontFamily: mono, fontSize: 13 },
    swatches: { flexDirection: 'row', marginTop: 4 },
    swatch: { width: 16, height: 14 },
    wave: {
      height: 44,
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: 2,
      marginTop: 4,
    },
    waveBar: { flex: 1 },
    times: { flexDirection: 'row', justifyContent: 'space-between' },
    time: {
      color: colors.text,
      fontFamily: bold,
      fontSize: 14,
      fontVariant: ['tabular-nums'],
    },
    log: {
      flex: 1,
      minHeight: 56,
      justifyContent: 'flex-end',
      gap: 3,
      paddingVertical: 8,
      overflow: 'hidden',
      borderTopWidth: 2,
      borderBottomWidth: 2,
      borderColor: colors.outline,
    },
    logLine: { fontFamily: mono, fontSize: 12 },
    promptRow: { flexDirection: 'row', alignItems: 'center' },
    block: { width: 8, height: 14 },
    commands: { flexDirection: 'row', gap: 6, marginTop: 4 },
    command: {
      flex: 1,
      height: 46,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 2,
      ...line,
    },
    commandText: { fontFamily: bold, fontSize: 11 },
    pressed: { opacity: 0.6 },
    dim: { opacity: 0.45 },
    transport: { flexDirection: 'row', gap: 10, height: 72 },
    skip: {
      width: 84,
      alignItems: 'center',
      justifyContent: 'center',
      ...line,
    },
    play: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 10,
    },
    playText: { fontFamily: bold, fontSize: 24 },
    scrim: { backgroundColor: colors.scrim },
    panel: {
      position: 'absolute',
      left: 16,
      right: 16,
      backgroundColor: colors.surface,
      ...line,
    },
    panelHead: {
      flexDirection: 'row',
      alignItems: 'center',
      backgroundColor: colors.skin.band,
    },
    panelTitle: {
      flex: 1,
      paddingHorizontal: 14,
      color: colors.skin.bandInk ?? colors.background,
      fontFamily: bold,
      fontSize: 14,
    },
    panelClose: {
      width: 48,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    panelRow: {
      minHeight: 52,
      paddingHorizontal: 14,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      borderTopWidth: 1,
      borderColor: colors.outline,
    },
    panelLabel: { color: colors.text, fontFamily: mono, fontSize: 15 },
  };
});
