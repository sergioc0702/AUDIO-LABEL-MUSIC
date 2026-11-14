import { useEffect, useState, type ReactNode } from 'react';
import {
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
  useFrameCallback,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
  type SharedValue,
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { G, Path, Rect } from 'react-native-svg';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { createStyles, useColors } from '../../theme/theme';
import { Cover } from '../../ui/Cover';
import { formatTime } from '../../utils/formatTime';
import {
  DragHeader,
  SeekArea,
  useTrackChange,
  usePlayerKit,
  type PlayerKit,
  type SkinProps,
} from '../../player/kit/playerKit';

const two = (value: number) => String(value).padStart(2, '0');
/** Each scrolling layer is two copies wide so it can loop seamlessly. */
const LAYER = 280;
const COINS = [
  [0.3, 0.52],
  [0.36, 0.46],
  [0.42, 0.52],
  [0.68, 0.56],
  [0.74, 0.5],
  [0.8, 0.56],
];

/* ───────── the game screen ───────── */

/** A layer that scrolls left in whole pixels, driven by the game clock. */
function Scroller({
  clock,
  speed,
  style,
  children,
}: {
  clock: SharedValue<number>;
  speed: number;
  style: StyleProp<ViewStyle>;
  children: ReactNode;
}) {
  const move = useAnimatedStyle(() => ({
    // Snapped to 2 px so it moves like an old console, not smoothly.
    transform: [
      { translateX: -Math.floor(((clock.value * speed) % LAYER) / 2) * 2 },
    ],
  }));
  return (
    <Animated.View pointerEvents="none" style={[styles.layer, style, move]}>
      {children}
    </Animated.View>
  );
}

/** The hero sprite: two running frames and a jump on every beat. */
function Hero({
  clock,
  running,
}: {
  clock: SharedValue<number>;
  running: boolean;
}) {
  const { colors } = useColors();
  const { hero, face, suit, ink } = colors.skin;
  const jump = useAnimatedStyle(() => {
    if (!running) return { transform: [{ translateY: 0 }] };
    const beat = (clock.value * 1.56) % 1;
    const up = beat < 0.4 ? beat / 0.4 : beat < 0.6 ? 1 : (1 - beat) / 0.4;
    return { transform: [{ translateY: -Math.round(up * 9) * 3 }] };
  });
  const frameA = useAnimatedStyle(() => ({
    opacity: !running || Math.floor(clock.value * 6) % 2 === 0 ? 1 : 0,
  }));
  const frameB = useAnimatedStyle(() => ({
    opacity: running && Math.floor(clock.value * 6) % 2 === 1 ? 1 : 0,
  }));
  const body = (legs: string) => (
    <Svg height={30} viewBox="0 0 8 10" width={24}>
      <Path d="M2 0h4v1H2zM1 1h6v1H1z" fill={hero} />
      <Rect fill={face} height={2} width={4} x={2} y={2} />
      <Rect fill={ink} height={1} width={1} x={4} y={2} />
      <Rect fill={suit} height={3} width={6} x={1} y={4} />
      <Path d={legs} fill={ink} />
    </Svg>
  );
  return (
    <Animated.View pointerEvents="none" style={[styles.hero, jump]}>
      <Animated.View style={[StyleSheet.absoluteFill, frameA]}>
        {body('M1 7h2v2H1zM5 7h2v1H5zM6 8h2v1H6z')}
      </Animated.View>
      <Animated.View style={[StyleSheet.absoluteFill, frameB]}>
        {body('M3 7h2v2H3zM0 8h2v1H0zM5 7h1v2H5z')}
      </Animated.View>
    </Animated.View>
  );
}

/** A spinning coin; it squashes sideways like a sprite turning. */
function Coin({
  clock,
  x,
  y,
  phase,
  collected,
}: {
  clock: SharedValue<number>;
  x: number;
  y: number;
  phase: number;
  collected: boolean;
}) {
  const { colors } = useColors();
  const spin = useAnimatedStyle(() => {
    const step = Math.floor((clock.value * 5 + phase) % 4);
    return { transform: [{ scaleX: [1, 0.65, 0.35, 0.65][step] }] };
  });
  return (
    <Animated.View
      pointerEvents="none"
      style={[
        styles.coin,
        { left: x, top: y, backgroundColor: colors.skin.coin },
        collected && styles.collected,
        spin,
      ]}
    />
  );
}

/**
 * The game screen. One clock on the UI thread drives every moving part:
 * clouds, hills and ground at their own speeds, the hero and the coins.
 */
function GameScreen({
  kit,
  width,
  height,
}: {
  kit: PlayerKit;
  width: number;
  height: number;
}) {
  const { colors } = useColors();
  const local = useStyles();
  const reduced = useReducedMotion();
  const { screen, s1, s2, ink, accent, cloud, ground } = colors.skin;
  const clock = useSharedValue(0);
  const banner = useSharedValue(0);
  const blink = useSharedValue(1);
  const running = kit.lively && !reduced;

  const frame = useFrameCallback(info => {
    'worklet';
    clock.value += Math.min(0.05, (info.timeSincePreviousFrame ?? 16) / 1000);
  }, false);
  useEffect(() => {
    frame.setActive(running && kit.visible);
  }, [frame, kit.visible, running]);

  // "NIVEL 08 · ¡LISTO!" shows for a moment when a new song starts.
  useTrackChange(kit.track?.id, () => {
    banner.value = withSequence(
      withTiming(1, { duration: 0 }),
      withDelay(1300, withTiming(0, { duration: 0 })),
    );
  });
  // "PAUSA" blinks while the music is stopped.
  useEffect(() => {
    if (!kit.isPlaying && !reduced) {
      blink.value = withRepeat(
        withSequence(
          withTiming(1, { duration: 500, easing: Easing.steps(1) }),
          withTiming(0, { duration: 500, easing: Easing.steps(1) }),
        ),
        -1,
      );
    } else {
      cancelAnimation(blink);
      blink.value = 1;
    }
  }, [blink, kit.isPlaying, reduced]);
  const bannerStyle = useAnimatedStyle(() => ({ opacity: banner.value }));
  const pauseStyle = useAnimatedStyle(() => ({
    opacity: banner.value > 0 ? 0 : blink.value,
  }));

  const groundH = Math.round(height * 0.16);
  const level = Math.max(1, kit.queueIndex + 1);
  const coinsTaken = Math.floor(kit.progress * COINS.length);
  return (
    <SeekArea
      kit={kit}
      label="Pantalla de juego con un personaje que camina mientras suena la música"
      style={[local.screen, { width, height, backgroundColor: screen }]}
    >
      <Scroller
        clock={clock}
        speed={20}
        style={[local.clouds, { top: height * 0.17 }]}
      >
        <Svg height={30} viewBox={`0 0 ${LAYER * 2} 30`} width={LAYER * 2}>
          <G fill={cloud}>
            {[0, LAYER].map(offset => (
              <G key={offset}>
                <Rect height={8} width={36} x={20 + offset} y={10} />
                <Rect height={6} width={18} x={28 + offset} y={4} />
                <Rect height={6} width={28} x={150 + offset} y={14} />
                <Rect height={8} width={40} x={200 + offset} y={6} />
              </G>
            ))}
          </G>
        </Svg>
      </Scroller>
      <Scroller
        clock={clock}
        speed={46}
        style={[local.hills, { bottom: groundH }]}
      >
        <Svg height={70} viewBox={`0 0 ${LAYER * 2} 70`} width={LAYER * 2}>
          {[0, LAYER].map(offset => (
            <Path
              key={offset}
              d="M0 70V46h12v-8h12v-8h16v8h12v8h20V30h12V18h20v12h12v16h24V38h12v-8h20v8h12v8h20v24z"
              fill={s1}
              transform={`translate(${offset} 0)`}
            />
          ))}
        </Svg>
      </Scroller>
      <View
        style={[
          local.platform,
          { left: width * 0.42, top: height * 0.4, backgroundColor: s2 },
        ]}
      />
      <View
        style={[
          local.question,
          {
            left: width * 0.42 + 52,
            top: height * 0.4,
            backgroundColor: accent,
          },
        ]}
      >
        <Text style={[local.questionMark, { color: screen }]}>?</Text>
      </View>
      {COINS.map(([x, y], index) => (
        <Coin
          key={index}
          clock={clock}
          collected={index < coinsTaken}
          phase={index}
          x={x * width}
          y={y * height}
        />
      ))}
      <Scroller
        clock={clock}
        speed={140}
        style={[local.ground, { height: groundH }]}
      >
        <Svg
          height={groundH}
          viewBox={`0 0 ${LAYER * 2} 34`}
          preserveAspectRatio="none"
          width={LAYER * 2}
        >
          <Rect fill={s2} height={34} width={LAYER * 2} />
          <Rect fill={ground} height={4} width={LAYER * 2} />
          <Rect
            fill="#000000"
            height={2}
            opacity={0.22}
            width={LAYER * 2}
            y={13}
          />
          <Rect
            fill="#000000"
            height={2}
            opacity={0.22}
            width={LAYER * 2}
            y={24}
          />
          {Array.from({ length: 20 }, (_, index) => (
            <Rect
              key={index}
              fill="#000000"
              height={9}
              opacity={0.22}
              width={2}
              x={14 + index * 28}
              y={4}
            />
          ))}
        </Svg>
      </Scroller>
      <View style={[local.heroSpot, { left: width * 0.16, bottom: groundH }]}>
        <Hero clock={clock} running={running} />
      </View>

      <View pointerEvents="none" style={local.hud}>
        <Text style={[local.hudText, { color: ink }]}>
          SCORE {String(Math.floor(kit.position * 37)).padStart(6, '0')}
        </Text>
        <Text style={[local.hudText, { color: ink }]}>
          ⦿×{two(Math.floor(kit.progress * 40))}
        </Text>
        <Text style={[local.hudText, { color: ink }]}>
          {formatTime(kit.position)}
        </Text>
      </View>
      <View pointerEvents="none" style={local.levelBar}>
        <View style={[local.levelTrack]} />
        <View
          style={[
            local.levelFill,
            { width: `${kit.progress * 100}%`, backgroundColor: ink },
          ]}
        />
        <View
          style={[
            local.levelMark,
            { left: `${kit.progress * 100}%`, backgroundColor: accent },
          ]}
        />
        <Text style={[local.flag, { color: ink }]}>⚑</Text>
      </View>
      <Animated.View pointerEvents="none" style={[local.banner, bannerStyle]}>
        <View
          style={[
            local.bannerBox,
            { backgroundColor: screen, borderColor: ink },
          ]}
        >
          <Text
            style={[local.bannerText, { color: ink, textShadowColor: screen }]}
          >
            NIVEL {two(level)}
          </Text>
          <Text
            style={[local.bannerSmall, { color: ink, textShadowColor: screen }]}
          >
            ¡LISTO!
          </Text>
        </View>
      </Animated.View>
      {!kit.isPlaying ? (
        <Animated.View pointerEvents="none" style={[local.banner, pauseStyle]}>
          <View
            style={[
              local.bannerBox,
              { backgroundColor: screen, borderColor: ink },
            ]}
          >
            <Text
              style={[
                local.bannerText,
                { color: ink, textShadowColor: screen },
              ]}
            >
              PAUSA
            </Text>
          </View>
        </Animated.View>
      ) : null}
    </SeekArea>
  );
}

/* ───────── console parts ───────── */

/** The cartridge sticking out of the top; it pops out and back in on a song change. */
function Cartridge({ kit }: { kit: PlayerKit }) {
  const { colors } = useColors();
  const local = useStyles();
  const reduced = useReducedMotion();
  const pop = useSharedValue(0);
  useTrackChange(kit.track?.id, () => {
    if (reduced) return;
    pop.value = withSequence(
      withTiming(1, { duration: 180, easing: Easing.out(Easing.quad) }),
      withDelay(
        120,
        withTiming(0, { duration: 320, easing: Easing.out(Easing.cubic) }),
      ),
    );
  });
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: -pop.value * 44 }],
  }));
  const { cart, label, labelInk } = colors.skin;
  return (
    <Animated.View
      pointerEvents="none"
      style={[local.cartridge, { backgroundColor: cart }, style]}
    >
      <View style={[local.cartLabel, { backgroundColor: label }]}>
        <Cover size={26} uri={kit.track?.artwork ?? null} />
        <Text numberOfLines={1} style={[local.cartTitle, { color: labelInk }]}>
          {kit.track?.title}
        </Text>
      </View>
    </Animated.View>
  );
}

function DpadKey({
  label,
  onPress,
  disabled,
  style,
  path,
}: {
  label: string;
  onPress: () => void;
  disabled?: boolean;
  style: StyleProp<ViewStyle>;
  path: string;
}) {
  const { colors } = useColors();
  const local = useStyles();
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled }}
      disabled={disabled}
      onPress={onPress}
      style={({ pressed }) => [
        local.dpadKey,
        style,
        pressed && local.pressed,
        disabled && local.dim,
      ]}
    >
      <Svg height={16} viewBox="0 0 8 8" width={16}>
        <Path d={path} fill={colors.skin.dpadInk} />
      </Svg>
    </Pressable>
  );
}

/** Timer, speed, equalizer and the song menu, framed like a game menu. */
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
  const { screen, ink } = colors.skin;
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
          {
            bottom: insets.bottom + 24,
            backgroundColor: screen,
            boxShadow: `0 0 0 4px ${ink}, 0 0 0 8px ${screen}, 0 0 0 12px ${ink}`,
          },
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
            <Text style={[local.panelTitle, { color: ink }]}>X</Text>
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
            style={({ pressed }) => [local.panelRow, pressed && local.pressed]}
          >
            <Text style={[local.panelText, { color: ink }]}>▶ {row.label}</Text>
            <Text style={[local.panelText, { color: ink }]}>{row.value}</Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

/* ───────── player ───────── */

export function PixelPlayer({ covered, headerGesture, onClose }: SkinProps) {
  const kit = usePlayerKit({ covered });
  const { colors } = useColors();
  const local = useStyles();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const reduced = useReducedMotion();
  const [more, setMore] = useState(false);
  const glow = useSharedValue(0.6);
  useEffect(() => {
    if (covered) setMore(false);
  }, [covered]);
  useEffect(() => {
    if (kit.lively && !reduced) {
      glow.value = withRepeat(
        withTiming(1, { duration: 1400, easing: Easing.inOut(Easing.sin) }),
        -1,
        true,
      );
    } else {
      cancelAnimation(glow);
      glow.value = withTiming(0.6, { duration: 300 });
    }
  }, [glow, kit.lively, reduced]);
  const ledStyle = useAnimatedStyle(() => ({ opacity: glow.value }));

  if (!kit.track) return null;
  const track = kit.track;
  const s = colors.skin;
  const consoleWidth = width - 32;
  const screenWidth = consoleWidth - 28 - 44 - 22;
  const screenHeight = Math.round(
    Math.max(170, Math.min(screenWidth * 0.8, height * 0.3)),
  );
  const moving = !kit.ready || kit.busy;
  const led = kit.isPlaying ? s.led : 'rgba(0,0,0,0.35)';

  return (
    <View
      style={[
        local.player,
        { paddingTop: insets.top, paddingBottom: insets.bottom + 16 },
      ]}
    >
      <DragHeader gesture={headerGesture} style={local.top}>
        <Pressable
          accessibilityLabel="Cerrar reproductor"
          accessibilityRole="button"
          onPress={onClose}
          style={local.topButton}
        >
          <Svg height={24} viewBox="0 0 8 8" width={24}>
            <Path
              d="M1 2h1v1h1v1h2V3h1V2h1v1H6v1H5v1H3V4H2V3H1z"
              fill={colors.text}
            />
          </Svg>
        </Pressable>
        <Text numberOfLines={1} style={local.topTitle}>
          1UP · NIVEL {two(Math.max(1, kit.queueIndex + 1))}
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
          <Svg height={24} viewBox="0 0 8 8" width={24}>
            <Path
              d="M1 1h2v1h2V1h2v1h1v2H7v1H6v1H5v1H3V6H2V5H1V4H0V2h1z"
              fill={kit.favorite ? colors.text : 'none'}
              stroke={colors.text}
              strokeWidth={0.6}
            />
          </Svg>
        </Pressable>
      </DragHeader>

      <View style={local.stage}>
        <View>
          <Cartridge kit={kit} />
          <View
            style={[
              local.console,
              {
                backgroundColor: s.body,
              },
            ]}
          >
            <View style={[local.bezel, { backgroundColor: s.bezel }]}>
              <Text style={[local.bezelText, { color: s.bezelInk }]}>
                PIXEL · STEREO SOUND
              </Text>
              <View style={local.bezelRow}>
                <View style={local.power}>
                  <Animated.View
                    style={[
                      local.led,
                      { backgroundColor: led, boxShadow: `0 0 8px ${led}` },
                      ledStyle,
                    ]}
                  />
                  <Text style={[local.powerText, { color: s.bezelInk }]}>
                    POWER
                  </Text>
                </View>
                <GameScreen
                  height={screenHeight}
                  kit={kit}
                  width={screenWidth}
                />
              </View>
            </View>

            <View style={local.titles}>
              <Text
                accessibilityRole="header"
                numberOfLines={1}
                style={[local.title, { color: s.bodyInk }]}
              >
                {track.title}
              </Text>
              <Text
                numberOfLines={1}
                style={[local.artist, { color: s.bodyInk }]}
              >
                {track.artist} · {track.album}
              </Text>
            </View>

            <View style={local.controls}>
              {/* Each label sits right beside its own arrow. */}
              <View style={local.dpadArea}>
                <Text style={[local.tagInline, { color: s.bodyInk }]}>
                  COLA
                </Text>
                <View style={local.dpadRow}>
                  <Text
                    style={[
                      local.tagInline,
                      local.sideTag,
                      { color: s.bodyInk },
                    ]}
                  >
                    ANT
                  </Text>
                  <View style={local.dpad}>
                    <View
                      style={[
                        local.dpadBar,
                        local.dpadV,
                        { backgroundColor: s.dpad },
                      ]}
                    />
                    <View
                      style={[
                        local.dpadBar,
                        local.dpadH,
                        { backgroundColor: s.dpad },
                      ]}
                    />
                    <DpadKey
                      label={`Abrir cola de reproducción con ${kit.queueCount} canciones`}
                      onPress={kit.openQueue}
                      path="M3 2h2v1h1v1h1v1H1V4h1V3h1z"
                      style={local.keyUp}
                    />
                    <DpadKey
                      label={`Abrir letras de ${track.title}`}
                      onPress={kit.openLyrics}
                      path="M1 3h6v1H6v1H5v1H3V5H2V4H1z"
                      style={local.keyDown}
                    />
                    <DpadKey
                      disabled={moving}
                      label="Canción anterior"
                      onPress={kit.previous}
                      path="M5 1h1v6H5V6H4V5H3V3h1V2h1z"
                      style={local.keyLeft}
                    />
                    <DpadKey
                      disabled={moving}
                      label="Siguiente canción"
                      onPress={kit.next}
                      path="M2 1h1v1h1v1h1v2H4v1H3v1H2z"
                      style={local.keyRight}
                    />
                  </View>
                  <Text
                    style={[
                      local.tagInline,
                      local.sideTag,
                      { color: s.bodyInk },
                    ]}
                  >
                    SIG
                  </Text>
                </View>
                <Text style={[local.tagInline, { color: s.bodyInk }]}>
                  LETRAS
                </Text>
              </View>

              {/* A and B stay staggered like a handheld, with straight labels. */}
              <View style={local.abArea}>
                <View style={[local.abItem, local.bItem]}>
                  <Pressable
                    accessibilityLabel="Más opciones: temporizador, velocidad, ecualizador y acciones"
                    accessibilityRole="button"
                    onPress={() => setMore(true)}
                    style={({ pressed }) => [
                      local.round,
                      local.bButton,
                      { backgroundColor: s.bBtn },
                      pressed && local.sunk,
                    ]}
                  >
                    <Text style={[local.roundText, { color: s.btnInk }]}>
                      B
                    </Text>
                  </Pressable>
                  <Text style={[local.tagInline, { color: s.bodyInk }]}>
                    MÁS
                  </Text>
                </View>
                <View style={local.abItem}>
                  <Pressable
                    accessibilityLabel={kit.isPlaying ? 'Pausar' : 'Reproducir'}
                    accessibilityRole="button"
                    accessibilityState={{ disabled: !kit.ready }}
                    disabled={!kit.ready}
                    onPress={kit.toggle}
                    style={({ pressed }) => [
                      local.round,
                      local.aButton,
                      { backgroundColor: s.aBtn },
                      pressed && local.sunk,
                      !kit.ready && local.dim,
                    ]}
                  >
                    <Text
                      style={[
                        local.roundText,
                        local.aText,
                        { color: s.btnInk },
                      ]}
                    >
                      A
                    </Text>
                  </Pressable>
                  <Text style={[local.tagInline, { color: s.bodyInk }]}>
                    {kit.isPlaying ? 'PAUSA' : 'PLAY'}
                  </Text>
                </View>
              </View>
            </View>

            {/* The pills and the speaker share one row, so they never overlap. */}
            <View style={local.bottomRow}>
              <View style={local.pills}>
                {[
                  {
                    key: 'shuffle',
                    caption: 'MEZCLA',
                    label: kit.shuffle ? 'Desactivar mezcla' : 'Activar mezcla',
                    on: kit.shuffle,
                    onPress: kit.toggleShuffle,
                    disabled: moving,
                  },
                  {
                    key: 'repeat',
                    caption: 'REPETIR',
                    label: kit.repeatLabel,
                    on: kit.repeatOn,
                    onPress: kit.cycleRepeat,
                    disabled: !kit.ready,
                  },
                ].map(pill => (
                  <Pressable
                    key={pill.key}
                    accessibilityLabel={pill.label}
                    accessibilityRole="button"
                    accessibilityState={{
                      selected: pill.on,
                      disabled: pill.disabled,
                    }}
                    disabled={pill.disabled}
                    onPress={pill.onPress}
                    style={({ pressed }) => [
                      local.pillBox,
                      pressed && local.pressed,
                      pill.disabled && local.dim,
                    ]}
                  >
                    <View
                      style={[
                        local.pill,
                        { backgroundColor: pill.on ? s.pillOn : s.pill },
                      ]}
                    />
                    <Text style={[local.tagInline, { color: s.bodyInk }]}>
                      {pill.caption}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View pointerEvents="none" style={local.grille}>
                {[0, 1, 2, 3, 4, 5].map(index => (
                  <View key={index} style={local.slot} />
                ))}
              </View>
            </View>
          </View>
        </View>
      </View>

      {more ? <MoreOptions kit={kit} onClose={() => setMore(false)} /> : null}
    </View>
  );
}

const styles = StyleSheet.create({
  layer: { position: 'absolute', left: 0, width: LAYER * 2 },
  hero: { width: 24, height: 30 },
  coin: {
    position: 'absolute',
    width: 12,
    height: 12,
    borderRadius: 6,
    boxShadow: 'inset -2px 0 0 rgba(0,0,0,0.25)',
  },
  collected: { opacity: 0 },
});

const useStyles = createStyles(colors => {
  const px = colors.design.fonts.display;
  const vt = colors.design.fonts.body;
  return {
    player: {
      flex: 1,
      paddingHorizontal: 16,
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
      color: colors.text,
      fontFamily: px,
      fontSize: 10,
      lineHeight: 16,
    },
    stage: { flex: 1, justifyContent: 'space-evenly', paddingTop: 44 },
    cartridge: {
      position: 'absolute',
      alignSelf: 'center',
      top: -42,
      width: 180,
      height: 70,
      borderTopLeftRadius: 6,
      borderTopRightRadius: 6,
      paddingHorizontal: 10,
      paddingTop: 8,
      boxShadow: 'inset 0 3px 0 rgba(255,255,255,0.25)',
    },
    cartLabel: {
      height: 34,
      borderRadius: 3,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 5,
      overflow: 'hidden',
    },
    cartTitle: { flex: 1, fontFamily: px, fontSize: 7, lineHeight: 11 },
    console: {
      borderTopLeftRadius: 18,
      borderTopRightRadius: 18,
      borderBottomLeftRadius: 18,
      borderBottomRightRadius: 54,
      paddingHorizontal: 14,
      paddingTop: 16,
      paddingBottom: 28,
      gap: 22,
      boxShadow:
        'inset 0 3px 0 rgba(255,255,255,0.3), inset 0 -4px 0 rgba(0,0,0,0.18), 0 12px 24px rgba(0,0,0,0.25)',
    },
    bezel: {
      borderTopLeftRadius: 10,
      borderTopRightRadius: 10,
      borderBottomLeftRadius: 10,
      borderBottomRightRadius: 34,
      paddingTop: 8,
      paddingBottom: 22,
      paddingRight: 22,
      gap: 8,
    },
    bezelText: {
      marginLeft: 44,
      fontFamily: px,
      fontSize: 6,
      lineHeight: 10,
      letterSpacing: 0.6,
    },
    bezelRow: { flexDirection: 'row', alignItems: 'center' },
    power: { width: 44, alignItems: 'center', gap: 4 },
    led: { width: 8, height: 8, borderRadius: 4 },
    powerText: { fontFamily: vt, fontSize: 11 },
    screen: {
      overflow: 'hidden',
      boxShadow: 'inset 0 0 0 2px rgba(0,0,0,0.25)',
    },
    clouds: { height: 30 },
    hills: { height: 70 },
    ground: { bottom: 0 },
    platform: {
      position: 'absolute',
      width: 52,
      height: 14,
      boxShadow: 'inset 0 -3px 0 rgba(0,0,0,0.25)',
    },
    question: {
      position: 'absolute',
      width: 14,
      height: 14,
      alignItems: 'center',
      justifyContent: 'center',
    },
    questionMark: { fontFamily: px, fontSize: 8, lineHeight: 12 },
    heroSpot: { position: 'absolute' },
    hud: {
      position: 'absolute',
      left: 6,
      right: 6,
      top: 6,
      flexDirection: 'row',
      justifyContent: 'space-between',
    },
    hudText: { fontFamily: px, fontSize: 8, lineHeight: 12 },
    levelBar: { position: 'absolute', left: 8, right: 14, top: 24, height: 6 },
    levelTrack: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      backgroundColor: 'rgba(0,0,0,0.18)',
    },
    levelFill: { position: 'absolute', left: 0, top: 0, bottom: 0 },
    levelMark: {
      position: 'absolute',
      top: -3,
      marginLeft: -4,
      width: 8,
      height: 12,
    },
    flag: {
      position: 'absolute',
      right: -10,
      top: -9,
      fontFamily: px,
      fontSize: 9,
      lineHeight: 14,
    },
    bannerBox: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      alignItems: 'center',
      gap: 6,
      borderWidth: 3,
    },
    banner: {
      position: 'absolute',
      left: 0,
      right: 0,
      top: 0,
      bottom: 0,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    bannerText: {
      fontFamily: px,
      fontSize: 14,
      lineHeight: 22,
      textShadowOffset: { width: 2, height: 2 },
      textShadowRadius: 0,
    },
    bannerSmall: {
      fontFamily: px,
      fontSize: 9,
      lineHeight: 14,
      textShadowOffset: { width: 2, height: 2 },
      textShadowRadius: 0,
    },
    titles: { gap: 8, paddingHorizontal: 8 },
    title: { fontFamily: px, fontSize: 13, lineHeight: 22 },
    artist: { fontFamily: vt, fontSize: 21, lineHeight: 22, opacity: 0.75 },
    controls: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
    },
    dpadArea: { alignItems: 'center', gap: 6 },
    dpadRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
    sideTag: { width: 24, textAlign: 'center' },
    dpad: { width: 108, height: 108 },
    dpadBar: { position: 'absolute', borderRadius: 6 },
    dpadV: { left: 36, top: 0, width: 36, height: 108 },
    dpadH: { left: 0, top: 36, width: 108, height: 36 },
    dpadKey: {
      position: 'absolute',
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    keyUp: { left: 36, top: 0 },
    keyDown: { left: 36, top: 72 },
    keyLeft: { left: 0, top: 36 },
    keyRight: { left: 72, top: 36 },
    abArea: { flexDirection: 'row', alignItems: 'flex-start', gap: 8 },
    abItem: { alignItems: 'center', gap: 8 },
    bItem: { marginTop: 40 },
    round: {
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 999,
      boxShadow: '0 4px 0 rgba(0,0,0,0.3)',
    },
    bButton: { width: 52, height: 52 },
    aButton: { width: 62, height: 62 },
    sunk: { transform: [{ translateY: 3 }], boxShadow: 'none' },
    roundText: { fontFamily: px, fontSize: 14, lineHeight: 20 },
    aText: { fontSize: 16, lineHeight: 22 },
    tagInline: { fontFamily: px, fontSize: 7, lineHeight: 10 },
    bottomRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingLeft: 30,
      paddingRight: 10,
    },
    pills: { flexDirection: 'row', gap: 24 },
    pillBox: { alignItems: 'center', gap: 8 },
    pill: {
      width: 56,
      height: 14,
      borderRadius: 7,
      boxShadow: '0 2px 0 rgba(0,0,0,0.3), inset 0 0 0 2px rgba(0,0,0,0.15)',
    },
    grille: {
      flexDirection: 'row',
      gap: 6,
      transform: [{ rotate: '-24deg' }],
    },
    slot: {
      width: 5,
      height: 36,
      borderRadius: 3,
      backgroundColor: 'rgba(0,0,0,0.22)',
    },
    pressed: { opacity: 0.7 },
    dim: { opacity: 0.45 },
    scrim: { backgroundColor: colors.scrim },
    panel: { position: 'absolute', left: 28, right: 28, padding: 12 },
    panelHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingLeft: 6,
    },
    panelTitle: { fontFamily: px, fontSize: 12, lineHeight: 18 },
    panelClose: {
      width: 44,
      height: 44,
      alignItems: 'center',
      justifyContent: 'center',
    },
    panelRow: {
      minHeight: 46,
      paddingHorizontal: 8,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    panelText: { fontFamily: vt, fontSize: 22, lineHeight: 26 },
  };
});
