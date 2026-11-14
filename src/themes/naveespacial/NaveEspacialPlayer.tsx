import { useMemo, useState } from 'react';
import {
  Image,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
  type LayoutChangeEvent,
} from 'react-native';
import Animated, {
  useAnimatedProps,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { RepeatMode } from 'react-native-track-player';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  Ellipse,
  G,
  Path,
  Polygon,
  RadialGradient,
  Rect,
  Stop,
} from 'react-native-svg';
import { useColors } from '../../theme/theme';
import { formatTime } from '../../utils/formatTime';
import {
  DragHeader,
  SeekArea,
  usePlayerKit,
  type PlayerKit,
  type SkinProps,
} from '../../player/kit/playerKit';
import {
  AnimatedPath,
  clamp01,
  noise,
  useSceneClock,
  type SceneClock,
} from '../../player/kit/sceneClock';

const HUD = 'Orbitron';
const BODY = 'Exo2';
const HEADER = 52;
const THROTTLE = 48;
const TIMES = 18;
const TRANSPORT = 108;
const TOOLS = 74;
const FOOTER = 20;
const STARS = 44;

/** Where the jump is in its 0–1 run (clock.change falls from 1 to 0). */
function jumpPhase(change: number) {
  'worklet';
  return change > 0 ? 1 - change : 1;
}

/**
 * Stars that fly out of the vanishing point. Right after a song change they
 * stretch into hyperspace streaks.
 */
function Starfield({
  clock,
  cx,
  cy,
  reach,
  color,
  set,
}: {
  clock: SceneClock;
  cx: number;
  cy: number;
  reach: number;
  color: string;
  set: number;
}) {
  const props = useAnimatedProps(() => {
    const warp = clock.change.value;
    let d = '';
    for (let k = set; k < STARS; k += 2) {
      const angle = noise(k + 1) * Math.PI * 2;
      const speed = 0.22 + noise(k + 40) * 0.2;
      const t = (clock.run.value * speed + noise(k + 80)) % 1;
      const r = 10 + t * t * reach;
      const length = (2 + t * 12) * (1 + warp * 9);
      const cos = Math.cos(angle);
      const sin = Math.sin(angle);
      d += `M${(cx + cos * r).toFixed(1)} ${(cy + sin * r).toFixed(1)} L ${(
        cx +
        cos * (r + length)
      ).toFixed(1)} ${(cy + sin * (r + length)).toFixed(1)} `;
    }
    return { d: d || 'M0 0' };
  });
  return (
    <AnimatedPath
      animatedProps={props}
      fill="none"
      stroke={color}
      strokeLinecap="round"
      strokeWidth={set === 0 ? 1.6 : 2.4}
    />
  );
}

/** The song's art, twice in a row, so it can roll like a turning planet. */
function PlanetSurface({
  uri,
  size,
}: {
  uri: string | null | undefined;
  size: number;
}) {
  const { colors } = useColors();
  const s = colors.skin;
  const face = (key: string) =>
    uri ? (
      <Image
        key={key}
        fadeDuration={0}
        resizeMethod="resize"
        source={{ uri }}
        style={{ width: size, height: size }}
      />
    ) : (
      <Svg key={key} height={size} viewBox="0 0 200 200" width={size}>
        <Rect fill={s.planet} height={200} width={200} />
        <Circle cx={70} cy={80} fill={s.planet2} r={46} />
        <Rect fill={s.space} height={22} opacity={0.25} width={200} y={120} />
        <Circle cx={150} cy={150} fill={s.accent} r={18} />
        <Path
          d="M0 170 L 60 120 L 110 160 L 160 110 L 200 140 L 200 200 L 0 200 Z"
          fill={s.space}
          opacity={0.35}
        />
      </Svg>
    );
  return (
    <>
      {face('a')}
      {face('b')}
    </>
  );
}

/** The destination planet: the cover, spinning, with shade, air and a ring. */
function Planet({
  clock,
  kit,
  size,
}: {
  clock: SceneClock;
  kit: PlayerKit;
  size: number;
}) {
  const { colors } = useColors();
  const s = colors.skin;
  const ringW = size * 1.58;
  const ringH = size * 0.37;
  const box = { width: ringW, height: size };
  const roll = useAnimatedStyle(() => ({
    transform: [{ translateX: -((clock.run.value * 5) % size) }],
  }));
  const arrive = useAnimatedStyle(() => {
    const c = clock.change.value;
    if (c === 0) return { opacity: 1, transform: [{ scale: 1 }] };
    const k = clamp01((jumpPhase(c) - 0.32) / 0.6);
    const e = 1 - Math.pow(1 - k, 3);
    return { opacity: e, transform: [{ scale: 0.1 + 0.9 * e }] };
  });
  const rx = ringW / 2 - 2;
  const ry = ringH / 2;
  const cy = size / 2;
  const cx = ringW / 2;
  const front = `M${cx - rx} ${cy} A ${rx} ${ry} 0 0 0 ${cx + rx} ${cy}`;
  return (
    <Animated.View pointerEvents="none" style={[box, arrive]}>
      <Svg height={size} style={StyleSheet.absoluteFill} width={ringW}>
        <G transform={`rotate(-14, ${cx}, ${cy})`}>
          <Ellipse
            cx={cx}
            cy={cy}
            fill="none"
            opacity={0.6}
            rx={rx}
            ry={ry}
            stroke={s.ring}
            strokeWidth={3}
          />
        </G>
      </Svg>
      <View
        style={[
          styles.planet,
          {
            left: (ringW - size) / 2,
            width: size,
            height: size,
            borderRadius: size / 2,
            boxShadow: `0 0 28px ${s.accent}`,
            backgroundColor: s.planet,
          },
        ]}
      >
        <Animated.View style={[styles.surface, { width: size * 2 }, roll]}>
          <PlanetSurface size={size} uri={kit.track?.artwork} />
        </Animated.View>
        <Svg height={size} style={StyleSheet.absoluteFill} width={size}>
          <Defs>
            <RadialGradient cx="34%" cy="30%" id="hx-shade" r="75%">
              <Stop offset="0" stopColor="#ffffff" stopOpacity={0.18} />
              <Stop offset="0.45" stopColor="#000000" stopOpacity={0} />
              <Stop offset="0.85" stopColor="#000000" stopOpacity={0.6} />
              <Stop offset="1" stopColor="#000000" stopOpacity={0.8} />
            </RadialGradient>
          </Defs>
          <Circle
            cx={size / 2}
            cy={size / 2}
            fill="url(#hx-shade)"
            r={size / 2}
          />
        </Svg>
      </View>
      <Svg height={size} style={StyleSheet.absoluteFill} width={ringW}>
        <G transform={`rotate(-14, ${cx}, ${cy})`}>
          <Path
            d={front}
            fill="none"
            opacity={0.9}
            stroke={s.ring}
            strokeWidth={3}
          />
        </G>
      </Svg>
    </Animated.View>
  );
}

/** One line of title that rolls like a marquee only when it does not fit. */
function Marquee({
  clock,
  text,
  style,
}: {
  clock: SceneClock;
  text: string;
  style: object;
}) {
  const [box, setBox] = useState(0);
  const [natural, setNatural] = useState(0);
  const span = useSharedValue(0);
  span.value = natural + 56;
  const fits = natural === 0 || box === 0 || natural <= box;
  const roll = useAnimatedStyle(() => {
    if (span.value <= 56) return { transform: [{ translateX: 0 }] };
    return {
      transform: [{ translateX: -((clock.wall.value * 30) % span.value) }],
    };
  });
  return (
    <View
      onLayout={(event: LayoutChangeEvent) =>
        setBox(event.nativeEvent.layout.width)
      }
      style={styles.marquee}
    >
      <View pointerEvents="none" style={styles.measure}>
        <Text
          importantForAccessibility="no-hide-descendants"
          onLayout={(event: LayoutChangeEvent) =>
            setNatural(Math.ceil(event.nativeEvent.layout.width))
          }
          style={style}
        >
          {text}
        </Text>
      </View>
      {fits ? (
        <Text numberOfLines={1} style={style}>
          {text}
        </Text>
      ) : (
        <Animated.View style={[styles.roll, roll]}>
          <Text style={[style, styles.rollGap]}>{text}</Text>
          <Text
            importantForAccessibility="no-hide-descendants"
            style={[style, styles.rollGap]}
          >
            {text}
          </Text>
        </Animated.View>
      )}
    </View>
  );
}

/** The windshield: stars, the planet and the heads-up display. */
function Windshield({
  clock,
  kit,
  width,
  height,
}: {
  clock: SceneClock;
  kit: PlayerKit;
  width: number;
  height: number;
}) {
  const { colors } = useColors();
  const s = colors.skin;
  const cut = Math.round(height * 0.13);
  const side = Math.round(width * 0.07);
  const outer = `${side},0 ${
    width - side
  },0 ${width},${cut} ${width},${height} 0,${height} 0,${cut}`;
  const inner = `${side + 3},4 ${width - side - 3},4 ${width - 4},${cut + 2} ${
    width - 4
  },${height - 4} 4,${height - 4} 4,${cut + 2}`;
  const cx = width / 2;
  const cy = Math.round(height * 0.42);
  const planet = Math.round(Math.min(width * 0.57, height * 0.48));
  const ringW = planet * 1.58;
  const reticle = planet + 30;
  const remaining = Math.max(0, kit.duration - kit.position);

  const beat = useAnimatedStyle(() => {
    const b = Math.abs(Math.sin(clock.run.value * Math.PI * 1.25));
    return { transform: [{ scale: 0.97 + b * 0.06 * clock.play.value }] };
  });
  const ladder = useAnimatedStyle(() => ({
    transform: [{ translateY: (clock.run.value * 16) % 20 }],
  }));
  const flash = useAnimatedStyle(() => {
    const c = clock.change.value;
    if (c === 0) return { opacity: 0 };
    const p = jumpPhase(c);
    return { opacity: Math.max(0, 1 - Math.abs(p - 0.4) / 0.14) * 0.8 };
  });

  const hud = [styles.hud, { color: s.accent }];
  return (
    <View
      accessible
      accessibilityLabel="Parabrisas de la nave: el planeta de destino es la portada"
      onLayout={clock.onLayout}
      style={{ width, height }}
    >
      <Svg height={height} style={StyleSheet.absoluteFill} width={width}>
        <Defs>
          <ClipPath id="hx-glass">
            <Polygon points={inner} />
          </ClipPath>
        </Defs>
        <Polygon fill={s.line} points={outer} />
        <Polygon fill={s.space} points={inner} />
        <G clipPath="url(#hx-glass)">
          <Starfield
            clock={clock}
            color={s.star}
            cx={cx}
            cy={cy}
            reach={width * 0.75}
            set={0}
          />
          <Starfield
            clock={clock}
            color={s.star}
            cx={cx}
            cy={cy}
            reach={width * 0.75}
            set={1}
          />
        </G>
      </Svg>

      <View
        style={[
          styles.planetSpot,
          { left: cx - ringW / 2, top: cy - planet / 2 },
        ]}
      >
        <Planet clock={clock} kit={kit} size={planet} />
      </View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.reticle,
          {
            left: cx - reticle / 2,
            top: cy - reticle / 2,
            width: reticle,
            height: reticle,
          },
          beat,
        ]}
      >
        {(['tl', 'tr', 'bl', 'br'] as const).map(corner => (
          <View
            key={corner}
            style={[styles.corner, styles[corner], { borderColor: s.accent }]}
          />
        ))}
      </Animated.View>

      <View style={[styles.ladderBox, { top: cut + 40, height: height * 0.4 }]}>
        <Animated.View style={[styles.ladderStrip, ladder]}>
          {Array.from({ length: 14 }, (_, i) => (
            <View
              key={i}
              style={[styles.tick, { backgroundColor: s.accent }]}
            />
          ))}
        </Animated.View>
      </View>
      <Text style={[hud, styles.alt, { top: cut + 20 }]}>ALT</Text>
      <View style={[styles.speed, { top: cut + 8 }]}>
        <Text style={hud}>VEL</Text>
        <Text style={[styles.hud, styles.hudStrong, { color: s.ink }]}>
          {kit.isPlaying ? 'CRUCERO' : 'EN ESPERA'}
        </Text>
      </View>

      <View style={styles.destination}>
        <View style={styles.hudRow}>
          <Text style={hud}>DESTINO</Text>
          <Text style={hud}>DIST {formatTime(remaining)}</Text>
        </View>
        <Marquee
          clock={clock}
          style={[styles.title, { color: s.ink }]}
          text={kit.track?.title ?? ''}
        />
        <Text numberOfLines={1} style={[styles.artist, { color: s.sub }]}>
          Sistema · {kit.track?.artist}
        </Text>
      </View>

      <Animated.View
        pointerEvents="none"
        style={[StyleSheet.absoluteFill, { backgroundColor: s.star }, flash]}
      />
    </View>
  );
}

/** The ignition button: a soft halo breathes around it while it plays. */
function Ignition({ clock, kit }: { clock: SceneClock; kit: PlayerKit }) {
  const { colors } = useColors();
  const s = colors.skin;
  const halo = useAnimatedStyle(() => {
    const b = (Math.sin(clock.wall.value * 2) + 1) / 2;
    return {
      opacity: 0.25 + 0.45 * b * clock.play.value,
      transform: [{ scale: 1 + 0.08 * b * clock.play.value }],
    };
  });
  return (
    <View style={styles.ignitionBox}>
      <Animated.View
        pointerEvents="none"
        style={[styles.halo, { backgroundColor: s.accent }, halo]}
      />
      <Pressable
        accessibilityLabel={kit.isPlaying ? 'Pausar' : 'Reproducir'}
        accessibilityRole="button"
        disabled={!kit.ready}
        onPress={kit.toggle}
        style={({ pressed }) => [
          styles.ignition,
          {
            backgroundColor: s.accent,
            borderColor: s.line,
            transform: [{ scale: pressed ? 0.95 : 1 }],
          },
        ]}
      >
        <Svg height={30} viewBox="0 0 30 30" width={30}>
          {kit.isPlaying ? (
            <>
              <Rect
                fill={s.onAccent}
                height={20}
                rx={1.5}
                width={6}
                x={6}
                y={5}
              />
              <Rect
                fill={s.onAccent}
                height={20}
                rx={1.5}
                width={6}
                x={18}
                y={5}
              />
            </>
          ) : (
            <Path d="M8 4 L 26 15 L 8 26 Z" fill={s.onAccent} />
          )}
        </Svg>
        <Text style={[styles.engine, { color: s.onAccent }]}>
          {kit.isPlaying ? 'EN VUELO' : 'ENCENDER'}
        </Text>
      </Pressable>
    </View>
  );
}

function ConsoleKey({
  label,
  caption,
  lit,
  disabled,
  onPress,
  forward,
}: {
  label: string;
  caption: string;
  lit: boolean;
  disabled: boolean;
  onPress: () => void;
  forward: boolean;
}) {
  const { colors } = useColors();
  const s = colors.skin;
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        styles.key,
        {
          backgroundColor: s.panel,
          borderColor: s.line,
          opacity: disabled ? 0.5 : 1,
          transform: [{ scale: pressed ? 0.95 : 1 }],
        },
      ]}
    >
      <View
        style={[
          styles.keyLed,
          { backgroundColor: s.accent, opacity: lit ? 1 : 0.45 },
        ]}
      />
      <Svg height={22} viewBox="0 0 30 22" width={30}>
        <Path
          d={
            forward
              ? 'M3 2 L 14 11 L 3 20 Z M 16 2 L 27 11 L 16 20 Z'
              : 'M14 2 L 3 11 L 14 20 Z M 27 2 L 16 11 L 27 20 Z'
          }
          fill={s.ink}
        />
      </Svg>
      <Text style={[styles.keyText, { color: s.ink }]}>{caption}</Text>
    </Pressable>
  );
}

/** A toggle switch with its own light, for the tools. */
function Toggle({
  label,
  caption,
  on,
  onPress,
}: {
  label: string;
  caption: string;
  on: boolean;
  onPress: () => void;
}) {
  const { colors } = useColors();
  const s = colors.skin;
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected: on }}
      onPress={onPress}
      style={({ pressed }) => [
        styles.toggle,
        {
          backgroundColor: s.panel,
          borderColor: s.line,
          transform: [{ scale: pressed ? 0.95 : 1 }],
        },
      ]}
    >
      <View
        style={[
          styles.led,
          {
            backgroundColor: on ? s.accent : s.line,
            boxShadow: on ? `0 0 8px ${s.accent}` : 'none',
          },
        ]}
      />
      <View
        style={[
          styles.lever,
          {
            borderColor: s.line,
            backgroundColor: s.bg,
            justifyContent: on ? 'flex-start' : 'flex-end',
          },
        ]}
      >
        <View
          style={[styles.knob, { backgroundColor: on ? s.accent : s.sub }]}
        />
      </View>
      <Text
        adjustsFontSizeToFit
        numberOfLines={1}
        style={[styles.toggleText, { color: s.ink }]}
      >
        {caption}
      </Text>
    </Pressable>
  );
}

/** Timer, speed, equalizer and the song menu. */
function Auxiliary({
  kit,
  width,
  onClose,
}: {
  kit: PlayerKit;
  width: number;
  onClose: () => void;
}) {
  const { colors } = useColors();
  const s = colors.skin;
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
        style={[StyleSheet.absoluteFill, { backgroundColor: colors.scrim }]}
      />
      <View
        style={[
          styles.sheet,
          {
            width,
            bottom: insets.bottom + 16,
            backgroundColor: s.panel,
            borderColor: s.line,
            boxShadow: `0 0 30px ${s.accent}`,
          },
        ]}
      >
        <View style={styles.sheetHead}>
          <Text style={[styles.sheetTitle, { color: s.accent }]}>
            SISTEMAS AUXILIARES
          </Text>
          <Pressable
            accessibilityLabel="Cerrar opciones"
            accessibilityRole="button"
            onPress={onClose}
            style={styles.sheetClose}
          >
            <Text style={[styles.sheetTitle, { color: s.ink }]}>✕</Text>
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
            style={[styles.sheetRow, { borderTopColor: s.line }]}
          >
            <Text style={[styles.sheetLabel, { color: s.ink }]}>
              {row.label}
            </Text>
            <Text style={[styles.sheetValue, { color: s.accent }]}>
              {row.value.toUpperCase()}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

export function NaveEspacialPlayer({
  covered,
  headerGesture,
  onClose,
}: SkinProps) {
  const kit = usePlayerKit({ covered });
  const clock = useSceneClock(kit, {
    boost: 6,
    changeSeconds: 1.4,
    baseWidth: 336,
  });
  const { width, height } = useWindowDimensions();
  const { colors } = useColors();
  const insets = useSafeAreaInsets();
  const [more, setMore] = useState(false);

  const W = width - 24;
  const body = height - insets.top - insets.bottom - HEADER - 6;
  const fixed = THROTTLE + TIMES + TRANSPORT + TOOLS + FOOTER + 52;
  const viewH = Math.round(Math.max(300, Math.min(440, body - fixed)));
  const heading = useMemo(
    () =>
      String(Math.round(noise((kit.queueIndex + 2) * 7.3) * 359)).padStart(
        3,
        '0',
      ),
    [kit.queueIndex],
  );

  if (!kit.track) return null;
  const s = colors.skin;
  const position = Math.max(1, kit.queueIndex + 1);
  const pct = `${(kit.progress * 100).toFixed(2)}%` as const;
  const repeatOne = kit.repeatMode === RepeatMode.Track;
  const tools = [
    {
      key: 'queue',
      caption: 'COLA',
      label: `Abrir cola de reproducción con ${kit.queueCount} canciones`,
      on: false,
      onPress: kit.openQueue,
    },
    {
      key: 'lyrics',
      caption: 'LETRAS',
      label: `Abrir letras de ${kit.track.title}`,
      on: false,
      onPress: kit.openLyrics,
    },
    {
      key: 'shuffle',
      caption: 'MEZCLA',
      label: kit.shuffle ? 'Desactivar mezcla' : 'Activar mezcla',
      on: kit.shuffle,
      onPress: kit.toggleShuffle,
    },
    {
      key: 'repeat',
      caption: repeatOne ? 'UNA' : kit.repeatOn ? 'TODO' : 'REPETIR',
      label: kit.repeatLabel,
      on: kit.repeatOn,
      onPress: kit.cycleRepeat,
    },
    {
      key: 'more',
      caption: 'MÁS',
      label: 'Más opciones: temporizador, velocidad, ecualizador y acciones',
      on: more,
      onPress: () => setMore(true),
    },
  ];

  return (
    <View
      style={[
        styles.player,
        {
          backgroundColor: s.bg,
          paddingTop: insets.top,
          paddingBottom: insets.bottom + 6,
        },
      ]}
    >
      <DragHeader gesture={headerGesture} style={styles.header}>
        <Pressable
          accessibilityLabel="Cerrar reproductor"
          accessibilityRole="button"
          onPress={onClose}
          style={styles.headerButton}
        >
          <Svg fill="none" height={24} viewBox="0 0 24 24" width={24}>
            <Path
              d="M5 9l7 7 7-7"
              stroke={s.ink}
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2.4}
            />
          </Svg>
        </Pressable>
        <View style={styles.headerInfo}>
          <Text numberOfLines={1} style={[styles.heading, { color: s.ink }]}>
            RUMBO {heading}°
          </Text>
          <Text numberOfLines={1} style={[styles.source, { color: s.sub }]}>
            {kit.sourceLabel} · {position} de {kit.queueCount}
          </Text>
        </View>
        <Pressable
          accessibilityLabel={
            kit.favorite ? 'Quitar de favoritas' : 'Añadir a favoritas'
          }
          accessibilityRole="button"
          onPress={kit.toggleFavorite}
          style={styles.headerButton}
        >
          <Svg height={24} viewBox="0 0 24 24" width={24}>
            <Path
              d="M12 20s-7-4.4-9-9.2C1.7 7.4 4 4 7.3 4c2 0 3.6 1.1 4.7 2.8C13.1 5.1 14.7 4 16.7 4 20 4 22.3 7.4 21 10.8 19 15.6 12 20 12 20z"
              fill={kit.favorite ? s.accent : 'none'}
              stroke={kit.favorite ? s.accent : s.ink}
              strokeLinejoin="round"
              strokeWidth={2.2}
            />
          </Svg>
        </Pressable>
      </DragHeader>

      <Windshield clock={clock} height={viewH} kit={kit} width={W} />

      <View style={styles.grow} />

      <SeekArea kit={kit} style={[styles.throttle, { width: W }]}>
        <View
          style={[
            styles.slot,
            { borderColor: s.line, backgroundColor: s.panel },
          ]}
        >
          <View
            style={[
              styles.fill,
              {
                width: pct,
                backgroundColor: s.accent,
                boxShadow: `0 0 12px ${s.accent}`,
              },
            ]}
          />
          <View pointerEvents="none" style={styles.notches}>
            {Array.from({ length: 18 }, (_, i) => (
              <View key={i} style={[styles.notch, { backgroundColor: s.bg }]} />
            ))}
          </View>
        </View>
        <View
          pointerEvents="none"
          style={[
            styles.handle,
            { left: pct, borderColor: s.ink, backgroundColor: s.panel },
          ]}
        >
          <View style={[styles.grip, { backgroundColor: s.ink }]} />
          <View style={[styles.grip, { backgroundColor: s.accent }]} />
          <View style={[styles.grip, { backgroundColor: s.ink }]} />
        </View>
      </SeekArea>
      <View style={[styles.times, { width: W }]}>
        <Text style={[styles.time, { color: s.sub }]}>
          {formatTime(kit.position)}
        </Text>
        <Text style={[styles.time, { color: s.sub }]}>ACELERADOR</Text>
        <Text style={[styles.time, { color: s.sub }]}>
          {formatTime(kit.duration)}
        </Text>
      </View>

      <View style={styles.grow} />

      <View style={[styles.transport, { width: W }]}>
        <ConsoleKey
          caption="ATRÁS"
          disabled={!kit.ready || kit.busy}
          forward={false}
          label="Canción anterior"
          lit={false}
          onPress={kit.previous}
        />
        <Ignition clock={clock} kit={kit} />
        <ConsoleKey
          caption="SALTO"
          disabled={!kit.ready || kit.busy}
          forward
          label="Siguiente canción"
          lit
          onPress={kit.next}
        />
      </View>

      <View style={[styles.tools, { width: W }]}>
        {tools.map(tool => (
          <Toggle
            key={tool.key}
            caption={tool.caption}
            label={tool.label}
            on={tool.on}
            onPress={tool.onPress}
          />
        ))}
      </View>

      <Text style={[styles.footer, { color: s.sub }]}>SISTEMAS EN LÍNEA</Text>

      {more ? (
        <Auxiliary kit={kit} onClose={() => setMore(false)} width={W} />
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  player: { flex: 1, alignItems: 'center' },
  header: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    height: HEADER,
    paddingHorizontal: 6,
  },
  headerButton: {
    width: 46,
    height: 46,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerInfo: { flex: 1, minWidth: 0, alignItems: 'center' },
  heading: { fontFamily: HUD, fontSize: 15, lineHeight: 20, letterSpacing: 3 },
  source: { fontFamily: BODY, fontSize: 12, lineHeight: 15 },
  planetSpot: { position: 'absolute' },
  planet: { position: 'absolute', top: 0, overflow: 'hidden' },
  surface: { flexDirection: 'row' },
  reticle: { position: 'absolute' },
  corner: { position: 'absolute', width: 22, height: 22 },
  tl: { left: 0, top: 0, borderLeftWidth: 2, borderTopWidth: 2 },
  tr: { right: 0, top: 0, borderRightWidth: 2, borderTopWidth: 2 },
  bl: { left: 0, bottom: 0, borderLeftWidth: 2, borderBottomWidth: 2 },
  br: { right: 0, bottom: 0, borderRightWidth: 2, borderBottomWidth: 2 },
  ladderBox: {
    position: 'absolute',
    left: 14,
    width: 14,
    overflow: 'hidden',
    opacity: 0.55,
  },
  ladderStrip: { position: 'absolute', top: -20, gap: 18 },
  tick: { width: 14, height: 2 },
  hud: { fontFamily: HUD, fontSize: 11, lineHeight: 15, letterSpacing: 2 },
  hudStrong: { fontSize: 12 },
  alt: { position: 'absolute', left: 14 },
  speed: { position: 'absolute', right: 14, alignItems: 'flex-end' },
  destination: { position: 'absolute', left: 14, right: 14, bottom: 14 },
  hudRow: { flexDirection: 'row', justifyContent: 'space-between' },
  marquee: { overflow: 'hidden', height: 28, justifyContent: 'center' },
  measure: {
    position: 'absolute',
    width: 4000,
    opacity: 0,
    flexDirection: 'row',
  },
  roll: { flexDirection: 'row', width: 8000 },
  rollGap: { paddingRight: 56 },
  title: { fontFamily: HUD, fontSize: 20, lineHeight: 28 },
  artist: { fontFamily: BODY, fontSize: 14, lineHeight: 18 },
  grow: { flex: 1 },
  throttle: { height: THROTTLE, justifyContent: 'center' },
  slot: {
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    overflow: 'hidden',
  },
  fill: { position: 'absolute', left: 0, top: 0, bottom: 0, opacity: 0.85 },
  notches: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    flexDirection: 'row',
    justifyContent: 'space-evenly',
  },
  notch: { width: 2, height: '100%', opacity: 0.7 },
  handle: {
    position: 'absolute',
    top: 2,
    width: 22,
    height: 44,
    marginLeft: -11,
    borderRadius: 6,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  grip: { width: 12, height: 2 },
  times: {
    height: TIMES,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  time: { fontFamily: HUD, fontSize: 12, lineHeight: 16, letterSpacing: 2 },
  transport: {
    height: TRANSPORT,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  key: {
    width: 84,
    height: 84,
    borderRadius: 14,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  keyLed: { width: 26, height: 4, borderRadius: 2 },
  keyText: { fontFamily: HUD, fontSize: 10, lineHeight: 13, letterSpacing: 2 },
  ignitionBox: {
    width: 108,
    height: 108,
    alignItems: 'center',
    justifyContent: 'center',
  },
  halo: { position: 'absolute', width: 108, height: 108, borderRadius: 54 },
  ignition: {
    width: 96,
    height: 96,
    borderRadius: 48,
    borderWidth: 3,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
  },
  engine: { fontFamily: HUD, fontSize: 11, lineHeight: 14, letterSpacing: 2 },
  tools: {
    height: TOOLS,
    marginTop: 12,
    flexDirection: 'row',
    gap: 8,
  },
  toggle: {
    flex: 1,
    minWidth: 0,
    borderRadius: 10,
    borderWidth: 1.5,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  led: { width: 8, height: 8, borderRadius: 4 },
  lever: {
    width: 18,
    height: 26,
    borderRadius: 5,
    borderWidth: 1.5,
    padding: 2,
  },
  knob: { height: 10, borderRadius: 3 },
  toggleText: {
    fontFamily: HUD,
    fontSize: 10,
    lineHeight: 13,
    letterSpacing: 1,
    paddingHorizontal: 2,
  },
  footer: {
    height: FOOTER,
    marginTop: 8,
    fontFamily: HUD,
    fontSize: 10,
    lineHeight: 14,
    letterSpacing: 3,
  },
  sheet: {
    position: 'absolute',
    alignSelf: 'center',
    borderRadius: 16,
    borderWidth: 1.5,
    padding: 16,
    gap: 4,
  },
  sheetHead: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sheetTitle: {
    fontFamily: HUD,
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 3,
  },
  sheetClose: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sheetRow: {
    minHeight: 52,
    borderTopWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
  },
  sheetLabel: { fontFamily: BODY, fontSize: 16, lineHeight: 21, flexShrink: 1 },
  sheetValue: {
    fontFamily: HUD,
    fontSize: 12,
    lineHeight: 16,
    letterSpacing: 1,
  },
});
