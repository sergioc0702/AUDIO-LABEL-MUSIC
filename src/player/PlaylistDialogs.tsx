import {
  ScrollView,
  Text,
  TextInput,
  View,
  Modal,
  FlatList,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Check, Plus, X } from 'lucide-react-native';
import { useApp } from '../state/AppContext';
import { spacing, useColors } from '../theme/theme';
import { Button, IconButton } from '../ui/Buttons';
import { Cover } from '../ui/Cover';
import { ListRow, SquareIcon } from '../ui/Rows';
import { Sheet } from '../ui/Sheet';
import { Tap } from '../ui/Tap';
import { matchesQuery } from '../domain/collections';
import { formatTrackCount } from '../utils/formatTrackCount';

import { useStyles } from './trackMenuStyles';

export function AddToPlaylistSheet() {
  const { colors } = useColors();
  const styles = useStyles();
  const { music, playlistTarget, setPlaylistTarget } = useApp();
  const {
    playlists,
    playlistTracksById,
    addTrackToPlaylist,
    addTracksToPlaylist,
    clearSelection,
    setPlaylistNameDialog,
    setPlaylistDialogError,
  } = music;
  const close = () => setPlaylistTarget(null);
  const targets = playlistTarget ?? [];
  const single = targets.length === 1 ? targets[0] : null;

  return (
    <Sheet
      closeLabel="Cerrar listas"
      onClose={close}
      subtitle={single ? single.title : formatTrackCount(targets.length)}
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
              trackIds: targets.map(item => item.id),
            });
            clearSelection();
            close();
          }}
          showChevron={false}
          title="Nueva lista"
        />
        {playlists.map(playlist => {
          const items = playlistTracksById.get(playlist.id) ?? [];
          const included =
            targets.length > 0 &&
            targets.every(item => playlist.trackIds.includes(item.id));
          return (
            <ListRow
              key={playlist.id}
              accessibilityLabel={`Añadir a ${playlist.name}`}
              leading={<Cover size={48} uri={items[0]?.artwork} />}
              onPress={() => {
                if (single) {
                  addTrackToPlaylist(playlist, single);
                } else if (targets.length > 0) {
                  addTracksToPlaylist(playlist, targets);
                }
                clearSelection();
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
