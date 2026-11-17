import { ScrollView } from 'react-native';
import {
  Disc3,
  Heart,
  ListEnd,
  ListPlus,
  BellRing,
  ListStart,
  Pencil,
  Share2,
  Trash2,
  User,
} from 'lucide-react-native';
import { useApp } from '../state/AppContext';
import { useColors } from '../theme/theme';
import { Sheet, SheetAction } from '../ui/Sheet';
import { albumKey, artistKey } from '../domain/collections';
import { formatTime } from '../utils/formatTime';

export function TrackMenu() {
  const { colors } = useColors();
  const { music, nav, setPlaylistTarget } = useApp();
  const {
    queueTrackDialog,
    setQueueTrackDialog,
    favoriteIds,
    toggleFavorite,
    addTrackToQueue,
    confirmDeleteTrack,
    setPlayerExpanded,
  } = music;
  const track = queueTrackDialog?.track;
  const iconProps = { color: colors.textSecondary, size: 22 };
  const close = () => setQueueTrackDialog(null);
  const goTo = (key: string, title: string) => {
    close();
    setPlayerExpanded(false);
    nav.push({ name: 'collection', ref: { kind: 'group', key, title } });
  };
  const isFavorite = track ? favoriteIds.has(track.id) : false;

  return (
    <Sheet
      closeLabel="Cerrar opciones"
      onClose={close}
      subtitle={
        track ? `${track.artist} · ${formatTime(track.duration)}` : undefined
      }
      title={track?.title}
      visible={queueTrackDialog !== null}
    >
      {track ? (
        <ScrollView>
          <SheetAction
            accessibilityLabel={`Reproducir ${track.title} a continuación`}
            icon={<ListStart {...iconProps} />}
            label="Reproducir a continuación"
            onPress={() => addTrackToQueue(track, 'next')}
          />
          <SheetAction
            accessibilityLabel={`Añadir ${track.title} al final de la cola`}
            icon={<ListEnd {...iconProps} />}
            label="Añadir al final de la cola"
            onPress={() => addTrackToQueue(track, 'end')}
          />
          <SheetAction
            accessibilityLabel={`Añadir ${track.title} a una lista`}
            icon={<ListPlus {...iconProps} />}
            label="Añadir a una lista"
            onPress={() => {
              close();
              setPlaylistTarget([track]);
            }}
          />
          <SheetAction
            icon={
              <Heart
                color={isFavorite ? colors.accent : colors.textSecondary}
                fill={isFavorite ? colors.accent : 'none'}
                size={22}
              />
            }
            label={isFavorite ? 'Quitar de favoritas' : 'Añadir a favoritas'}
            onPress={() => {
              toggleFavorite(track);
              close();
            }}
          />
          <SheetAction
            icon={<Disc3 {...iconProps} />}
            label="Ir al álbum"
            onPress={() => goTo(albumKey(track), track.album)}
          />
          <SheetAction
            icon={<User {...iconProps} />}
            label="Ir al artista"
            onPress={() => goTo(artistKey(track), track.artist)}
          />
          <SheetAction
            accessibilityLabel={`Compartir ${track.title}`}
            icon={<Share2 {...iconProps} />}
            label="Compartir"
            onPress={() => music.shareTrack(track)}
          />
          <SheetAction
            accessibilityLabel={`Editar los datos de ${track.title}`}
            icon={<Pencil {...iconProps} />}
            label="Editar datos"
            onPress={() => {
              close();
              music.setEditingTrack(track);
            }}
          />
          <SheetAction
            accessibilityLabel={`Usar ${track.title} como tono de llamada`}
            icon={<BellRing {...iconProps} />}
            label="Usar como tono de llamada"
            onPress={() => music.setRingtone(track)}
          />
          {queueTrackDialog?.fromLibrary ? (
            <SheetAction
              accessibilityLabel={`Eliminar ${track.title} del dispositivo`}
              danger
              icon={<Trash2 color={colors.danger} size={22} />}
              label="Eliminar del dispositivo"
              onPress={() => confirmDeleteTrack(track)}
            />
          ) : null}
        </ScrollView>
      ) : null}
    </Sheet>
  );
}
