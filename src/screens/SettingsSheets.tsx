// Sheets and dialogs opened from Ajustes and from a song's menu: the blend
// between songs, the folders shown in the library and a song's details.
import { useEffect, useState } from 'react';
import {
  Modal,
  ScrollView,
  Switch,
  Text,
  TextInput,
  View,
  useWindowDimensions,
} from 'react-native';
import { Check } from 'lucide-react-native';
import { useApp } from '../state/AppContext';
import { crossfadeChoices } from '../state/useMusicController';
import { spacing, createStyles, useColors } from '../theme/theme';
import { Button } from '../ui/Buttons';
import { Sheet, SheetAction } from '../ui/Sheet';
import { formatTrackCount } from '../utils/formatTrackCount';
import type { TrackEditForm } from '../utils/trackEdits';

export function CrossfadeSheet() {
  const { colors } = useColors();
  const { playerSheet, setPlayerSheet, music } = useApp();

  return (
    <Sheet
      closeLabel="Cerrar fundido"
      onClose={() => setPlayerSheet(null)}
      subtitle="El final de una canción se mezcla con el inicio de la siguiente"
      title="Fundido entre canciones"
      visible={playerSheet === 'crossfade'}
    >
      {crossfadeChoices.map(seconds => {
        const selected = seconds === music.crossfadeSeconds;
        return (
          <SheetAction
            key={seconds}
            accessibilityLabel={
              seconds === 0 ? 'Sin fundido' : `Fundido de ${seconds} segundos`
            }
            label={seconds === 0 ? 'Desactivado' : `${seconds} segundos`}
            onPress={() => {
              music.changeCrossfade(seconds);
              setPlayerSheet(null);
            }}
            selected={selected}
            trailing={
              selected ? <Check color={colors.text} size={20} /> : undefined
            }
          />
        );
      })}
    </Sheet>
  );
}

export function FoldersSheet() {
  const { colors, type } = useColors();
  const styles = useStyles();
  const { height } = useWindowDimensions();
  const { playerSheet, setPlayerSheet, music } = useApp();
  const { deviceFolders, excludedFolders, toggleFolderExcluded } = music;

  return (
    <Sheet
      closeLabel="Cerrar carpetas"
      onClose={() => setPlayerSheet(null)}
      subtitle="Apaga las carpetas que no tienen música"
      title="Carpetas de la biblioteca"
      visible={playerSheet === 'folders'}
    >
      <ScrollView style={{ maxHeight: height * 0.62 }}>
        {deviceFolders.length === 0 ? (
          <Text style={[type.secondary, styles.empty]}>
            Aún no se encontró audio en el teléfono.
          </Text>
        ) : null}
        {deviceFolders.map(folder => {
          const shown = !excludedFolders.includes(folder.path);
          return (
            <View key={folder.path} style={styles.folder}>
              <View style={styles.folderText}>
                <Text numberOfLines={1} style={type.body}>
                  {folder.name}
                </Text>
                <Text numberOfLines={1} style={type.secondary}>
                  {formatTrackCount(folder.count)}
                  {folder.path ? ` · ${folder.path}` : ''}
                </Text>
              </View>
              <Switch
                accessibilityLabel={`Mostrar la carpeta ${folder.name}`}
                onValueChange={() => toggleFolderExcluded(folder.path)}
                thumbColor={colors.text}
                trackColor={{ false: colors.outline, true: colors.accent }}
                value={shown}
              />
            </View>
          );
        })}
      </ScrollView>
    </Sheet>
  );
}

const emptyForm: TrackEditForm = {
  title: '',
  artist: '',
  album: '',
  genre: '',
  year: '',
};

const fields: { key: keyof TrackEditForm; label: string; numeric?: boolean }[] =
  [
    { key: 'title', label: 'Título' },
    { key: 'artist', label: 'Artista' },
    { key: 'album', label: 'Álbum' },
    { key: 'genre', label: 'Género' },
    { key: 'year', label: 'Año', numeric: true },
  ];

/** Corrects how a song is shown. The audio file itself is left untouched. */
export function EditTrackDialog() {
  const { colors, type } = useColors();
  const styles = useStyles();
  const { music } = useApp();
  const {
    editingTrack: track,
    setEditingTrack,
    saveTrackEdit,
    trackEdits,
  } = music;
  const [form, setForm] = useState<TrackEditForm>(emptyForm);

  useEffect(() => {
    if (track) {
      setForm({
        title: track.title,
        artist: track.artist,
        album: track.album,
        genre: track.genre ?? '',
        year: track.year ? String(track.year) : '',
      });
    }
  }, [track]);

  const close = () => setEditingTrack(null);
  const edited = track ? trackEdits[track.id] !== undefined : false;

  return (
    <Modal
      animationType="fade"
      onRequestClose={close}
      statusBarTranslucent
      transparent
      visible={track !== null}
    >
      <View style={styles.overlay}>
        <View style={styles.dialog}>
          <Text style={type.headline}>Editar datos</Text>
          <Text style={type.secondary}>
            Cambia cómo se ve la canción en Mi Música. El archivo no se
            modifica.
          </Text>
          <ScrollView keyboardShouldPersistTaps="handled">
            {fields.map(field => (
              <View key={field.key} style={styles.field}>
                <Text style={type.caption}>{field.label}</Text>
                <TextInput
                  accessibilityLabel={field.label}
                  keyboardType={field.numeric ? 'number-pad' : 'default'}
                  maxLength={field.numeric ? 4 : 120}
                  onChangeText={value =>
                    setForm(current => ({ ...current, [field.key]: value }))
                  }
                  placeholder={field.label}
                  placeholderTextColor={colors.textSecondary}
                  selectionColor={colors.accent}
                  style={styles.input}
                  value={form[field.key]}
                />
              </View>
            ))}
          </ScrollView>
          <View style={styles.actions}>
            {edited ? (
              <Button
                accessibilityLabel="Restaurar los datos originales"
                label="Restaurar"
                onPress={() => track && saveTrackEdit(track, null)}
                variant="tonal"
              />
            ) : null}
            <Button label="Cancelar" onPress={close} variant="tonal" />
            <Button
              accessibilityLabel="Guardar datos de la canción"
              label="Guardar"
              onPress={() => track && saveTrackEdit(track, form)}
            />
          </View>
        </View>
      </View>
    </Modal>
  );
}

const useStyles = createStyles(colors => ({
  empty: { paddingHorizontal: spacing.xl, paddingVertical: spacing.lg },
  folder: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 60,
    paddingHorizontal: spacing.xl,
  },
  folderText: { flex: 1, gap: 2, minWidth: 0 },
  overlay: {
    alignItems: 'center',
    backgroundColor: colors.scrim,
    flex: 1,
    justifyContent: 'center',
    padding: spacing.lg,
  },
  dialog: {
    backgroundColor: colors.surface,
    borderRadius: colors.design.radius.sheet,
    gap: spacing.md,
    maxHeight: '90%',
    maxWidth: 420,
    padding: spacing.xl,
    width: '100%',
  },
  field: { gap: spacing.xs, marginBottom: spacing.sm },
  input: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: colors.design.radius.md,
    color: colors.text,
    fontSize: 15,
    height: 48,
    paddingHorizontal: spacing.md,
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
}));
