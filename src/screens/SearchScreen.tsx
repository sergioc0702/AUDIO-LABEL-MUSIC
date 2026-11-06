import { useMemo, useState } from 'react';
import {
  FlatList,
  ScrollView,
  SectionList,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { ListMusic, Search, X } from 'lucide-react-native';
import { useApp } from '../state/AppContext';
import { colors, radius, screenPadding, spacing, type } from '../theme/theme';
import type { Playlist, Track } from '../types/Track';
import { IconButton } from '../ui/Buttons';
import { Cover } from '../ui/Cover';
import { ListRow, SectionHeader, SquareIcon, TrackRow } from '../ui/Rows';
import { Tap } from '../ui/Tap';
import {
  groupAlbums,
  groupArtists,
  groupGenres,
  matchesQuery,
  type TrackGroup,
} from '../utils/collections';

type Result =
  | { type: 'track'; key: string; track: Track }
  | { type: 'album' | 'artist'; key: string; group: TrackGroup }
  | { type: 'playlist'; key: string; playlist: Playlist };

export function SearchScreen() {
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
  const genres = useMemo(() => groupGenres(tracks), [tracks]);

  const { matchedTracks, sections } = useMemo(() => {
    if (!hasQuery) {
      return { matchedTracks: [] as Track[], sections: [] };
    }
    const songs = tracks.filter(track =>
      matchesQuery(`${track.title} ${track.artist} ${track.album}`, query),
    );
    const artists = groupArtists(tracks).filter(group =>
      matchesQuery(group.name, query),
    );
    const albums = groupAlbums(tracks).filter(group =>
      matchesQuery(group.name, query),
    );
    const lists = playlists.filter(playlist =>
      matchesQuery(playlist.name, query),
    );
    const all: { title: string; data: Result[] }[] = [
      {
        title: 'Canciones',
        data: songs.map(track => ({ type: 'track', key: track.id, track })),
      },
      {
        title: 'Artistas',
        data: artists.map(group => ({
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
  }, [hasQuery, playlists, query, tracks]);

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
      <Text style={[type.display, styles.title]}>Buscar</Text>
      <View style={styles.searchBox}>
        <Search color={colors.textSecondary} size={20} />
        <TextInput
          accessibilityLabel="Buscar canciones, artistas o álbumes"
          onChangeText={setQuery}
          placeholder="Canciones, artistas, álbumes"
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
        ) : (
          <View style={styles.empty}>
            <Text style={type.title}>Sin resultados</Text>
            <Text style={type.secondary}>
              Prueba con otro título, artista o álbum.
            </Text>
          </View>
        )
      ) : genres.length > 0 ? (
        <ScrollView
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <SectionHeader title="Explorar por género" />
          <FlatList
            columnWrapperStyle={styles.genreRow}
            data={genres}
            keyExtractor={genre => genre.key}
            numColumns={2}
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
            scrollEnabled={false}
          />
        </ScrollView>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  title: { paddingBottom: spacing.md, paddingHorizontal: screenPadding },
  searchBox: {
    alignItems: 'center',
    backgroundColor: colors.surfaceHigh,
    borderRadius: radius.md,
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
  genreRow: {
    gap: spacing.sm,
    paddingBottom: spacing.sm,
    paddingHorizontal: screenPadding,
  },
  genre: {
    backgroundColor: colors.surface,
    borderRadius: radius.md,
    flex: 1,
    gap: spacing.xs,
    justifyContent: 'flex-end',
    minHeight: 88,
    padding: spacing.md,
  },
});
