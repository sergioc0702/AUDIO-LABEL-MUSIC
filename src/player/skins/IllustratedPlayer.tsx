import { ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { RepeatMode } from 'react-native-track-player';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { createStyles, spacing, useColors } from '../../theme/theme';
import { formatTime } from '../../utils/formatTime';
import {
  ThemedButton,
  ThemedPlay,
  ThemedSeek,
  ThemedTool,
  lookFor,
} from './ThemedControls';
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
  const look = lookFor(kind, colors);
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
          ? 'Repite cola'
          : 'Repetir',
      label: kit.repeatLabel,
      active: kit.repeatOn,
      onPress: kit.cycleRepeat,
    },
    tools[2],
    tools[3],
    { ...tools[4], caption: 'Ecualizador' },
    {
      key: 'menu',
      caption: 'Más',
      label: `Más acciones para ${kit.track.title}`,
      active: false,
      onPress: kit.openMenu,
    },
  ];
  const headerFont = look.headerFont ? { fontFamily: look.headerFont } : null;
  const upper = look.upper ? style.upper : null;
  return (
    <View
      style={[
        style.player,
        { paddingTop: insets.top, paddingBottom: insets.bottom + 8 },
      ]}
    >
      <DragHeader gesture={headerGesture} style={style.header}>
        <ThemedButton
          icon="close"
          label="Cerrar reproductor"
          look={look}
          onPress={onClose}
          size={48}
        />
        <View style={style.headerInfo}>
          <Text
            numberOfLines={1}
            style={[type.label, style.secondary, headerFont, upper]}
          >
            {TITLES[kind]}
          </Text>
          <Text numberOfLines={1} style={[type.caption, style.secondary]}>
            {kit.sourceLabel} · {kit.queueIndex + 1} de {kit.queueCount}
          </Text>
        </View>
        <ThemedButton
          active={kit.favorite}
          icon={kit.favorite ? 'heart' : 'heartOff'}
          label={kit.favorite ? 'Quitar de favoritas' : 'Añadir a favoritas'}
          look={look}
          onPress={kit.toggleFavorite}
          size={48}
        />
      </DragHeader>

      <ScrollView
        contentContainerStyle={style.content}
        showsVerticalScrollIndicator={false}
      >
        <View style={[style.columns, landscape && style.landscape]}>
          <View style={style.artColumn}>
            <Scene kind={kind} kit={kit} />
            <View style={style.songTitles}>
              <Text
                numberOfLines={2}
                style={[type.headline, style.trackTitle, upper]}
              >
                {kit.track.title}
              </Text>
              <Text numberOfLines={1} style={[type.body, style.secondary]}>
                {kit.track.artist}
                {kit.track.album ? ` · ${kit.track.album}` : ''}
              </Text>
            </View>
            <SeekArea kit={kit} style={style.seekTouch}>
              <ThemedSeek look={look} progress={kit.progress} />
            </SeekArea>
            <View style={style.times}>
              <Text style={[type.caption, style.secondary]}>
                {formatTime(kit.position)}
              </Text>
              <Text style={[type.caption, style.secondary]}>
                {formatTime(kit.duration)}
              </Text>
            </View>
          </View>

          <View style={style.controlsColumn}>
            <View style={style.transport}>
              <View style={style.side}>
                <ThemedButton
                  disabled={!kit.ready || kit.busy}
                  icon="prev"
                  label="Canción anterior"
                  look={look}
                  onPress={kit.previous}
                  size={look.knobs ? 68 : 62}
                />
                {look.knobs ? (
                  <Text style={[type.caption, style.knobCaption]}>
                    Anterior
                  </Text>
                ) : null}
              </View>
              <ThemedPlay
                disabled={!kit.ready}
                isPlaying={kit.isPlaying}
                look={look}
                onPress={kit.toggle}
              />
              <View style={style.side}>
                <ThemedButton
                  disabled={!kit.ready || kit.busy}
                  icon="next"
                  label="Canción siguiente"
                  look={look}
                  onPress={kit.next}
                  size={look.knobs ? 68 : 62}
                />
                {look.knobs ? (
                  <Text style={[type.caption, style.knobCaption]}>
                    Siguiente
                  </Text>
                ) : null}
              </View>
            </View>
            <View style={style.toolsGrid}>
              {toolRows.map(item => (
                <ThemedTool
                  key={item.key}
                  active={item.active}
                  caption={item.caption}
                  label={item.label}
                  look={look}
                  onPress={item.onPress}
                  textStyle={type.label}
                />
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
    gap: spacing.sm,
    minHeight: 64,
    paddingHorizontal: spacing.md,
  },
  headerInfo: { alignItems: 'center', flex: 1, minWidth: 0 },
  secondary: { color: colors.textSecondary },
  upper: { textTransform: 'uppercase' },
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
  songTitles: { paddingTop: spacing.md },
  trackTitle: { color: colors.text, fontSize: 22 },
  seekTouch: { height: 48, justifyContent: 'center' },
  times: { flexDirection: 'row', justifyContent: 'space-between' },
  transport: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.lg,
    justifyContent: 'center',
    minHeight: 104,
  },
  side: { alignItems: 'center', gap: 4 },
  knobCaption: {
    color: colors.textSecondary,
    letterSpacing: 2,
    textTransform: 'uppercase',
  },
  toolsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'center',
    paddingTop: spacing.sm,
  },
}));
