import {
  ScrollView,
  Text,
  TextInput,
  View,
  Modal,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Check,
  Disc3,
  Heart,
  ListEnd,
  ListPlus,
  ListStart,
  Plus,
  Share2,
  Trash2,
  User,
  X,
} from 'lucide-react-native';
import { useApp } from '../state/AppContext';
import {
  radius,
  screenPadding,
  spacing,
  createStyles,
  useColors,
} from '../theme/theme';
import { Button, IconButton } from '../ui/Buttons';
import { Cover } from '../ui/Cover';
import { ListRow, SquareIcon } from '../ui/Rows';
import { Sheet, SheetAction } from '../ui/Sheet';
import { Tap } from '../ui/Tap';
import { albumKey, artistKey, matchesQuery } from '../utils/collections';
import { formatTime } from '../utils/formatTime';
import { formatTrackCount } from '../utils/formatTrackCount';

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
              setPlaylistTarget(track);
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

export function AddToPlaylistSheet() {
  const { colors } = useColors();
  const styles = useStyles();
  const { music, playlistTarget, setPlaylistTarget } = useApp();
  const {
    playlists,
    playlistTracksById,
    addTrackToPlaylist,
    setPlaylistNameDialog,
    setPlaylistDialogError,
  } = music;
  const close = () => setPlaylistTarget(null);

  return (
    <Sheet
      closeLabel="Cerrar listas"
      onClose={close}
      subtitle={playlistTarget?.title}
      title="Añadir a una lista"
      visible={playlistTarget !== null}
    >
      <ScrollView>
        <ListRow
          leading={
            <SquareIcon>
              <Plus color={colors.text} size={22} />
            </SquareIcon>
          }
          onPress={() => {
            setPlaylistDialogError(null);
            setPlaylistNameDialog({
              playlistId: null,
              name: '',
              trackIds: playlistTarget ? [playlistTarget.id] : [],
            });
            close();
          }}
          showChevron={false}
          title="Nueva lista"
        />
        {playlists.map(playlist => {
          const items = playlistTracksById.get(playlist.id) ?? [];
          const included =
            playlistTarget !== null &&
            playlist.trackIds.includes(playlistTarget.id);
          return (
            <ListRow
              key={playlist.id}
              accessibilityLabel={`Añadir a ${playlist.name}`}
              leading={<Cover size={48} uri={items[0]?.artwork} />}
              onPress={() => {
                if (playlistTarget) {
                  addTrackToPlaylist(playlist, playlistTarget);
                }
                close();
              }}
              showChevron={false}
              subtitle={formatTrackCount(items.length)}
              title={playlist.name}
              trailing={
                included ? (
                  <View style={styles.included}>
                    <Check color={colors.accent} size={20} />
                  </View>
                ) : undefined
              }
            />
          );
        })}
      </ScrollView>
    </Sheet>
  );
}

function Dialog({
  visible,
  onClose,
  title,
  children,
}: {
  visible: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  const { type } = useColors();
  const styles = useStyles();
  return (
    <Modal
      animationType="fade"
      onRequestClose={onClose}
      statusBarTranslucent
      transparent
      visible={visible}
    >
      <View style={styles.dialogOverlay}>
        <View style={styles.dialog}>
          <Text style={type.headline}>{title}</Text>
          {children}
        </View>
      </View>
    </Modal>
  );
}

export function PlaylistDialogs() {
  const { colors, type } = useColors();
  const styles = useStyles();
  const { music } = useApp();
  const {
    playlistNameDialog,
    setPlaylistNameDialog,
    savePlaylistName,
    playlistDialogError,
    savingPlaylist,
    playlistToDelete,
    setPlaylistToDelete,
    confirmDeletePlaylist,
  } = music;

  return (
    <>
      <Dialog
        onClose={() => setPlaylistNameDialog(null)}
        title={
          playlistNameDialog?.playlistId ? 'Renombrar lista' : 'Nueva lista'
        }
        visible={playlistNameDialog !== null}
      >
        <TextInput
          accessibilityLabel="Nombre de la lista"
          autoFocus
          maxLength={60}
          onChangeText={name =>
            setPlaylistNameDialog(current =>
              current ? { ...current, name } : current,
            )
          }
          onSubmitEditing={savePlaylistName}
          placeholder="Nombre de la lista"
          placeholderTextColor={colors.textSecondary}
          returnKeyType="done"
          selectionColor={colors.accent}
          style={styles.input}
          value={playlistNameDialog?.name ?? ''}
        />
        {playlistDialogError ? (
          <Text style={styles.error}>{playlistDialogError}</Text>
        ) : null}
        <View style={styles.dialogActions}>
          <Button
            label="Cancelar"
            onPress={() => setPlaylistNameDialog(null)}
            variant="tonal"
          />
          <Button
            accessibilityLabel="Guardar nombre de la lista"
            disabled={savingPlaylist}
            label="Guardar"
            onPress={savePlaylistName}
          />
        </View>
      </Dialog>
      <Dialog
        onClose={() => setPlaylistToDelete(null)}
        title="Eliminar lista"
        visible={playlistToDelete !== null}
      >
        <Text style={type.secondary}>
          ¿Eliminar “{playlistToDelete?.name}”? Las canciones no se borran del
          teléfono.
        </Text>
        {playlistDialogError ? (
          <Text style={styles.error}>{playlistDialogError}</Text>
        ) : null}
        <View style={styles.dialogActions}>
          <Button
            label="Cancelar"
            onPress={() => setPlaylistToDelete(null)}
            variant="tonal"
          />
          <Button
            accessibilityLabel={`Confirmar eliminación de ${playlistToDelete?.name}`}
            disabled={savingPlaylist}
            label="Eliminar"
            onPress={confirmDeletePlaylist}
          />
        </View>
      </Dialog>
    </>
  );
}

export function PlaylistTrackPicker() {
  const { colors, type } = useColors();
  const styles = useStyles();
  const { music } = useApp();
  const insets = useSafeAreaInsets();
  const {
    tracks,
    trackPickerPlaylistId,
    setTrackPickerPlaylistId,
    draftPlaylistTrackIds,
    toggleDraftPlaylistTrack,
    savePlaylistTracks,
    savingPlaylist,
    playlistTrackSearch,
    setPlaylistTrackSearch,
  } = music;
  const visible = tracks.filter(track =>
    matchesQuery(
      `${track.title} ${track.artist} ${track.album}`,
      playlistTrackSearch,
    ),
  );

  return (
    <Modal
      animationType="slide"
      onRequestClose={() => setTrackPickerPlaylistId(null)}
      statusBarTranslucent
      visible={trackPickerPlaylistId !== null}
    >
      <View style={[styles.picker, { paddingTop: insets.top + spacing.xs }]}>
        <View style={styles.pickerHeader}>
          <IconButton
            label="Cerrar selector"
            onPress={() => setTrackPickerPlaylistId(null)}
          >
            <X color={colors.text} size={24} />
          </IconButton>
          <Text style={[type.title, styles.pickerTitle]}>
            {formatTrackCount(draftPlaylistTrackIds.size)}
          </Text>
          <Button
            accessibilityLabel="Guardar canciones de la lista"
            disabled={savingPlaylist}
            label="Guardar"
            onPress={savePlaylistTracks}
          />
        </View>
        <TextInput
          accessibilityLabel="Buscar canciones para la lista"
          onChangeText={setPlaylistTrackSearch}
          placeholder="Buscar canciones"
          placeholderTextColor={colors.textSecondary}
          selectionColor={colors.accent}
          style={[styles.input, styles.pickerSearch]}
          value={playlistTrackSearch}
        />
        <FlatList
          contentContainerStyle={{ paddingBottom: insets.bottom }}
          data={visible}
          initialNumToRender={14}
          keyboardShouldPersistTaps="handled"
          keyExtractor={track => track.id}
          renderItem={({ item }) => {
            const selected = draftPlaylistTrackIds.has(item.id);
            return (
              <Tap
                accessibilityRole="checkbox"
                accessibilityLabel={`${item.title} de ${item.artist}`}
                accessibilityState={{ checked: selected }}
                onPress={() => toggleDraftPlaylistTrack(item.id)}
                style={styles.pickerRow}
              >
                <Cover size={48} uri={item.artwork} />
                <View style={styles.pickerText}>
                  <Text numberOfLines={1} style={type.body}>
                    {item.title}
                  </Text>
                  <Text numberOfLines={1} style={type.secondary}>
                    {item.artist}
                  </Text>
                </View>
                {selected ? <Check color={colors.accent} size={22} /> : null}
              </Tap>
            );
          }}
        />
      </View>
    </Modal>
  );
}

const useStyles = createStyles(colors => ({
  included: { paddingRight: spacing.lg },
  dialogOverlay: {
    alignItems: 'center',
    backgroundColor: colors.scrim,
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  dialog: {
    backgroundColor: colors.surface,
    borderRadius: radius.sheet,
    gap: spacing.lg,
    maxWidth: 420,
    padding: spacing.xl,
    width: '100%',
  },
  input: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.md,
    color: colors.text,
    fontSize: 15,
    height: 48,
    paddingHorizontal: spacing.md,
  },
  error: { color: colors.danger, fontSize: 14 },
  dialogActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
  picker: { backgroundColor: colors.background, flex: 1 },
  pickerHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
    paddingRight: screenPadding,
  },
  pickerTitle: { flex: 1 },
  pickerSearch: { marginHorizontal: screenPadding, marginVertical: spacing.sm },
  pickerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 64,
    paddingHorizontal: screenPadding,
  },
  pickerText: { flex: 1, gap: 2, minWidth: 0 },
}));
