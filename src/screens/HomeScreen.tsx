import { useMemo, type ReactNode } from 'react';
import {
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import {
  Clock3,
  Heart,
  ListMusic,
  Plus,
  Settings,
  Shuffle,
  TrendingUp,
} from 'lucide-react-native';
import { useApp } from '../state/AppContext';
import { colors, radius, screenPadding, spacing, type } from '../theme/theme';
import { Button, IconButton } from '../ui/Buttons';
import { Cover } from '../ui/Cover';
import { SectionHeader } from '../ui/Rows';
import { Tap } from '../ui/Tap';
import { groupAlbums, groupArtists } from '../utils/collections';
import { shuffleTracks } from '../utils/shuffleQueue';

function greeting() {
  const hour = new Date().getHours();
  return hour < 12
    ? 'Buenos días'
    : hour < 19
    ? 'Buenas tardes'
    : 'Buenas noches';
}

function Shortcut({
  label,
  icon,
  onPress,
}: {
  label: string;
  icon: ReactNode;
  onPress: () => void;
}) {
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={label}
      onPress={onPress}
      style={styles.shortcut}
    >
      <View style={styles.shortcutIcon}>{icon}</View>
      <Text numberOfLines={2} style={[type.label, styles.shortcutLabel]}>
        {label}
      </Text>
    </Tap>
  );
}

function CoverCard({
  title,
  subtitle,
  artwork,
  round = false,
  accessibilityLabel,
  onPress,
}: {
  title: string;
  subtitle?: string;
  artwork: string | null | undefined;
  round?: boolean;
  accessibilityLabel: string;
  onPress: () => void;
}) {
  return (
    <Tap
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      style={styles.card}
    >
      <Cover uri={artwork} size={136} round={round} />
      <Text
        numberOfLines={1}
        style={[type.label, styles.cardTitle, round && styles.centered]}
      >
        {title}
      </Text>
      {subtitle ? (
        <Text
          numberOfLines={1}
          style={[type.caption, round && styles.centered]}
        >
          {subtitle}
        </Text>
      ) : null}
    </Tap>
  );
}

export function HomeScreen() {
  const { music, nav, setLibraryFilter } = useApp();
  const insets = useSafeAreaInsets();
  const {
    tracks,
    playlists,
    playlistTracksById,
    recentTracks,
    loadingLibrary,
    permissionDenied,
    loadLibrary,
    playTracks,
    setPlaylistNameDialog,
    setPlaylistDialogError,
  } = music;
  const albums = useMemo(() => groupAlbums(tracks).slice(0, 12), [tracks]);
  const artists = useMemo(() => groupArtists(tracks).slice(0, 12), [tracks]);
  const open = (kind: 'favorites' | 'recent' | 'top' | 'added') =>
    nav.push({ name: 'collection', ref: { kind } });
  const iconSize = 20;

  return (
    <ScrollView
      contentContainerStyle={[
        styles.content,
        { paddingTop: insets.top + spacing.md },
      ]}
      refreshControl={
        <RefreshControl
          colors={[colors.accent]}
          onRefresh={() => loadLibrary(false)}
          progressBackgroundColor={colors.surfaceHigh}
          refreshing={false}
        />
      }
      showsVerticalScrollIndicator={false}
    >
      <View style={styles.header}>
        <Text style={type.display}>{greeting()}</Text>
        <IconButton
          label="Ajustes"
          onPress={() => nav.push({ name: 'settings' })}
        >
          <Settings color={colors.text} size={24} />
        </IconButton>
      </View>

      {permissionDenied ? (
        <View style={styles.notice}>
          <Text style={type.title}>Permite el acceso a tu música</Text>
          <Text style={type.secondary}>
            Sin este permiso no podemos mostrar las canciones del teléfono.
          </Text>
          <Button label="Dar permiso" onPress={() => loadLibrary()} />
        </View>
      ) : !loadingLibrary && tracks.length === 0 ? (
        <View style={styles.notice}>
          <Text style={type.title}>No encontramos música</Text>
          <Text style={type.secondary}>
            Copia archivos de audio al teléfono y actualiza la biblioteca.
          </Text>
          <Button
            label="Actualizar biblioteca"
            onPress={() => loadLibrary(false)}
          />
        </View>
      ) : (
        <View style={styles.shortcuts}>
          <Shortcut
            icon={<Heart color={colors.text} size={iconSize} />}
            label="Favoritas"
            onPress={() => open('favorites')}
          />
          <Shortcut
            icon={<Shuffle color={colors.text} size={iconSize} />}
            label="Mezclar todo"
            onPress={() => {
              const shuffled = shuffleTracks(tracks);
              if (shuffled[0]) {
                playTracks(shuffled, shuffled[0], 'Mezcla de tu biblioteca');
              }
            }}
          />
          <Shortcut
            icon={<TrendingUp color={colors.text} size={iconSize} />}
            label="Más escuchadas"
            onPress={() => open('top')}
          />
          <Shortcut
            icon={<Clock3 color={colors.text} size={iconSize} />}
            label="Recientes"
            onPress={() => open('recent')}
          />
          <Shortcut
            icon={<Plus color={colors.text} size={iconSize} />}
            label="Añadidas"
            onPress={() => open('added')}
          />
          <Shortcut
            icon={<ListMusic color={colors.text} size={iconSize} />}
            label="Tus listas"
            onPress={() => {
              setLibraryFilter('playlists');
              nav.selectTab('library');
            }}
          />
        </View>
      )}

      {recentTracks.length > 0 ? (
        <>
          <SectionHeader
            action="Ver todo"
            onAction={() => open('recent')}
            title="Escuchado recientemente"
          />
          <ScrollView
            contentContainerStyle={styles.row}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {recentTracks.slice(0, 12).map(track => (
              <CoverCard
                key={track.id}
                accessibilityLabel={`Reproducir ${track.title} de ${track.artist}`}
                artwork={track.artwork}
                onPress={() => playTracks(recentTracks, track, 'Recientes')}
                subtitle={track.artist}
                title={track.title}
              />
            ))}
          </ScrollView>
        </>
      ) : null}

      {playlists.length > 0 ? (
        <>
          <SectionHeader title="Tus listas" />
          <ScrollView
            contentContainerStyle={styles.row}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {playlists.map(playlist => {
              const items = playlistTracksById.get(playlist.id) ?? [];
              return (
                <CoverCard
                  key={playlist.id}
                  accessibilityLabel={`Abrir lista ${playlist.name}`}
                  artwork={items[0]?.artwork}
                  onPress={() =>
                    nav.push({
                      name: 'collection',
                      ref: { kind: 'playlist', id: playlist.id },
                    })
                  }
                  subtitle={`${items.length} ${
                    items.length === 1 ? 'canción' : 'canciones'
                  }`}
                  title={playlist.name}
                />
              );
            })}
          </ScrollView>
        </>
      ) : tracks.length > 0 ? (
        <View style={styles.createList}>
          <Button
            label="Crear una lista"
            onPress={() => {
              setPlaylistDialogError(null);
              setPlaylistNameDialog({ playlistId: null, name: '' });
            }}
            variant="tonal"
          />
        </View>
      ) : null}

      {albums.length > 0 ? (
        <>
          <SectionHeader title="Álbumes" />
          <ScrollView
            contentContainerStyle={styles.row}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {albums.map(album => (
              <CoverCard
                key={album.key}
                accessibilityLabel={`Abrir álbum ${album.name}`}
                artwork={album.artwork}
                onPress={() =>
                  nav.push({
                    name: 'collection',
                    ref: { kind: 'group', key: album.key, title: album.name },
                  })
                }
                subtitle={album.artist}
                title={album.name}
              />
            ))}
          </ScrollView>
        </>
      ) : null}

      {artists.length > 0 ? (
        <>
          <SectionHeader title="Artistas" />
          <ScrollView
            contentContainerStyle={styles.row}
            horizontal
            showsHorizontalScrollIndicator={false}
          >
            {artists.map(artist => (
              <CoverCard
                key={artist.key}
                accessibilityLabel={`Abrir artista ${artist.name}`}
                artwork={artist.artwork}
                onPress={() =>
                  nav.push({
                    name: 'collection',
                    ref: { kind: 'group', key: artist.key, title: artist.name },
                  })
                }
                round
                title={artist.name}
              />
            ))}
          </ScrollView>
        </>
      ) : null}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  content: { paddingBottom: spacing.xl },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingBottom: spacing.md,
    paddingLeft: screenPadding,
    paddingRight: spacing.xs,
  },
  notice: {
    alignItems: 'flex-start',
    gap: spacing.md,
    paddingHorizontal: screenPadding,
    paddingTop: spacing.xl,
  },
  shortcuts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
    paddingHorizontal: screenPadding,
  },
  shortcut: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: radius.sm,
    flexBasis: '48%',
    flexDirection: 'row',
    flexGrow: 1,
    gap: spacing.md,
    height: 56,
    overflow: 'hidden',
  },
  shortcutIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceHigh,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  shortcutLabel: { flex: 1, paddingRight: spacing.sm },
  row: { gap: spacing.md, paddingHorizontal: screenPadding },
  card: { width: 136 },
  cardTitle: { marginTop: spacing.sm },
  centered: { textAlign: 'center' },
  createList: {
    alignItems: 'flex-start',
    paddingHorizontal: screenPadding,
    paddingTop: spacing.xl,
  },
});
