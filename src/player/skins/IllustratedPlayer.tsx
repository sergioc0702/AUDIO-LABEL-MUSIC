import {
  Pressable,
  ScrollView,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';
import {
  Heart,
  Repeat,
  Repeat1,
  Shuffle,
  SkipBack,
  SkipForward,
} from 'lucide-react-native';
import { RepeatMode } from 'react-native-track-player';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { IconButton } from '../../ui/Buttons';
import { createStyles, spacing, useColors } from '../../theme/theme';
import { formatTime } from '../../utils/formatTime';
import { PlayPauseIcon } from '../PlayPauseIcon';
import { ScenesA } from './scenes/ScenesA';
import { ScenesB } from './scenes/ScenesB';
import { ScenesC } from './scenes/ScenesC';
import { ScenesD } from './scenes/ScenesD';
import {
  DragHeader,
  SeekArea,
  playerTools,
  type PlayerKit,
  type SkinProps,
} from './kit';

export type IllustratedKind =
  | 'acuario'
  | 'radio'
  | 'pixel'
  | 'acuarela'
  | 'neon'
  | 'constelacion'
  | 'jardin'
  | 'origami'
  | 'cyberpunk'
  | 'vaporwave'
  | 'manga'
  | 'steampunk'
  | 'naveespacial'
  | 'y2k'
  | 'western'
  | 'fantasiamedieval'
  | 'lofi'
  | 'terrorgotico'
  | 'playa';

const TITLES: Record<IllustratedKind, string> = {
  acuario: 'Pecera',
  radio: 'Radio de bulbos',
  pixel: 'Nivel de música',
  acuarela: 'Acuarela sonora',
  neon: 'Neón de bar',
  constelacion: 'Constelación',
  jardin: 'Jardín',
  origami: 'Origami',
  cyberpunk: 'Distrito en línea',
  vaporwave: 'Canal vaporwave',
  manga: 'Capítulo',
  steampunk: 'Máquina de vapor',
  naveespacial: 'Puente de mando',
  y2k: 'Disco Y2K',
  western: 'Se busca',
  fantasiamedieval: 'Hechizo',
  lofi: 'Para estudiar',
  terrorgotico: 'Noche gótica',
  playa: 'Playa',
};

function Scene({ kind, kit }: { kind: IllustratedKind; kit: PlayerKit }) {
  if (
    kind === 'acuario' ||
    kind === 'radio' ||
    kind === 'pixel' ||
    kind === 'acuarela' ||
    kind === 'neon'
  ) {
    return <ScenesA kind={kind} kit={kit} />;
  }
  if (
    kind === 'constelacion' ||
    kind === 'jardin' ||
    kind === 'origami' ||
    kind === 'cyberpunk' ||
    kind === 'vaporwave'
  ) {
    return <ScenesB kind={kind} kit={kit} />;
  }
  if (
    kind === 'manga' ||
    kind === 'steampunk' ||
    kind === 'naveespacial' ||
    kind === 'y2k' ||
    kind === 'western'
  ) {
    return <ScenesC kind={kind} kit={kit} />;
  }
  return <ScenesD kind={kind} kit={kit} />;
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
  const playerTitle = TITLES[kind];
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
