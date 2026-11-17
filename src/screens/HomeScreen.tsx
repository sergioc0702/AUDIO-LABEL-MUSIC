import { useMemo } from 'react';
import { RefreshControl, ScrollView, Text, View } from 'react-native';
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
import {
  screenPadding,
  spacing,
  createStyles,
  useColors,
} from '../theme/theme';
import { Button, IconButton } from '../ui/Buttons';
import { Cover } from '../ui/Cover';
import { SectionHeader } from '../ui/Rows';
import { Tap } from '../ui/Tap';
import { groupAlbums, groupArtists } from '../domain/collections';
import { shuffleTracks } from '../domain/shuffleQueue';

import { Shortcut } from './HomeShortcuts';
function greeting() {
  const hour = new Date().getHours();
  return hour < 12
    ? 'Buenos días'
    : hour < 19
    ? 'Buenas tardes'
    : 'Buenas noches';
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
  const { type } = useColors();
  const styles = useStyles();
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
  const { colors, type } = useColors();
  const styles = useStyles();
  const { music, nav, setLibraryFilter } = useApp();
  const insets = useSafeAreaInsets();
  const {
    tracks,
    playlists,
    playlistTracksById,
    recentTracks,
    loadingLibrary,
    permissionDenied,
    permissionBlocked,
    requestLibraryAccess,
    loadLibrary,
    playTracks,
    setPlaylistNameDialog,
    setPlaylistDialogError,
  } = music;
  const albums = useMemo(() => groupAlbums(tracks).slice(0, 12), [tracks]);
  const artists = useMemo(() => groupArtists(tracks).slice(0, 12), [tracks]);
  const open = (kind: 'favorites' | 'recent' | 'top' | 'added') =>
    nav.push({ name: 'collection', ref: { kind } });
  const listing = colors.design.home === 'listing';
  const roundCovers = colors.design.player === 'kawaii';
  const shortcuts = [
    { icon: Heart, label: 'Favoritas', onPress: () => open('favorites') },
    {
      icon: Shuffle,
      label: 'Mezclar todo',
      onPress: () => {
        const shuffled = shuffleTracks(tracks);
        if (shuffled[0]) {
          playTracks(shuffled, shuffled[0], 'Mezcla de tu biblioteca');
        }
      },
    },
    { icon: TrendingUp, label: 'Más escuchadas', onPress: () => open('top') },
    { icon: Clock3, label: 'Recientes', onPress: () => open('recent') },
    { icon: Plus, label: 'Añadidas', onPress: () => open('added') },
    {
      icon: ListMusic,
      label: 'Tus listas',
      onPress: () => {
        setLibraryFilter('playlists');
        nav.selectTab('library');
      },
    },
  ];

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
        <Text style={[type.display, styles.greeting]}>{greeting()}</Text>
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
          <Button
            label={permissionBlocked ? 'Abrir ajustes' : 'Dar permiso'}
            onPress={requestLibraryAccess}
          />
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
          {listing ? (
            <Text style={[type.body, styles.prompt]}>
              PS C:\Música&gt;{' '}
              <Text style={{ color: colors.accent }}>Get-Biblioteca</Text>
            </Text>
          ) : null}
          {shortcuts.map((shortcut, index) => (
            <Shortcut key={shortcut.label} index={index} {...shortcut} />
          ))}
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
                round={roundCovers}
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

const useStyles = createStyles(colors => ({
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
  shortcuts: ['rows', 'listing', 'tapes', 'tickets'].includes(
    colors.design.home,
  )
    ? {
        gap: colors.design.home === 'rows' ? 0 : spacing.sm,
        paddingHorizontal: colors.design.home === 'rows' ? 0 : screenPadding,
        borderTopWidth: colors.design.home === 'rows' ? colors.design.line : 0,
        borderColor: colors.text,
      }
    : {
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: spacing.sm,
        paddingHorizontal: screenPadding,
      },
  prompt: { paddingBottom: spacing.xs },
  greeting:
    colors.design.home === 'sunsets'
      ? {
          // The VHS color bleed of the Vaporwave theme.
          textShadowColor: colors.skin.chromaA ?? colors.accent,
          textShadowOffset: { width: 2, height: 0 },
          textShadowRadius: 0.01,
        }
      : {},
  shortcut: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: colors.design.radius.sm,
    flexBasis: '48%',
    flexDirection: 'row',
    flexGrow: 1,
    gap: spacing.md,
    height: 56,
    overflow: 'hidden',
  },
  row: { gap: spacing.md, paddingHorizontal: screenPadding },
  card: { width: 136 },
  cardTitle: { marginTop: spacing.sm },
  centered: { textAlign: 'center' },
  createList: {
    alignItems: 'flex-start',
    paddingHorizontal: screenPadding,
    paddingTop: spacing.xl,
  },
}));
