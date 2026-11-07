import { useMemo, useState } from 'react';
import { FlatList, ScrollView, Text, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  ArrowLeft,
  ListPlus,
  Download,
  Minus,
  MoreVertical,
  Pencil,
  Play,
  Shuffle,
  Trash2,
  Upload,
} from 'lucide-react-native';
import { useApp } from '../state/AppContext';
import {
  screenPadding,
  spacing,
  createStyles,
  useColors,
} from '../theme/theme';
import { Button, IconButton } from '../ui/Buttons';
import { Cover } from '../ui/Cover';
import { ReorderRow } from '../ui/ReorderRow';
import { SectionHeader, TrackRow } from '../ui/Rows';
import { Tap } from '../ui/Tap';
import { Sheet, SheetAction } from '../ui/Sheet';
import {
  artistKey,
  groupAlbums,
  resolveCollection,
  type CollectionRef,
} from '../utils/collections';
import { formatTrackCount } from '../utils/formatTrackCount';
import { shuffleTracks } from '../utils/shuffleQueue';

export function CollectionScreen({
  collection,
}: {
  collection: CollectionRef;
}) {
  const { colors, type } = useColors();
  const styles = useStyles();
  const { music, nav } = useApp();
  const insets = useSafeAreaInsets();
  const [menuVisible, setMenuVisible] = useState(false);
  const {
    tracks,
    favoriteIds,
    recentTracks,
    topTracks,
    playlists,
    playlistTracksById,
    currentTrack,
    isPlaying,
    playerReady,
    savingPlaylist,
    playTracks,
    setQueueTrackDialog,
    setPlaylistNameDialog,
    setPlaylistDialogError,
    setPlaylistToDelete,
    openPlaylistTrackPicker,
    removeTrackFromPlaylist,
    movePlaylistTrack,
    clearRecentPlayback,
    importPlaylistFile,
    exportPlaylistM3u,
  } = music;
  const resolved = useMemo(
    () =>
      resolveCollection(collection, {
        tracks,
        favoriteIds,
        recentTracks,
        topTracks,
        playlists,
        playlistTracksById,
      }),
    [
      collection,
      favoriteIds,
      playlistTracksById,
      playlists,
      recentTracks,
      topTracks,
      tracks,
    ],
  );

  if (!resolved) {
    return (
      <View style={[styles.missing, { paddingTop: insets.top + spacing.md }]}>
        <IconButton label="Volver" onPress={nav.pop}>
          <ArrowLeft color={colors.text} size={24} />
        </IconButton>
        <Text style={[type.secondary, styles.missingText]}>
          Esto ya no está disponible.
        </Text>
      </View>
    );
  }

  const { title, artwork, round, playlist } = resolved;
  const items = resolved.tracks;
  const totalMinutes = Math.max(
    1,
    Math.round(items.reduce((sum, track) => sum + track.duration, 0) / 60),
  );
  const hasMenu = playlist !== null || collection.kind === 'recent';
  const isAlbum =
    collection.kind === 'group' && collection.key.startsWith('album');
  const artist = isAlbum ? items[0] : undefined;
  const otherAlbums = isAlbum
    ? groupAlbums(tracks).filter(
        album => collection.kind === 'group' && album.key !== collection.key,
      )
    : [];
  const artistAlbums = artist
    ? otherAlbums.filter(
        album => artistKey(album.tracks[0]) === artistKey(artist),
      )
    : [];
  const moreAlbums = (
    artistAlbums.length > 0 ? artistAlbums : otherAlbums
  ).slice(0, 12);
  const playLabel =
    collection.kind === 'group'
      ? collection.key.startsWith('artist')
        ? `Reproducir artista ${title}`
        : collection.key.startsWith('album')
        ? `Reproducir álbum ${title}`
        : `Reproducir ${title}`
      : playlist
      ? `Reproducir lista ${title}`
      : `Reproducir ${title}`;

  return (
    <View style={styles.screen}>
      <FlatList
        contentContainerStyle={{ paddingTop: insets.top + spacing.xs }}
        data={items}
        initialNumToRender={12}
        keyExtractor={track => track.id}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Text style={type.title}>Aún no hay canciones</Text>
            {playlist ? (
              <Button
                label="Añadir canciones"
                onPress={() => openPlaylistTrackPicker(playlist)}
                variant="tonal"
              />
            ) : null}
          </View>
        }
        ListHeaderComponent={
          <>
            <View style={styles.topBar}>
              <IconButton label="Volver" onPress={nav.pop}>
                <ArrowLeft color={colors.text} size={24} />
              </IconButton>
              {hasMenu ? (
                <IconButton
                  label={`Opciones de ${title}`}
                  onPress={() => setMenuVisible(true)}
                >
                  <MoreVertical color={colors.text} size={24} />
                </IconButton>
              ) : null}
            </View>
            <View style={styles.hero}>
              <Cover round={round} size={200} uri={artwork} />
              <Text numberOfLines={2} style={[type.headline, styles.heroTitle]}>
                {title}
              </Text>
              {artist ? (
                <Tap
                  accessibilityRole="button"
                  accessibilityLabel={`Abrir artista ${artist.artist}`}
                  hitSlop={12}
                  onPress={() =>
                    nav.push({
                      name: 'collection',
                      ref: {
                        kind: 'group',
                        key: artistKey(artist),
                        title: artist.artist,
                      },
                    })
                  }
                >
                  <Text style={type.bodyStrong}>{artist.artist}</Text>
                </Tap>
              ) : null}
              <Text style={type.secondary}>
                {formatTrackCount(items.length)} · {totalMinutes} min
              </Text>
              <View style={styles.actions}>
                <Button
                  accessibilityLabel={playLabel}
                  disabled={items.length === 0 || !playerReady}
                  icon={
                    <Play
                      color={colors.onAccent}
                      fill={colors.onAccent}
                      size={18}
                    />
                  }
                  label="Reproducir"
                  onPress={() => playTracks(items, items[0], title)}
                  style={styles.action}
                />
                {items.length > 1 ? (
                  <Button
                    accessibilityLabel={`Reproducir aleatoriamente ${title}`}
                    disabled={!playerReady}
                    icon={<Shuffle color={colors.text} size={18} />}
                    label="Mezclar"
                    onPress={() => {
                      const shuffled = shuffleTracks(items);
                      if (shuffled[0]) {
                        playTracks(shuffled, shuffled[0], title);
                      }
                    }}
                    style={styles.action}
                    variant="tonal"
                  />
                ) : null}
              </View>
            </View>
          </>
        }
        ListFooterComponent={
          artist && moreAlbums.length > 0 ? (
            <>
              <SectionHeader
                title={
                  artistAlbums.length > 0
                    ? `Más de ${artist.artist}`
                    : 'Más en tu biblioteca'
                }
              />
              <ScrollView
                contentContainerStyle={styles.more}
                horizontal
                showsHorizontalScrollIndicator={false}
              >
                {moreAlbums.map(album => (
                  <Tap
                    key={album.key}
                    accessibilityRole="button"
                    accessibilityLabel={`Abrir álbum ${album.name}`}
                    onPress={() =>
                      nav.push({
                        name: 'collection',
                        ref: {
                          kind: 'group',
                          key: album.key,
                          title: album.name,
                        },
                      })
                    }
                    style={styles.moreCard}
                  >
                    <Cover size={120} uri={album.artwork} />
                    <Text
                      numberOfLines={1}
                      style={[type.label, styles.moreTitle]}
                    >
                      {album.name}
                    </Text>
                  </Tap>
                ))}
              </ScrollView>
            </>
          ) : undefined
        }
        renderItem={({ item, index }) => {
          const row = (
            <TrackRow
              accessibilityLabel={
                playlist
                  ? `Reproducir ${item.title} de ${item.artist} desde ${title}`
                  : undefined
              }
              isCurrent={currentTrack?.id === item.id}
              isPlaying={isPlaying}
              onMore={() =>
                setQueueTrackDialog({
                  track: item,
                  fromLibrary: playlist === null,
                })
              }
              onPress={() => playTracks(items, item, title)}
              track={item}
              trailing={
                playlist ? (
                  <IconButton
                    disabled={savingPlaylist}
                    label={`Quitar ${item.title} de ${title}`}
                    onPress={() =>
                      removeTrackFromPlaylist(playlist.id, item.id)
                    }
                  >
                    <Minus color={colors.textSecondary} size={20} />
                  </IconButton>
                ) : undefined
              }
            />
          );
          return playlist ? (
            <ReorderRow
              disabled={savingPlaylist}
              index={index}
              onMove={(from, to) => movePlaylistTrack(playlist.id, from, to)}
              title={item.title}
              trackCount={items.length}
            >
              {row}
            </ReorderRow>
          ) : (
            row
          );
        }}
        showsVerticalScrollIndicator={false}
      />

      <Sheet
        onClose={() => setMenuVisible(false)}
        title={title}
        visible={menuVisible}
      >
        {playlist ? (
          <>
            <SheetAction
              accessibilityLabel={`Importar lista M3U a ${title}`}
              icon={<Download color={colors.text} size={22} />}
              label="Importar M3U/M3U8"
              onPress={() => {
                setMenuVisible(false);
                importPlaylistFile(playlist);
              }}
            />
            <SheetAction
              accessibilityLabel={`Exportar ${title} como M3U8`}
              icon={<Upload color={colors.text} size={22} />}
              label="Exportar M3U8"
              onPress={() => {
                setMenuVisible(false);
                exportPlaylistM3u(playlist);
              }}
            />
            <SheetAction
              accessibilityLabel={`Añadir canciones a ${title}`}
              icon={<ListPlus color={colors.text} size={22} />}
              label="Añadir canciones"
              onPress={() => {
                setMenuVisible(false);
                openPlaylistTrackPicker(playlist);
              }}
            />
            <SheetAction
              accessibilityLabel={`Renombrar ${title}`}
              icon={<Pencil color={colors.text} size={22} />}
              label="Renombrar"
              onPress={() => {
                setMenuVisible(false);
                setPlaylistDialogError(null);
                setPlaylistNameDialog({
                  playlistId: playlist.id,
                  name: playlist.name,
                });
              }}
            />
            <SheetAction
              accessibilityLabel={`Eliminar ${title}`}
              danger
              icon={<Trash2 color={colors.danger} size={22} />}
              label="Eliminar lista"
              onPress={() => {
                setMenuVisible(false);
                setPlaylistToDelete(playlist);
              }}
            />
          </>
        ) : (
          <SheetAction
            accessibilityLabel="Borrar historial de reproducción"
            danger
            icon={<Trash2 color={colors.danger} size={22} />}
            label="Borrar historial"
            onPress={() => {
              setMenuVisible(false);
              clearRecentPlayback();
            }}
          />
        )}
      </Sheet>
    </View>
  );
}

const useStyles = createStyles(() => ({
  screen: { flex: 1 },
  missing: { flex: 1, paddingLeft: spacing.xs },
  missingText: { padding: screenPadding },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.xs,
  },
  hero: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingBottom: spacing.md,
    paddingHorizontal: screenPadding,
  },
  heroTitle: { marginTop: spacing.md, textAlign: 'center' },
  actions: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginTop: spacing.md,
  },
  action: { flex: 1 },
  more: {
    gap: spacing.md,
    paddingBottom: spacing.lg,
    paddingHorizontal: screenPadding,
  },
  moreCard: { width: 120 },
  moreTitle: { marginTop: spacing.sm },
  empty: {
    alignItems: 'center',
    gap: spacing.md,
    paddingTop: spacing.xxl,
  },
}));
