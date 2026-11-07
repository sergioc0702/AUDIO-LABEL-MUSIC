import { useDeferredValue, useMemo, useState } from 'react';
import {
  FlatList,
  ScrollView,
  SectionList,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ListMusic, Search, X } from 'lucide-react-native';
import { useApp } from '../state/AppContext';
import {
  screenPadding,
  spacing,
  createStyles,
  useColors,
} from '../theme/theme';
import type { Playlist, Track } from '../types/Track';
import { IconButton } from '../ui/Buttons';
import { Cover } from '../ui/Cover';
import { ListRow, SectionHeader, SquareIcon, TrackRow } from '../ui/Rows';
import { Tap } from '../ui/Tap';
import {
  groupAlbums,
  groupArtists,
  groupGenres,
  normalizeText,
  type TrackGroup,
} from '../utils/collections';

type Result =
  | { type: 'track'; key: string; track: Track }
  | { type: 'album' | 'artist'; key: string; group: TrackGroup }
  | { type: 'playlist'; key: string; playlist: Playlist };

function indexSearchText<T>(items: T[], textFor: (item: T) => string) {
  return items.map(item => ({ item, text: normalizeText(textFor(item)) }));
}

export function SearchScreen() {
  const { colors, type } = useColors();
  const styles = useStyles();
  const { music, nav } = useApp();
  const insets = useSafeAreaInsets();
  const [query, setQuery] = useState('');
  const {
    tracks,
    playlists,
    playlistTracksById,
    currentTrack,
    isPlaying,
    playTracks,
    setQueueTrackDialog,
  } = music;
  const hasQuery = query.trim().length > 0;
  const deferredQuery = useDeferredValue(query).trim();
  const searchTerm = normalizeText(deferredQuery);
  const isSearching = deferredQuery.length > 0;
  const genres = useMemo(() => groupGenres(tracks), [tracks]);
  const artists = useMemo(() => groupArtists(tracks), [tracks]);
  const libraryIndex = useMemo(() => {
    if (!isSearching) return null;
    return {
      tracks: indexSearchText(
        tracks,
        track => `${track.title} ${track.artist} ${track.album}`,
      ),
      artists: indexSearchText(artists, group => group.name),
      albums: indexSearchText(groupAlbums(tracks), group => group.name),
    };
  }, [artists, isSearching, tracks]);
  const playlistIndex = useMemo(
    () => indexSearchText(playlists, playlist => playlist.name),
    [playlists],
  );

  const { matchedTracks, sections } = useMemo(() => {
    if (!libraryIndex) {
      return { matchedTracks: [] as Track[], sections: [] };
    }
    const matching = <T,>(entries: { item: T; text: string }[]) =>
      entries
        .filter(entry => entry.text.includes(searchTerm))
        .map(entry => entry.item);
    const songs = matching(libraryIndex.tracks);
    const matchedArtists = matching(libraryIndex.artists);
    const albums = matching(libraryIndex.albums);
    const lists = matching(playlistIndex);
    const all: { title: string; data: Result[] }[] = [
      {
        title: 'Canciones',
        data: songs.map(track => ({ type: 'track', key: track.id, track })),
      },
      {
        title: 'Artistas',
        data: matchedArtists.map(group => ({
          type: 'artist',
          key: group.key,
          group,
        })),
      },
      {
        title: 'Álbumes',
        data: albums.map(group => ({ type: 'album', key: group.key, group })),
      },
      {
        title: 'Listas',
        data: lists.map(playlist => ({
          type: 'playlist',
          key: playlist.id,
          playlist,
        })),
      },
    ];
    return {
      matchedTracks: songs,
      sections: all.filter(section => section.data.length > 0),
    };
  }, [libraryIndex, playlistIndex, searchTerm]);

  const renderResult = ({ item }: { item: Result }) => {
    if (item.type === 'track') {
      return (
        <TrackRow
          isCurrent={currentTrack?.id === item.track.id}
          isPlaying={isPlaying}
          onMore={() =>
            setQueueTrackDialog({ track: item.track, fromLibrary: true })
          }
          onPress={() => playTracks(matchedTracks, item.track, 'Búsqueda')}
          track={item.track}
        />
      );
    }
    if (item.type === 'playlist') {
      const count = playlistTracksById.get(item.playlist.id)?.length ?? 0;
      return (
        <ListRow
          accessibilityLabel={`Abrir lista ${item.playlist.name}`}
          leading={
            <SquareIcon>
              <ListMusic color={colors.textSecondary} size={22} />
            </SquareIcon>
          }
          onPress={() =>
            nav.push({
              name: 'collection',
              ref: { kind: 'playlist', id: item.playlist.id },
            })
          }
          subtitle={`${count} ${count === 1 ? 'canción' : 'canciones'}`}
          title={item.playlist.name}
        />
      );
    }
    const isArtist = item.type === 'artist';
    return (
      <ListRow
        accessibilityLabel={`Abrir ${isArtist ? 'artista' : 'álbum'} ${
          item.group.name
        }`}
        leading={<Cover round={isArtist} size={48} uri={item.group.artwork} />}
        onPress={() =>
          nav.push({
            name: 'collection',
            ref: {
              kind: 'group',
              key: item.group.key,
              title: item.group.name,
            },
          })
        }
        subtitle={isArtist ? 'Artista' : item.group.artist}
        title={item.group.name}
      />
    );
  };

  return (
    <View style={[styles.screen, { paddingTop: insets.top + spacing.md }]}>
      <View style={styles.titleRow}>
        <Text style={type.display}>Buscar</Text>
      </View>
      <View style={styles.searchBox}>
        <Search color={colors.textSecondary} size={20} />
        <TextInput
          accessibilityLabel="Buscar canciones, artistas, álbumes o listas"
          onChangeText={setQuery}
          placeholder="Canciones, artistas, álbumes, listas"
          placeholderTextColor={colors.textSecondary}
          returnKeyType="search"
          selectionColor={colors.accent}
          style={styles.input}
          value={query}
        />
        {hasQuery ? (
          <IconButton label="Borrar búsqueda" onPress={() => setQuery('')}>
            <X color={colors.textSecondary} size={20} />
          </IconButton>
        ) : null}
      </View>

      {hasQuery ? (
        sections.length > 0 ? (
          <SectionList
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            keyExtractor={item => item.key}
            renderItem={renderResult}
            renderSectionHeader={({ section }) => (
              <SectionHeader title={section.title} />
            )}
            sections={sections}
            showsVerticalScrollIndicator={false}
            stickySectionHeadersEnabled={false}
          />
        ) : isSearching ? (
          <View style={styles.empty}>
            <Text style={type.title}>Sin resultados</Text>
            <Text style={type.secondary}>
              Prueba con otro título, artista o álbum.
            </Text>
          </View>
        ) : null
      ) : (
        <FlatList
          columnWrapperStyle={styles.genreRow}
          data={genres}
          keyboardShouldPersistTaps="handled"
          keyExtractor={genre => genre.key}
          numColumns={2}
          showsVerticalScrollIndicator={false}
          ListHeaderComponent={
            <>
              {artists.length > 0 ? (
                <>
                  <SectionHeader title="Artistas" />
                  <ScrollView
                    contentContainerStyle={styles.artists}
                    horizontal
                    showsHorizontalScrollIndicator={false}
                  >
                    {artists.slice(0, 16).map(artist => (
                      <Tap
                        key={artist.key}
                        accessibilityRole="button"
                        accessibilityLabel={`Abrir artista ${artist.name}`}
                        onPress={() =>
                          nav.push({
                            name: 'collection',
                            ref: {
                              kind: 'group',
                              key: artist.key,
                              title: artist.name,
                            },
                          })
                        }
                        style={styles.artist}
                      >
                        <Cover round size={88} uri={artist.artwork} />
                        <Text
                          numberOfLines={1}
                          style={[type.caption, styles.artistName]}
                        >
                          {artist.name}
                        </Text>
                      </Tap>
                    ))}
                  </ScrollView>
                </>
              ) : null}
              {genres.length > 0 ? (
                <SectionHeader title="Explorar por género" />
              ) : null}
            </>
          }
          renderItem={({ item }) => (
            <Tap
              accessibilityRole="button"
              accessibilityLabel={`Abrir género ${item.name}`}
              onPress={() =>
                nav.push({
                  name: 'collection',
                  ref: { kind: 'group', key: item.key, title: item.name },
                })
              }
              style={styles.genre}
            >
              <Text numberOfLines={2} style={type.title}>
                {item.name}
              </Text>
              <Text style={type.caption}>
                {item.tracks.length}{' '}
                {item.tracks.length === 1 ? 'canción' : 'canciones'}
              </Text>
            </Tap>
          )}
        />
      )}
    </View>
  );
}

const useStyles = createStyles(colors => ({
  screen: { flex: 1 },
  titleRow: {
    justifyContent: 'center',
    marginBottom: spacing.md,
    minHeight: 48,
    paddingHorizontal: screenPadding,
  },
  searchBox: {
    alignItems: 'center',
    backgroundColor: colors.surfaceHigh,
    borderRadius: colors.design.radius.md,
    flexDirection: 'row',
    gap: spacing.sm,
    height: 48,
    marginHorizontal: screenPadding,
    paddingLeft: spacing.md,
  },
  input: { color: colors.text, flex: 1, fontSize: 15, height: 48 },
  empty: {
    alignItems: 'center',
    gap: spacing.xs,
    paddingTop: spacing.xxl * 2,
  },
  artists: { gap: spacing.md, paddingHorizontal: screenPadding },
  artist: { alignItems: 'center', width: 88 },
  artistName: { marginTop: spacing.xs, textAlign: 'center' },
  genreRow: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    paddingHorizontal: screenPadding,
  },
  genre: {
    backgroundColor: colors.surface,
    borderRadius: colors.design.radius.md,
    flex: 1,
    gap: spacing.xs,
    justifyContent: 'flex-end',
    minHeight: 88,
    padding: spacing.md,
  },
}));
