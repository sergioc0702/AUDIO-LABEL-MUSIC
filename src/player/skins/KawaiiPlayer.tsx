import { useEffect, useRef, useState } from 'react';
import { Text, useWindowDimensions, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import { useSharedValue } from 'react-native-reanimated';
import { scheduleOnRN } from 'react-native-worklets';
import {
  ChevronDown,
  Heart,
  Minus,
  MoreVertical,
  Plus,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
} from 'lucide-react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Svg, { Circle, Ellipse, Path } from 'react-native-svg';
import { RepeatMode } from 'react-native-track-player';
import { useMediaVolume } from '../../hooks/useMediaVolume';
import { createStyles, spacing, useColors } from '../../theme/theme';
import { IconButton } from '../../ui/Buttons';
import { Cover } from '../../ui/Cover';
import { Tap } from '../../ui/Tap';
import { formatTime } from '../../utils/formatTime';
import { PlayPauseIcon } from '../PlayPauseIcon';
import { dogMood } from './dogMood';
import { ShihTzu } from './ShihTzu';
import { DragHeader, playerTools, usePlayerKit, type SkinProps } from './kit';

const HEART =
  'M0 8 C -12 -2 -10 -13 -3 -13 C 0 -13 0 -9 0 -9 C 0 -9 0 -13 3 -13 C 10 -13 12 -2 0 8 Z';

function Bone({ color, line }: { color: string; line: string }) {
  return (
    <Svg height={34} viewBox="0 0 52 36" width={50}>
      <Path
        d="M14 11 C 12 2 2 3 3 11 C -1 13 -1 23 3 25 C 2 33 12 34 14 25 L 38 25 C 40 34 50 33 49 25 C 53 23 53 13 49 11 C 50 3 40 2 38 11 Z"
        fill={color}
        stroke={line}
        strokeLinejoin="round"
        strokeWidth={3}
      />
    </Svg>
  );
}

function VolumeBone({
  level,
  fixed,
  onChange,
}: {
  level: number;
  fixed: boolean;
  onChange: (level: number) => void;
}) {
  const { colors, type } = useColors();
  const styles = useStyles();
  const width = useSharedValue(1);
  const last = useRef({ at: 0, level });
  const send = (next: number) => {
    const now = Date.now();
    if (
      Math.abs(next - last.current.level) < 0.02 &&
      now - last.current.at < 120
    )
      return;
    last.current = { at: now, level: next };
    onChange(next);
  };
  const drag = Gesture.Pan()
    .enabled(!fixed)
    .minDistance(0)
    .onBegin(event => {
      scheduleOnRN(send, Math.max(0, Math.min(1, event.x / width.value)));
    })
    .onUpdate(event => {
      scheduleOnRN(send, Math.max(0, Math.min(1, event.x / width.value)));
    });
  const percent = Math.round(level * 100);

  return (
    <View style={styles.volume}>
      <IconButton
        disabled={fixed}
        label="Bajar volumen"
        onPress={() => onChange(level - 0.1)}
      >
        <View style={styles.round}>
          <Minus color={colors.text} size={22} strokeWidth={3} />
        </View>
      </IconButton>
      <GestureDetector gesture={drag}>
        <View
          accessible
          accessibilityActions={[
            { name: 'increment', label: 'Subir volumen' },
            { name: 'decrement', label: 'Bajar volumen' },
          ]}
          accessibilityLabel={
            fixed ? 'Este teléfono no permite cambiar el volumen' : 'Volumen'
          }
          accessibilityRole="adjustable"
          accessibilityValue={{
            min: 0,
            max: 100,
            now: percent,
            text: `${percent} %`,
          }}
          collapsable={false}
          onAccessibilityAction={event =>
            onChange(
              level +
                (event.nativeEvent.actionName === 'increment' ? 0.1 : -0.1),
            )
          }
          onLayout={event => {
            width.value = Math.max(1, event.nativeEvent.layout.width);
          }}
          style={styles.boneTrack}
        >
          <View style={styles.boneRail} />
          <View style={[styles.boneFill, { width: `${percent}%` }]} />
          <View style={[styles.bone, { left: `${percent}%` }]}>
            <Bone color="#ffffff" line={colors.text} />
          </View>
        </View>
      </GestureDetector>
      <IconButton
        disabled={fixed}
        label="Subir volumen"
        onPress={() => onChange(level + 0.1)}
      >
        <View style={styles.round}>
          <Plus color={colors.text} size={22} strokeWidth={3} />
        </View>
      </IconButton>
      {fixed ? (
        <Text style={[type.caption, styles.fixed]}>
          Volumen fijo en este teléfono
        </Text>
      ) : null}
    </View>
  );
}

function PawButton({
  playing,
  onPress,
  disabled,
}: {
  playing: boolean;
  onPress: () => void;
  disabled: boolean;
}) {
  const { colors } = useColors();
  const styles = useStyles();
  return (
    <Tap
      accessibilityLabel={playing ? 'Pausar' : 'Reproducir'}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      pressedScale={0.92}
      style={styles.paw}
    >
      <Svg height={96} viewBox="0 0 96 96" width={96}>
        <Ellipse cx="18" cy="38" fill={colors.control} rx="11" ry="14" />
        <Ellipse cx="36" cy="18" fill={colors.control} rx="11" ry="14" />
        <Ellipse cx="60" cy="18" fill={colors.control} rx="11" ry="14" />
        <Ellipse cx="78" cy="38" fill={colors.control} rx="11" ry="14" />
        <Path
          d="M48 36 C 66 36 80 54 80 68 C 80 84 64 88 48 82 C 32 88 16 84 16 68 C 16 54 30 36 48 36 Z"
          fill={colors.control}
        />
      </Svg>
      <View style={styles.pawIcon}>
        <PlayPauseIcon color={colors.onControl} isPlaying={playing} size={26} />
      </View>
    </Tap>
  );
}

export function KawaiiPlayer({ covered, headerGesture, onClose }: SkinProps) {
  const kit = usePlayerKit({ covered });
  const { colors, type } = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { width, height } = useWindowDimensions();
  const volume = useMediaVolume(kit.visible);
  const [petted, setPetted] = useState(false);
  const stage = Math.max(220, Math.min(width - 40, height * 0.42, 400));
  const radius = stage / 2 - 14;
  const length = 2 * Math.PI * radius;
  const seekingRing = useSharedValue(false);
  const progressAt = (x: number, y: number) => {
    'worklet';
    const dx = x - stage / 2;
    const dy = y - stage / 2;
    return (
      (Math.atan2(dy, dx) + Math.PI / 2 + Math.PI * 2) % (Math.PI * 2)
    ) / (Math.PI * 2);
  };
  const seekRing = (x: number, y: number) => {
    'worklet';
    scheduleOnRN(kit.seekTo, progressAt(x, y));
  };
  const ringPan = Gesture.Pan()
    .enabled(kit.ready && kit.duration > 0)
    .minDistance(6)
    .onBegin(event => {
      const dx = event.x - stage / 2;
      const dy = event.y - stage / 2;
      seekingRing.value = Math.hypot(dx, dy) >= radius * 0.74;
    })
    .onEnd((event, success) => {
      if (success && seekingRing.value) seekRing(event.x, event.y);
    })
    .onFinalize(() => {
      seekingRing.value = false;
    });
  const ringTap = Gesture.Tap().onEnd((event, success) => {
    if (!success) return;
    const dx = event.x - stage / 2;
    const dy = event.y - stage / 2;
    if (Math.hypot(dx, dy) < radius * 0.74) {
      scheduleOnRN(setPetted, true);
    } else if (kit.ready && kit.duration > 0) {
      seekRing(event.x, event.y);
    }
  });
  const angle = kit.progress * Math.PI * 2 - Math.PI / 2;
  const mood = dogMood(
    kit.isPlaying,
    volume.fixed ? 0.5 : volume.level,
    petted,
  );

  useEffect(() => {
    if (!petted) return;
    const timer = setTimeout(() => setPetted(false), 1800);
    return () => clearTimeout(timer);
  }, [petted]);

  if (!kit.track) return null;
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
          <ChevronDown color={colors.text} size={28} strokeWidth={2.6} />
        </IconButton>
        <View style={styles.titleBlock}>
          <Text
            accessibilityRole="header"
            numberOfLines={1}
            style={[type.headline, styles.center]}
          >
            {kit.track.title}
          </Text>
          <Text numberOfLines={1} style={[type.secondary, styles.center]}>
            {kit.track.artist}
          </Text>
        </View>
        <IconButton
          label={`Más acciones para ${kit.track.title}`}
          onPress={kit.openMenu}
        >
          <MoreVertical color={colors.text} size={24} />
        </IconButton>
      </DragHeader>

      <View style={styles.middle}>
        <View style={{ width: stage, height: stage }}>
          <GestureDetector gesture={Gesture.Exclusive(ringPan, ringTap)}>
            <View
              accessible
              accessibilityActions={[
                { name: 'increment', label: 'Avanzar 10 segundos' },
                { name: 'decrement', label: 'Retroceder 10 segundos' },
              ]}
              accessibilityHint="Toca o arrastra el aro para cambiar la posición; toca al perrito para acariciarlo"
              accessibilityLabel="Avance de la canción"
              accessibilityRole="adjustable"
              accessibilityState={{ disabled: !kit.ready || kit.duration <= 0 }}
              accessibilityValue={{
                min: 0,
                max: Math.ceil(kit.duration),
                now: Math.floor(kit.position),
                text: formatTime(kit.position),
              }}
              collapsable={false}
              onAccessibilityAction={event => {
                if (!kit.ready || kit.duration <= 0) return;
                const delta =
                  event.nativeEvent.actionName === 'increment' ? 10 : -10;
                kit.seekTo((kit.position + delta) / kit.duration);
              }}
              style={StyleSheetFill}
            >
              <Svg height={stage} width={stage}>
                <Circle
                  cx={stage / 2}
                  cy={stage / 2}
                  fill={colors.skin.disc}
                  r={radius}
                />
                <Circle
                  cx={stage / 2}
                  cy={stage / 2}
                  fill="none"
                  r={radius}
                  stroke={colors.skin.ring}
                  strokeWidth={16}
                />
                <Circle
                  cx={stage / 2}
                  cy={stage / 2}
                  fill="none"
                  r={radius}
                  stroke={colors.accent}
                  strokeDasharray={`${kit.progress * length} ${length}`}
                  strokeLinecap="round"
                  strokeWidth={16}
                  transform={`rotate(-90 ${stage / 2} ${stage / 2})`}
                />
                <Path
                  d={HEART}
                  fill="#ffffff"
                  stroke={colors.accent}
                  strokeLinejoin="round"
                  strokeWidth={2.6}
                  transform={`translate(${stage / 2 + Math.cos(angle) * radius} ${
                    stage / 2 + Math.sin(angle) * radius
                  }) scale(1.4)`}
                />
              </Svg>
            </View>
          </GestureDetector>
          <View
            pointerEvents="none"
            style={[styles.dog, { left: stage * 0.1, top: stage * 0.11 }]}
          >
            <ShihTzu
              active={kit.visible}
              bow={colors.skin.lazo}
              mood={mood}
              size={stage * 0.8}
            />
          </View>
          <View
            pointerEvents="none"
            style={[
              styles.sticker,
              { width: stage * 0.21, height: stage * 0.21 },
            ]}
          >
            <Cover round size={stage * 0.21 - 8} uri={kit.track.artwork} />
          </View>
        </View>
        <Text style={[type.bodyStrong, styles.time]}>
          {formatTime(kit.position)}{' '}
          <Text style={type.secondary}>de {formatTime(kit.duration)}</Text>
        </Text>
      </View>

      <VolumeBone
        fixed={volume.fixed}
        level={volume.level}
        onChange={volume.change}
      />

      <View style={styles.transport}>
        <IconButton
          accessibilityState={{ selected: kit.shuffle }}
          disabled={!kit.ready || kit.busy}
          label={kit.shuffle ? 'Desactivar mezcla' : 'Activar mezcla'}
          onPress={kit.toggleShuffle}
        >
          <Shuffle
            color={kit.shuffle ? colors.accent : colors.text}
            size={24}
            strokeWidth={2.6}
          />
        </IconButton>
        <Tap
          accessibilityLabel="Canción anterior"
          accessibilityRole="button"
          onPress={kit.previous}
          pressedScale={0.92}
          style={styles.soft}
        >
          <SkipBack color={colors.text} fill={colors.text} size={26} />
        </Tap>
        <PawButton
          disabled={!kit.ready}
          onPress={kit.toggle}
          playing={kit.isPlaying}
        />
        <Tap
          accessibilityLabel="Siguiente canción"
          accessibilityRole="button"
          onPress={kit.next}
          pressedScale={0.92}
          style={styles.soft}
        >
          <SkipForward color={colors.text} fill={colors.text} size={26} />
        </Tap>
        <IconButton
          accessibilityState={{ selected: kit.repeatOn }}
          disabled={!kit.ready}
          label={kit.repeatLabel}
          onPress={kit.cycleRepeat}
        >
          <RepeatIcon
            color={kit.repeatOn ? colors.accent : colors.text}
            size={24}
            strokeWidth={2.6}
          />
        </IconButton>
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
            size={24}
          />
        </IconButton>
        {playerTools(kit).map(tool => (
          <Tap
            key={tool.key}
            accessibilityLabel={tool.label}
            accessibilityRole="button"
            onPress={tool.onPress}
            pressedScale={0.95}
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

const StyleSheetFill = {
  position: 'absolute' as const,
  left: 0,
  right: 0,
  top: 0,
  bottom: 0,
};

const useStyles = createStyles(colors => ({
  player: {
    flex: 1,
    backgroundColor: colors.background,
    paddingHorizontal: spacing.md,
  },
  top: { flexDirection: 'row', alignItems: 'center', minHeight: 56 },
  titleBlock: { flex: 1, minWidth: 0 },
  center: { textAlign: 'center' },
  middle: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: spacing.sm,
  },
  dog: { position: 'absolute' },
  sticker: {
    position: 'absolute',
    right: 0,
    top: 0,
    borderRadius: 999,
    borderWidth: 4,
    borderColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    transform: [{ rotate: '8deg' }],
  },
  time: { fontVariant: ['tabular-nums'] },
  volume: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    justifyContent: 'center',
  },
  round: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceHigh,
  },
  boneTrack: {
    flex: 1,
    height: 52,
    justifyContent: 'center',
    marginHorizontal: spacing.md,
  },
  boneRail: { height: 12, borderRadius: 6, backgroundColor: colors.skin.ring },
  boneFill: {
    position: 'absolute',
    left: 0,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.accent,
  },
  bone: { position: 'absolute', marginLeft: -25 },
  fixed: { width: '100%', textAlign: 'center' },
  transport: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: spacing.sm,
  },
  soft: {
    width: 62,
    height: 62,
    borderRadius: 31,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceHigh,
  },
  paw: { width: 96, height: 96 },
  pawIcon: {
    position: 'absolute',
    left: 30,
    top: 50,
    width: 36,
    height: 30,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tools: { flexDirection: 'row', alignItems: 'center', gap: spacing.xs },
  tool: {
    flex: 1,
    minHeight: 52,
    borderRadius: colors.design.radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.surfaceHigh,
    paddingHorizontal: 2,
  },
}));
