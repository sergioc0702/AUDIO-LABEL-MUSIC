import type { ReactNode } from 'react';
import { Pressable, ScrollView, Text, View } from 'react-native';
import {
  Album,
  Clock3,
  Heart,
  ListMusic,
  Music2,
  Play,
} from 'lucide-react-native';
import type { Playlist, Track } from '../types/Track';
import type { createStyles } from '../theme/createStyles';
import type { AppDesignTokens } from '../theme/tokens';
import { Artwork } from '../components/library/LibraryComponents';
import { formatTrackCount } from '../utils/formatTrackCount';

type ScreenStyles = ReturnType<typeof createStyles>;
type LibraryDestination =
  | 'songs'
  | 'albums'
  | 'artists'
  | 'recent'
  | 'playlists'
  | 'favorites';

type HomeScreenProps = {
  colors: AppDesignTokens['colors'];
  styles: ScreenStyles;
  safeAreaTop: number;
  tracks: Track[];
  playlists: Playlist[];
  currentTrack: Track | null;
  recentTracks: Track[];
  addedTracks: Track[];
  favoriteIds: Set<string>;
  loadingLibrary: boolean;
  errorMessage: string | null;
  errorRetryAction: (() => void) | null;
  queueNotice: string | null;
  loadLibrary: () => void;
  navigateTo: (destination: LibraryDestination) => void;
  navigateToPrimaryScreen: (screen: 'home' | 'search' | 'library') => void;
  setPlayerExpanded: (expanded: boolean) => void;
  playTracks: (tracks: Track[], track: Track, sourceLabel?: string) => void;
  renderTrack: (
    track: Track,
    index: number,
    queueTracks: Track[],
    sourceLabel: string,
    fromLibrary: boolean,
  ) => ReactNode;
};

export function HomeScreen({
  colors,
  styles,
  safeAreaTop,
  tracks,
  playlists,
  currentTrack,
  recentTracks,
  addedTracks,
  favoriteIds,
  loadingLibrary,
  errorMessage,
  errorRetryAction,
  queueNotice,
  loadLibrary,
  navigateTo,
  navigateToPrimaryScreen,
  setPlayerExpanded,
  playTracks,
  renderTrack,
}: HomeScreenProps) {
  const hour = new Date().getHours();
  const greeting =
    hour < 12 ? 'BUENOS DÍAS' : hour < 19 ? 'BUENAS TARDES' : 'BUENAS NOCHES';
  const featuredTrack =
    currentTrack ?? recentTracks[0] ?? addedTracks[0] ?? null;
  const favoriteTracks = tracks.filter(track => favoriteIds.has(track.id));
  const albumCount = new Set(
    tracks.map(track =>
      track.albumId && track.albumId !== '0'
        ? track.albumId
        : `${track.album}\u0000${track.artist}`,
    ),
  ).size;
  const shortcuts = [
    {
      id: 'favorites' as const,
      label: 'Favoritas',
      detail: formatTrackCount(favoriteTracks.length),
      icon: Heart,
    },
    {
      id: 'playlists' as const,
      label: 'Listas',
      detail: `${playlists.length} ${
        playlists.length === 1 ? 'lista' : 'listas'
      }`,
      icon: ListMusic,
    },
    {
      id: 'albums' as const,
      label: 'Álbumes',
      detail: `${albumCount} ${albumCount === 1 ? 'álbum' : 'álbumes'}`,
      icon: Album,
    },
    {
      id: 'recent' as const,
      label: 'Recientes',
      detail: formatTrackCount(recentTracks.length),
      icon: Clock3,
    },
  ];

  return (
    <View style={styles.homeScreen}>
      <ScrollView
        contentContainerStyle={[
          styles.homeContent,
          { paddingTop: Math.max(20, safeAreaTop + 10) },
        ]}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.homeHeader}>
          <View>
            <Text style={styles.homeGreeting}>{greeting}</Text>
            <Text style={styles.homeHeading}>Tu música</Text>
          </View>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Actualizar biblioteca"
            onPress={() => loadLibrary()}
            style={styles.homeRefreshButton}
          >
            <Music2 color={colors.accent} size={21} />
          </Pressable>
        </View>

        <Pressable
          accessibilityRole="button"
          accessibilityLabel={
            featuredTrack
              ? `Continuar escuchando ${featuredTrack.title}`
              : 'Abrir biblioteca para buscar canciones'
          }
          onPress={() => {
            if (!featuredTrack) {
              navigateToPrimaryScreen('library');
            } else if (currentTrack?.id === featuredTrack.id) {
              setPlayerExpanded(true);
            } else {
              const homeQueue = recentTracks.length ? recentTracks : tracks;
              playTracks(homeQueue, featuredTrack, 'Continuar escuchando');
            }
          }}
          style={[styles.homeHero, !featuredTrack && styles.homeHeroEmpty]}
        >
          {featuredTrack ? (
            <View style={styles.homeHeroArtwork}>
              <Artwork uri={featuredTrack.artwork} size={128} />
            </View>
          ) : null}
          <View style={styles.homeHeroCopy}>
            <Text style={styles.homeHeroEyebrow}>
              {featuredTrack ? 'CONTINUAR ESCUCHANDO' : 'TU COLECCIÓN'}
            </Text>
            <Text numberOfLines={2} style={styles.homeHeroTitle}>
              {featuredTrack ? featuredTrack.title : 'Tu música, a tu manera'}
            </Text>
            <Text numberOfLines={1} style={styles.homeHeroArtist}>
              {featuredTrack
                ? featuredTrack.artist
                : loadingLibrary
                ? 'Buscando canciones en el dispositivo…'
                : 'Añade canciones para empezar'}
            </Text>
            <View style={styles.homeHeroPlay}>
              <Play color={colors.onAccent} fill={colors.onAccent} size={19} />
            </View>
          </View>
          <Text style={styles.homeHeroNote}>
            {tracks.length
              ? `${formatTrackCount(tracks.length)} en tu biblioteca`
              : 'Explora tu biblioteca'}
          </Text>
        </Pressable>

        {errorMessage ? (
          <View style={styles.errorBanner}>
            <Text style={styles.errorText}>{errorMessage}</Text>
            {errorRetryAction ? (
              <Pressable accessibilityRole="button" onPress={errorRetryAction}>
                <Text style={styles.retryText}>Reintentar</Text>
              </Pressable>
            ) : null}
          </View>
        ) : null}
        {queueNotice ? (
          <View accessibilityLiveRegion="polite" style={styles.queueNotice}>
            <Text style={styles.queueNoticeText}>{queueNotice}</Text>
          </View>
        ) : null}

        <View style={styles.homeSectionHeader}>
          <Text style={styles.homeSectionTitle}>Escuchado recientemente</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Ver historial reciente"
            onPress={() => navigateTo('recent')}
          >
            <Text style={styles.homeSectionAction}>Ver todo</Text>
          </Pressable>
        </View>
        {recentTracks.length ? (
          <ScrollView
            horizontal
            contentContainerStyle={styles.homeRecentList}
            showsHorizontalScrollIndicator={false}
          >
            {recentTracks.map(track => (
              <Pressable
                key={track.id}
                accessibilityRole="button"
                accessibilityLabel={`Reproducir ${track.title} de ${track.artist}`}
                onPress={() => playTracks(recentTracks, track, 'Recientes')}
                style={styles.homeRecentCard}
              >
                <Artwork uri={track.artwork} size={116} />
                <Text numberOfLines={1} style={styles.homeRecentTitle}>
                  {track.title}
                </Text>
                <Text numberOfLines={1} style={styles.homeRecentArtist}>
                  {track.artist}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        ) : (
          <Text style={styles.homeEmptyHint}>
            Las canciones que reproduzcas aparecerán aquí.
          </Text>
        )}

        <View style={styles.homeSectionHeader}>
          <Text style={styles.homeSectionTitle}>Tu colección</Text>
        </View>
        <View style={styles.homeShortcutGrid}>
          {shortcuts.map(shortcut => (
            <Pressable
              key={shortcut.id}
              accessibilityRole="button"
              accessibilityLabel={`Abrir ${shortcut.label}`}
              onPress={() => navigateTo(shortcut.id)}
              style={styles.homeShortcut}
            >
              <View style={styles.homeShortcutIcon}>
                <shortcut.icon color={colors.accent} size={20} />
              </View>
              <View style={styles.homeShortcutCopy}>
                <Text style={styles.homeShortcutTitle}>{shortcut.label}</Text>
                <Text style={styles.homeShortcutDetail}>{shortcut.detail}</Text>
              </View>
            </Pressable>
          ))}
        </View>

        <View style={styles.homeSectionHeader}>
          <Text style={styles.homeSectionTitle}>Añadidas recientemente</Text>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Abrir toda la biblioteca"
            onPress={() => navigateTo('songs')}
          >
            <Text style={styles.homeSectionAction}>Ver todo</Text>
          </Pressable>
        </View>
        {addedTracks.length ? (
          <View style={styles.homeAddedList}>
            {addedTracks.map((track, index) =>
              renderTrack(
                track,
                index,
                addedTracks,
                'Añadidas recientemente',
                false,
              ),
            )}
          </View>
        ) : (
          <View style={styles.homeEmptyLibrary}>
            <Text style={styles.homeEmptyTitle}>
              {loadingLibrary ? 'Buscando música…' : 'Biblioteca vacía'}
            </Text>
            <Text style={styles.homeEmptyHint}>
              {loadingLibrary
                ? 'Estamos revisando las canciones del dispositivo.'
                : 'Añade archivos de audio y actualiza la biblioteca.'}
            </Text>
            {!loadingLibrary ? (
              <Pressable
                accessibilityRole="button"
                onPress={() => loadLibrary()}
                style={styles.homeEmptyButton}
              >
                <Text style={styles.homeEmptyButtonText}>
                  Actualizar biblioteca
                </Text>
              </Pressable>
            ) : null}
          </View>
        )}
      </ScrollView>
    </View>
  );
}
