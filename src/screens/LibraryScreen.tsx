import { useEffect, useMemo, useState } from 'react';
import {
  FlatList,
  ScrollView,
  Text,
  View,
  useWindowDimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowDownUp,
  Check,
  Folder,
  Heart,
  ListMusic,
  Play,
  Plus,
  Shuffle,
} from 'lucide-react-native';
import { useApp, type LibraryFilter } from '../state/AppContext';
import {
  screenPadding,
  spacing,
  createStyles,
  useColors,
} from '../theme/theme';
import type { Track } from '../types/Track';
import { Button, IconButton } from '../ui/Buttons';
import { Cover } from '../ui/Cover';
import { ListRow, SquareIcon, TrackRow, trackRowHeight } from '../ui/Rows';
import { Sheet, SheetAction } from '../ui/Sheet';
import { Tap } from '../ui/Tap';
import {
  folderName,
  groupAlbums,
  groupArtists,
  groupFolders,
} from '../utils/collections';
import { formatTrackCount } from '../utils/formatTrackCount';
import { shuffleTracks } from '../utils/shuffleQueue';
import { sortTracks, type TrackSort } from '../utils/sortTracks';
import { getStoredPreference, storePreference } from '../native/musicLibrary';

const filters: { id: LibraryFilter; label: string }[] = [
  { id: 'songs', label: 'Canciones' },
  { id: 'albums', label: 'Álbumes' },
  { id: 'artists', label: 'Artistas' },
  { id: 'playlists', label: 'Listas' },
  { id: 'folders', label: 'Carpetas' },
];

const sortKey = 'librarySort';

const sorts: { id: TrackSort; label: string }[] = [
  { id: 'titleAsc', label: 'Nombre A–Z' },
  { id: 'titleDesc', label: 'Nombre Z–A' },
  { id: 'dateAdded', label: 'Añadidas recientemente' },
];

export function LibraryScreen() {
  const { colors, type } = useColors();
  const styles = useStyles();
  const {
    music,
    nav,
    libraryFilter: filter,
    setLibraryFilter: setFilter,
  } = useApp();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const [sort, setSort] = useState<TrackSort>('titleAsc');
  const [sortVisible, setSortVisible] = useState(false);

  useEffect(() => {
    getStoredPreference(sortKey)
      .then(saved => {
        const match = sorts.find(item => item.id === saved);
        if (match) {
          setSort(match.id);
        }
      })
      .catch(() => undefined);
  }, []);

  function chooseSort(next: TrackSort) {
    setSort(next);
    storePreference(sortKey, next).catch(() => undefined);
  }

  const {
    tracks,
    loadingLibrary,
    permissionDenied,
    permissionBlocked,
    requestLibraryAccess,
    loadLibrary,
    playlists,
    playlistTracksById,
    favoriteIds,
    currentTrack,
    isPlaying,
    playerReady,
    playTracks,
    setQueueTrackDialog,
    setPlaylistNameDialog,
    setPlaylistDialogError,
  } = music;
  const showSongs = filter === 'songs';
  const sortedTracks = useMemo(
    () => (showSongs ? sortTracks(tracks, sort) : []),
    [showSongs, sort, tracks],
  );
  const albums = filter === 'albums' ? groupAlbums(tracks) : [];
  const artists = filter === 'artists' ? groupArtists(tracks) : [];
  const folders = filter === 'folders' ? groupFolders(tracks) : [];
  const albumSize = (width - screenPadding * 2 - spacing.md) / 2;
  const openGroup = (key: string, title: string) =>
    nav.push({ name: 'collection', ref: { kind: 'group', key, title } });

  const renderTrack = ({ item }: { item: Track }) => (
    <TrackRow
      isCurrent={currentTrack?.id === item.id}
      isPlaying={isPlaying}
      onMore={() => setQueueTrackDialog({ track: item, fromLibrary: true })}
      onPress={() => playTracks(sortedTracks, item, 'Biblioteca')}
      track={item}
    />
  );

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.header}>
        <Text style={type.display}>Biblioteca</Text>
        {filter === 'playlists' ? (
          <IconButton
            label="Crear lista de reproducción"
            onPress={() => {
              setPlaylistDialogError(null);
              setPlaylistNameDialog({ playlistId: null, name: '' });
            }}
          >
            <Plus color={colors.text} size={24} />
          </IconButton>
        ) : null}
      </View>
      <View>
        <ScrollView
          contentContainerStyle={styles.chips}
          horizontal
          showsHorizontalScrollIndicator={false}
        >
          {filters.map(item => {
            const selected = item.id === filter;
            return (
              <Tap
                key={item.id}
                accessibilityRole="tab"
                accessibilityLabel={item.label}
                accessibilityState={{ selected }}
                onPress={() => setFilter(item.id)}
                hitSlop={6}
                style={[styles.chip, selected && styles.chipSelected]}
              >
                <Text style={[type.label, selected && styles.chipSelectedText]}>
                  {item.label}
                </Text>
              </Tap>
            );
          })}
        </ScrollView>
      </View>

      {tracks.length === 0 && filter !== 'playlists' ? (
        <View style={styles.empty}>
          <Text style={type.title}>
            {permissionDenied
              ? 'Permite el acceso a tu música'
              : loadingLibrary
              ? 'Buscando tu música…'
              : 'No encontramos música'}
          </Text>
          {!loadingLibrary ? (
            <>
              <Text style={[type.secondary, styles.emptyText]}>
                {permissionDenied
                  ? 'Sin este permiso no podemos mostrar tus canciones.'
                  : 'Copia archivos de audio al teléfono y actualiza.'}
              </Text>
              <Button
                label={
                  permissionBlocked
                    ? 'Abrir ajustes'
                    : permissionDenied
                    ? 'Dar permiso'
                    : 'Actualizar'
                }
                onPress={() =>
                  permissionDenied ? requestLibraryAccess() : loadLibrary(false)
                }
              />
            </>
          ) : null}
        </View>
      ) : filter === 'songs' ? (
        <FlatList
          data={sortedTracks}
          getItemLayout={(_data, index) => ({
            length: trackRowHeight,
            offset: trackRowHeight * index,
            index,
          })}
          initialNumToRender={12}
          keyExtractor={track => track.id}
          ListHeaderComponent={
            <View style={styles.toolbar}>
              <Button
                accessibilityLabel={`Reproducir ${sortedTracks.length} canciones`}
                disabled={sortedTracks.length === 0 || !playerReady}
                icon={
                  <Play
                    color={colors.onAccent}
                    fill={colors.onAccent}
                    size={18}
                  />
                }
                label="Reproducir"
                onPress={() =>
                  sortedTracks[0] &&
                  playTracks(sortedTracks, sortedTracks[0], 'Biblioteca')
                }
                style={styles.toolbarButton}
              />
              <Button
                accessibilityLabel={`Reproducir aleatoriamente ${sortedTracks.length} canciones`}
                disabled={sortedTracks.length === 0 || !playerReady}
                icon={<Shuffle color={colors.text} size={18} />}
                label="Mezclar"
                onPress={() => {
                  const shuffled = shuffleTracks(sortedTracks);
                  if (shuffled[0]) {
                    playTracks(shuffled, shuffled[0], 'Biblioteca');
                  }
                }}
                style={styles.toolbarButton}
                variant="tonal"
              />
              <IconButton
                label={`Ordenar: ${
                  sorts.find(item => item.id === sort)?.label
                }`}
                onPress={() => setSortVisible(true)}
              >
                <ArrowDownUp color={colors.text} size={20} />
              </IconButton>
            </View>
          }
          maxToRenderPerBatch={10}
          renderItem={renderTrack}
          showsVerticalScrollIndicator={false}
          windowSize={7}
        />
      ) : filter === 'albums' ? (
        <FlatList
          key="albums"
          columnWrapperStyle={styles.albumRow}
          contentContainerStyle={styles.albumList}
          data={albums}
          initialNumToRender={8}
          keyExtractor={album => album.key}
          numColumns={2}
          renderItem={({ item }) => (
            <Tap
              accessibilityRole="button"
              accessibilityLabel={`Abrir álbum ${item.name}`}
              onPress={() => openGroup(item.key, item.name)}
              style={{ width: albumSize }}
            >
              <Cover size={albumSize} uri={item.artwork} />
              <Text numberOfLines={1} style={[type.label, styles.albumTitle]}>
                {item.name}
              </Text>
              <Text numberOfLines={1} style={type.caption}>
                {item.artist}
              </Text>
            </Tap>
          )}
          showsVerticalScrollIndicator={false}
        />
      ) : filter === 'artists' ? (
        <FlatList
          key="artists"
          data={artists}
          keyExtractor={artist => artist.key}
          renderItem={({ item }) => (
            <ListRow
              accessibilityLabel={`Abrir artista ${item.name}`}
              leading={<Cover round size={48} uri={item.artwork} />}
              onPress={() => openGroup(item.key, item.name)}
              subtitle={formatTrackCount(item.tracks.length)}
              title={item.name}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      ) : filter === 'playlists' ? (
        <FlatList
          key="playlists"
          data={playlists}
          keyExtractor={playlist => playlist.id}
          ListHeaderComponent={
            <ListRow
              leading={
                <SquareIcon>
                  <Heart color={colors.text} fill={colors.text} size={22} />
                </SquareIcon>
              }
              onPress={() =>
                nav.push({ name: 'collection', ref: { kind: 'favorites' } })
              }
              subtitle={formatTrackCount(favoriteIds.size)}
              title="Favoritas"
            />
          }
          renderItem={({ item }) => {
            const items = playlistTracksById.get(item.id) ?? [];
            return (
              <ListRow
                accessibilityLabel={`Abrir lista ${
                  item.name
                }, ${formatTrackCount(items.length)}`}
                leading={
                  items[0] ? (
                    <Cover size={48} uri={items[0].artwork} />
                  ) : (
                    <SquareIcon>
                      <ListMusic color={colors.textSecondary} size={22} />
                    </SquareIcon>
                  )
                }
                onPress={() =>
                  nav.push({
                    name: 'collection',
                    ref: { kind: 'playlist', id: item.id },
                  })
                }
                subtitle={formatTrackCount(items.length)}
                title={item.name}
              />
            );
          }}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <FlatList
          key="folders"
          data={folders}
          keyExtractor={folder => folder.key}
          renderItem={({ item }) => (
            <ListRow
              accessibilityLabel={`Abrir carpeta ${item.name}`}
              leading={
                <SquareIcon>
                  <Folder color={colors.textSecondary} size={22} />
                </SquareIcon>
              }
              onPress={() =>
                openGroup(
                  item.key,
                  folderName(item.tracks[0]?.folder ?? item.name),
                )
              }
              subtitle={`${formatTrackCount(item.tracks.length)} · ${
                item.tracks[0]?.folder ?? ''
              }`}
              title={item.name}
            />
          )}
          showsVerticalScrollIndicator={false}
        />
      )}

      <Sheet
        onClose={() => setSortVisible(false)}
        title="Ordenar canciones"
        visible={sortVisible}
      >
        {sorts.map(item => (
          <SheetAction
            key={item.id}
            label={item.label}
            onPress={() => {
              chooseSort(item.id);
              setSortVisible(false);
            }}
            selected={item.id === sort}
            trailing={
              item.id === sort ? (
                <Check color={colors.text} size={20} />
              ) : undefined
            }
          />
        ))}
      </Sheet>
    </View>
  );
}

const useStyles = createStyles(colors => ({
  screen: { flex: 1 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 48,
    paddingLeft: screenPadding,
    paddingRight: spacing.xs,
  },
  chips: {
    gap: spacing.sm,
    paddingHorizontal: screenPadding,
    paddingVertical: spacing.md,
  },
  chip: {
    alignItems: 'center',
    backgroundColor: colors.surfaceHigh,
    borderRadius: colors.design.radius.full,
    height: 36,
    justifyContent: 'center',
    paddingHorizontal: spacing.lg,
  },
  chipSelected: { backgroundColor: colors.text },
  chipSelectedText: { color: colors.background },
  toolbar: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    paddingLeft: screenPadding,
    paddingRight: spacing.xs,
  },
  toolbarButton: { flex: 1, paddingHorizontal: spacing.md },
  albumList: { gap: spacing.lg, paddingHorizontal: screenPadding },
  albumRow: { gap: spacing.md },
  albumTitle: { marginTop: spacing.sm },
  empty: {
    alignItems: 'center',
    gap: spacing.md,
    paddingHorizontal: screenPadding,
    paddingTop: spacing.xxl * 2,
  },
  emptyText: { textAlign: 'center' },
}));
