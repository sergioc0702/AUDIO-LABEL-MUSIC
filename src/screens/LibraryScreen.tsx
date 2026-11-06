import {
  useEffect,
  useRef,
  type Dispatch,
  type ReactNode,
  type Ref,
  type SetStateAction,
} from 'react';
import {
  ActivityIndicator,
  Animated,
  FlatList,
  RefreshControl,
  ScrollView,
  Text,
  View,
} from 'react-native';
import {
  ChevronLeft,
  ListMusic,
  Music2,
  Play,
  Plus,
  Shuffle,
  SlidersHorizontal,
  X,
} from 'lucide-react-native';
import { PressableScale } from '../components/motion/PressableScale';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { motionDuration, motionEasing } from '../theme/motion';
import {
  Artwork,
  LibrarySkeleton,
} from '../components/library/LibraryComponents';
import type {
  LibraryTab,
  Playlist,
  RecentPlayback,
  Track,
} from '../types/Track';
import type { createStyles } from '../theme/createStyles';
import type { AppDesignTokens } from '../theme/tokens';
import type { TrackSort } from '../utils/sortTracks';
import { shuffleTracks } from '../utils/shuffleQueue';
import { formatTrackCount } from '../utils/formatTrackCount';

export type SelectedGroup = {
  kind: 'album' | 'artist';
  name: string;
  tracks: Track[];
};

export type GroupedLibraryItem = {
  key: string;
  name: string;
  tracks: Track[];
};

type ScreenStyles = ReturnType<typeof createStyles>;

type LibraryScreenProps = {
  colors: AppDesignTokens['colors'];
  styles: ScreenStyles;
  libraryScrollY: Animated.Value;
  libraryScrollRef: Ref<FlatList<Track>>;
  selectedGroup: SelectedGroup | null;
  selectedPlaylist: Playlist | null;
  activeTab: LibraryTab;
  activeNavigationItem: LibraryTab | 'favorites';
  libraryFilter: 'all' | 'favorites';
  trackSort: TrackSort;
  selectedGenre: string | null;
  search: string;
  loadingLibrary: boolean;
  loadingPlaylists: boolean;
  playerReady: boolean;
  errorMessage: string | null;
  errorRetryAction: (() => void) | null;
  queueNotice: string | null;
  recentPlayback: RecentPlayback[];
  recentTracks: Track[];
  visibleTracks: Track[];
  visibleSelectedGroupTracks: Track[];
  playlistTracks: Track[];
  visiblePlaylistTracks: Track[];
  visiblePlaylists: Playlist[];
  groupedLibrary: GroupedLibraryItem[];
  librarySections: { id: LibraryTab | 'favorites'; label: string }[];
  trackSorts: { id: TrackSort; label: string }[];
  setSelectedGroup: Dispatch<SetStateAction<SelectedGroup | null>>;
  setSelectedPlaylistId: Dispatch<SetStateAction<string | null>>;
  setSearch: Dispatch<SetStateAction<string>>;
  setPlaylistDialogError: Dispatch<SetStateAction<string | null>>;
  setPlaylistNameDialog: Dispatch<
    SetStateAction<{
      playlistId: string | null;
      name: string;
      trackIds?: string[];
    } | null>
  >;
  setTrackSort: Dispatch<SetStateAction<TrackSort>>;
  setFiltersVisible: Dispatch<SetStateAction<boolean>>;
  setSelectedGenre: Dispatch<SetStateAction<string | null>>;
  navigateTo: (destination: LibraryTab | 'favorites') => void;
  playTracks: (
    tracks: Track[],
    track: Track,
    sourceLabel?: string,
  ) => Promise<void>;
  playPlaylist: (playlist: Playlist, startingTrack?: Track) => Promise<void>;
  openPlaylistTrackPicker: (playlist: Playlist) => void;
  clearRecentPlayback: () => void;
  loadLibrary: () => void;
  renderTrack: (
    track: Track,
    index: number,
    queueTracks?: Track[],
    sourceLabel?: string,
    fromLibrary?: boolean,
  ) => ReactNode;
  renderGroupedLibrary: (group: GroupedLibraryItem) => ReactNode;
  renderPlaylistCard: (playlist: Playlist) => ReactNode;
  renderPlaylistTrack: (track: Track) => ReactNode;
};

export function LibraryScreen(props: LibraryScreenProps) {
  const {
    colors,
    styles,
    libraryScrollY,
    libraryScrollRef,
    selectedGroup,
    selectedPlaylist,
    activeTab,
    activeNavigationItem,
    libraryFilter,
    trackSort,
    selectedGenre,
    search,
    loadingLibrary,
    loadingPlaylists,
    playerReady,
    errorMessage,
    errorRetryAction,
    queueNotice,
    recentPlayback,
    recentTracks,
    visibleTracks,
    visibleSelectedGroupTracks,
    playlistTracks,
    visiblePlaylistTracks,
    visiblePlaylists,
    groupedLibrary,
    librarySections,
    trackSorts,
    setSelectedGroup,
    setSelectedPlaylistId,
    setSearch,
    setPlaylistDialogError,
    setPlaylistNameDialog,
    setTrackSort,
    setFiltersVisible,
    setSelectedGenre,
    navigateTo,
    playTracks,
    playPlaylist,
    openPlaylistTrackPicker,
    clearRecentPlayback,
    loadLibrary,
    renderTrack,
    renderGroupedLibrary,
    renderPlaylistCard,
    renderPlaylistTrack,
  } = props;
  const reducedMotion = useReducedMotion();
  const contentReveal = useRef(new Animated.Value(1)).current;
  const contentKey = `${activeNavigationItem}:${selectedGroup?.name ?? ''}:${
    selectedPlaylist?.id ?? ''
  }`;

  useEffect(() => {
    if (reducedMotion) {
      return;
    }
    contentReveal.setValue(0);
    Animated.timing(contentReveal, {
      toValue: 1,
      duration: motionDuration.enter,
      easing: motionEasing.enter,
      useNativeDriver: true,
    }).start();
  }, [contentKey, contentReveal, reducedMotion]);

  return (
    <View style={styles.libraryScreen}>
      <View style={styles.header}>
        {selectedGroup || selectedPlaylist ? (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel={
              selectedGroup
                ? `Volver a ${
                    selectedGroup.kind === 'album' ? 'álbumes' : 'artistas'
                  }`
                : 'Volver a las listas'
            }
            onPress={() => {
              setSelectedGroup(null);
              setSelectedPlaylistId(null);
              setSearch('');
            }}
            style={[styles.refreshButton, styles.headerBackButton]}
          >
            <ChevronLeft color={colors.accent} size={24} />
          </PressableScale>
        ) : null}
        <View style={styles.headerTitle}>
          <Animated.Text
            style={[
              styles.eyebrow,
              {
                opacity: libraryScrollY.interpolate({
                  inputRange: [0, 52],
                  outputRange: [1, 0],
                  extrapolate: 'clamp',
                }),
              },
            ]}
          >
            {selectedGroup
              ? selectedGroup.kind === 'album'
                ? 'ÁLBUM'
                : 'ARTISTA'
              : selectedPlaylist
              ? 'LISTA DE REPRODUCCIÓN'
              : activeTab === 'recent'
              ? 'HISTORIAL'
              : 'TU COLECCIÓN'}
          </Animated.Text>
          <Animated.Text
            numberOfLines={1}
            style={[
              styles.heading,
              {
                transform: [
                  {
                    scale: libraryScrollY.interpolate({
                      inputRange: [0, 80],
                      outputRange: [1, 20 / 28],
                      extrapolate: 'clamp',
                    }),
                  },
                ],
              },
            ]}
          >
            {selectedGroup
              ? selectedGroup.name
              : selectedPlaylist
              ? selectedPlaylist.name
              : activeNavigationItem === 'favorites'
              ? 'Favoritas'
              : activeTab === 'albums'
              ? 'Álbumes'
              : activeTab === 'artists'
              ? 'Artistas'
              : activeTab === 'recent'
              ? 'Recientes'
              : activeTab === 'playlists'
              ? 'Listas'
              : 'Biblioteca'}
          </Animated.Text>
        </View>
        {activeTab === 'playlists' && !selectedGroup && !selectedPlaylist ? (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Crear lista de reproducción"
            onPress={() => {
              setPlaylistDialogError(null);
              setPlaylistNameDialog({ playlistId: null, name: '' });
            }}
            style={styles.refreshButton}
          >
            <Plus color={colors.accent} size={24} />
          </PressableScale>
        ) : null}
      </View>

      {!selectedPlaylist && !selectedGroup ? (
        <ScrollView
          horizontal
          style={styles.librarySectionTabs}
          contentContainerStyle={styles.librarySectionTabsContent}
          showsHorizontalScrollIndicator={false}
        >
          {librarySections.map(section => {
            const selected = activeNavigationItem === section.id;
            return (
              <PressableScale
                key={section.id}
                accessibilityRole="tab"
                accessibilityLabel={section.label}
                accessibilityState={{ selected }}
                onPress={() => navigateTo(section.id)}
                style={[
                  styles.librarySectionTab,
                  selected && styles.librarySectionTabSelected,
                ]}
              >
                <Text
                  style={[
                    styles.librarySectionTabLabel,
                    selected && styles.librarySectionTabLabelSelected,
                  ]}
                >
                  {section.label}
                </Text>
              </PressableScale>
            );
          })}
        </ScrollView>
      ) : null}

      {activeTab === 'songs' && !selectedGroup ? (
        <View style={styles.libraryPrimaryActions}>
          <View style={styles.libraryPlaybackActions}>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={`Reproducir ${visibleTracks.length} canciones`}
              disabled={visibleTracks.length === 0 || !playerReady}
              onPress={() =>
                visibleTracks[0] &&
                playTracks(visibleTracks, visibleTracks[0], 'Biblioteca')
              }
              style={[
                styles.libraryPlayButton,
                (visibleTracks.length === 0 || !playerReady) &&
                  styles.playlistButtonDisabled,
              ]}
            >
              <Play color={colors.onAccent} fill={colors.onAccent} size={19} />
            </PressableScale>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={`Reproducir aleatoriamente ${visibleTracks.length} canciones`}
              disabled={visibleTracks.length === 0 || !playerReady}
              onPress={() => {
                const shuffledTracks = shuffleTracks(visibleTracks);
                if (shuffledTracks[0]) {
                  playTracks(shuffledTracks, shuffledTracks[0], 'Aleatorio');
                }
              }}
              style={[
                styles.libraryShuffleButton,
                (visibleTracks.length === 0 || !playerReady) &&
                  styles.playlistButtonDisabled,
              ]}
            >
              <Shuffle color={colors.text} size={19} />
            </PressableScale>
          </View>
          <View style={styles.librarySortFilterActions}>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel={`Cambiar orden de canciones: ${
                trackSorts.find(sort => sort.id === trackSort)?.label
              }`}
              accessibilityHint="Alterna entre nombre A-Z, nombre Z-A y añadidas recientemente."
              onPress={() =>
                setTrackSort(currentSort => {
                  const currentIndex = trackSorts.findIndex(
                    sort => sort.id === currentSort,
                  );
                  return trackSorts[(currentIndex + 1) % trackSorts.length].id;
                })
              }
              style={styles.sortPickerButton}
            >
              <Text numberOfLines={1} style={styles.sortPickerLabel}>
                {trackSort === 'titleAsc'
                  ? 'A–Z'
                  : trackSort === 'titleDesc'
                  ? 'Z–A'
                  : 'Añadidas'}
              </Text>
            </PressableScale>
            <PressableScale
              accessibilityRole="button"
              accessibilityLabel="Filtrar por género"
              accessibilityState={{ selected: selectedGenre !== null }}
              onPress={() => setFiltersVisible(true)}
              style={styles.filtersButton}
            >
              <SlidersHorizontal color={colors.text} size={19} />
              {selectedGenre ? (
                <View style={styles.filterCountBadge}>
                  <Text style={styles.filterCountText}>1</Text>
                </View>
              ) : null}
            </PressableScale>
          </View>
        </View>
      ) : null}

      {activeTab === 'songs' && !selectedGroup ? (
        <>
          {selectedGenre ? (
            <View style={styles.activeFilterChips}>
              <PressableScale
                accessibilityRole="button"
                accessibilityLabel={`Quitar filtro de género ${selectedGenre}`}
                onPress={() => setSelectedGenre(null)}
                style={styles.activeFilterChip}
              >
                <Text style={styles.activeFilterText}>{selectedGenre}</Text>
                <X color={colors.accent} size={15} />
              </PressableScale>
            </View>
          ) : null}
        </>
      ) : null}

      {errorMessage ? (
        <View style={styles.errorBanner}>
          <Text style={styles.errorText}>{errorMessage}</Text>
          {errorRetryAction ? (
            <PressableScale
              accessibilityRole="button"
              onPress={errorRetryAction}
            >
              <Text style={styles.retryText}>Reintentar</Text>
            </PressableScale>
          ) : null}
        </View>
      ) : null}
      {queueNotice ? (
        <View accessibilityLiveRegion="polite" style={styles.queueNotice}>
          <Text style={styles.queueNoticeText}>{queueNotice}</Text>
        </View>
      ) : null}

      <Animated.View
        style={[
          styles.libraryContent,
          {
            opacity: contentReveal,
            transform: [
              {
                translateY: contentReveal.interpolate({
                  inputRange: [0, 1],
                  outputRange: [12, 0],
                }),
              },
            ],
          },
        ]}
      >
        {selectedGroup ? (
          <>
            <View style={styles.groupDetailHeader}>
              <Artwork uri={selectedGroup.tracks[0]?.artwork} size={112} />
              <View style={styles.groupDetailCopy}>
                {selectedGroup.kind === 'album' ? (
                  <Text numberOfLines={1} style={styles.trackTitle}>
                    {selectedGroup.tracks[0]?.artist}
                  </Text>
                ) : null}
                <Text numberOfLines={1} style={styles.trackSubtitle}>
                  {formatTrackCount(selectedGroup.tracks.length)} ·{' '}
                  {Math.max(
                    1,
                    Math.round(
                      selectedGroup.tracks.reduce(
                        (total, track) => total + track.duration,
                        0,
                      ) / 60,
                    ),
                  )}{' '}
                  min
                </Text>
                <View style={styles.groupDetailActions}>
                  <PressableScale
                    accessibilityRole="button"
                    accessibilityLabel={`Reproducir ${
                      selectedGroup.kind === 'album' ? 'álbum' : 'artista'
                    } ${selectedGroup.name}`}
                    disabled={selectedGroup.tracks.length === 0}
                    onPress={() =>
                      playTracks(
                        selectedGroup.tracks,
                        selectedGroup.tracks[0],
                        selectedGroup.name,
                      )
                    }
                    style={[
                      styles.libraryPlayButton,
                      selectedGroup.tracks.length === 0 &&
                        styles.playlistButtonDisabled,
                    ]}
                  >
                    <Play
                      color={colors.onAccent}
                      fill={colors.onAccent}
                      size={19}
                    />
                  </PressableScale>
                  <PressableScale
                    accessibilityRole="button"
                    accessibilityLabel={`Reproducir aleatoriamente ${selectedGroup.name}`}
                    disabled={selectedGroup.tracks.length === 0}
                    onPress={() => {
                      const shuffledTracks = shuffleTracks(
                        selectedGroup.tracks,
                      );
                      if (shuffledTracks[0]) {
                        playTracks(
                          shuffledTracks,
                          shuffledTracks[0],
                          selectedGroup.name,
                        );
                      }
                    }}
                    style={[
                      styles.libraryShuffleButton,
                      selectedGroup.tracks.length === 0 &&
                        styles.playlistButtonDisabled,
                    ]}
                  >
                    <Shuffle color={colors.text} size={19} />
                  </PressableScale>
                </View>
              </View>
            </View>
            {visibleSelectedGroupTracks.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyTitle}>No encontramos resultados</Text>
                <Text style={styles.emptyDescription}>
                  Prueba con otro título, artista o álbum.
                </Text>
              </View>
            ) : (
              <FlatList
                data={visibleSelectedGroupTracks}
                initialNumToRender={12}
                keyExtractor={track => track.id}
                maxToRenderPerBatch={8}
                renderItem={({ item, index }) =>
                  renderTrack(
                    item,
                    index,
                    selectedGroup.tracks,
                    selectedGroup.name,
                  )
                }
                windowSize={7}
                style={styles.libraryList}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              />
            )}
          </>
        ) : activeTab === 'playlists' ? (
          <>
            <View style={styles.libraryHeader}>
              <Text style={styles.sectionTitle}>
                {selectedPlaylist ? 'Canciones' : 'Tus listas de reproducción'}
              </Text>
              <Text style={styles.trackCount}>
                {selectedPlaylist
                  ? formatTrackCount(playlistTracks.length)
                  : visiblePlaylists.length}
              </Text>
            </View>
            {selectedPlaylist ? (
              <View style={styles.playlistControls}>
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel={`Reproducir lista ${selectedPlaylist.name}`}
                  disabled={playlistTracks.length === 0}
                  onPress={() => playPlaylist(selectedPlaylist)}
                  style={[
                    styles.playlistPrimaryButton,
                    playlistTracks.length === 0 &&
                      styles.playlistButtonDisabled,
                  ]}
                >
                  <Play
                    color={colors.onAccent}
                    fill={colors.onAccent}
                    size={16}
                  />
                  <Text style={styles.playlistPrimaryButtonText}>
                    Reproducir
                  </Text>
                </PressableScale>
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel={`Añadir canciones a ${selectedPlaylist.name}`}
                  onPress={() => openPlaylistTrackPicker(selectedPlaylist)}
                  style={styles.playlistSecondaryButton}
                >
                  <Text style={styles.playlistSecondaryButtonText}>
                    Añadir canciones
                  </Text>
                </PressableScale>
              </View>
            ) : null}
            {loadingPlaylists ? (
              <View style={styles.emptyState}>
                <ActivityIndicator color={colors.accent} size="large" />
                <Text style={styles.emptyTitle}>Cargando tus listas…</Text>
              </View>
            ) : selectedPlaylist ? (
              visiblePlaylistTracks.length === 0 ? (
                <View style={styles.emptyState}>
                  <Music2 color={colors.muted} size={40} />
                  <Text style={styles.emptyTitle}>
                    {search
                      ? 'No encontramos resultados'
                      : 'Esta lista está vacía'}
                  </Text>
                  <Text style={styles.emptyDescription}>
                    {search
                      ? 'Prueba con otro título, artista o álbum.'
                      : 'Añade canciones de tu biblioteca para empezar.'}
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={visiblePlaylistTracks}
                  getItemLayout={(_data, index) => ({
                    length: 76,
                    offset: 76 * index,
                    index,
                  })}
                  initialNumToRender={12}
                  keyExtractor={track => track.id}
                  maxToRenderPerBatch={8}
                  renderItem={({ item }) => renderPlaylistTrack(item)}
                  windowSize={7}
                  style={styles.libraryList}
                  contentContainerStyle={styles.listContent}
                  showsVerticalScrollIndicator={false}
                />
              )
            ) : visiblePlaylists.length === 0 ? (
              <View style={styles.emptyState}>
                <ListMusic color={colors.muted} size={40} />
                <Text style={styles.emptyTitle}>
                  {search ? 'No encontramos listas' : 'Aún no tienes listas'}
                </Text>
                <Text style={styles.emptyDescription}>
                  {search
                    ? 'Prueba con otro nombre.'
                    : 'Crea una lista y organiza tus canciones favoritas.'}
                </Text>
              </View>
            ) : (
              <FlatList
                data={visiblePlaylists}
                initialNumToRender={10}
                keyExtractor={playlist => playlist.id}
                maxToRenderPerBatch={8}
                renderItem={({ item }) => renderPlaylistCard(item)}
                windowSize={7}
                style={styles.libraryList}
                contentContainerStyle={styles.listContent}
                showsVerticalScrollIndicator={false}
              />
            )}
          </>
        ) : (
          <>
            <View style={styles.libraryHeader}>
              <Text style={styles.sectionTitle}>
                {activeTab === 'recent'
                  ? 'Reproducidas recientemente'
                  : activeTab === 'songs'
                  ? libraryFilter === 'favorites'
                    ? 'Tus favoritas'
                    : 'Todas las canciones'
                  : activeTab === 'albums'
                  ? 'Tus álbumes'
                  : 'Tus artistas'}
              </Text>
              <Text style={styles.trackCount}>
                {activeTab === 'recent'
                  ? recentTracks.length
                  : activeTab === 'songs'
                  ? visibleTracks.length
                  : new Set(
                      visibleTracks.map(track =>
                        activeTab === 'albums'
                          ? track.albumId && track.albumId !== '0'
                            ? track.albumId
                            : `${track.album}\u0000${track.artist}`
                          : track.artist.toLocaleLowerCase(),
                      ),
                    ).size}
              </Text>
              {activeTab === 'recent' && recentPlayback.length > 0 ? (
                <PressableScale
                  accessibilityRole="button"
                  accessibilityLabel="Borrar historial de reproducción"
                  onPress={clearRecentPlayback}
                  style={styles.clearHistoryButton}
                >
                  <Text style={styles.clearHistoryText}>Borrar</Text>
                </PressableScale>
              ) : null}
            </View>
            {activeTab !== 'recent' && loadingLibrary ? (
              activeTab === 'songs' ? (
                <LibrarySkeleton />
              ) : (
                <View style={styles.emptyState}>
                  <ActivityIndicator color={colors.accent} size="large" />
                  <Text style={styles.emptyTitle}>Buscando tu música…</Text>
                </View>
              )
            ) : (activeTab === 'recent' ? recentTracks : visibleTracks)
                .length === 0 ? (
              <View style={styles.emptyState}>
                <Music2 color={colors.muted} size={40} />
                <Text style={styles.emptyTitle}>
                  {search
                    ? 'No encontramos resultados'
                    : activeTab === 'recent'
                    ? 'Aún no hay canciones recientes'
                    : libraryFilter === 'favorites'
                    ? 'Aún no tienes favoritas'
                    : 'Tu biblioteca está vacía'}
                </Text>
                <Text style={styles.emptyDescription}>
                  {search
                    ? 'Prueba con otro título, artista o álbum.'
                    : activeTab === 'recent'
                    ? 'Las canciones que reproduzcas aparecerán aquí.'
                    : libraryFilter === 'favorites'
                    ? 'Marca una canción con el corazón para guardarla aquí.'
                    : 'Añade archivos de audio al dispositivo y vuelve a escanear.'}
                </Text>
              </View>
            ) : (
              <View style={styles.trackListContainer}>
                {activeTab === 'songs' || activeTab === 'recent' ? (
                  <Animated.FlatList
                    ref={activeTab === 'songs' ? libraryScrollRef : undefined}
                    data={activeTab === 'recent' ? recentTracks : visibleTracks}
                    getItemLayout={(_data, index) => ({
                      length: 76,
                      offset: 76 * index,
                      index,
                    })}
                    initialNumToRender={12}
                    keyExtractor={track => track.id}
                    maxToRenderPerBatch={8}
                    onScroll={
                      activeTab === 'songs'
                        ? Animated.event(
                            [
                              {
                                nativeEvent: {
                                  contentOffset: { y: libraryScrollY },
                                },
                              },
                            ],
                            { useNativeDriver: true },
                          )
                        : undefined
                    }
                    refreshControl={
                      activeTab === 'songs' ? (
                        <RefreshControl
                          refreshing={loadingLibrary}
                          onRefresh={loadLibrary}
                          tintColor={colors.accent}
                          colors={[colors.accent]}
                        />
                      ) : undefined
                    }
                    renderItem={({ item, index }) =>
                      renderTrack(
                        item,
                        index,
                        activeTab === 'recent' ? recentTracks : visibleTracks,
                        activeTab === 'recent'
                          ? 'Recientes'
                          : libraryFilter === 'favorites'
                          ? 'Favoritas'
                          : 'Biblioteca',
                      )
                    }
                    scrollEventThrottle={16}
                    showsVerticalScrollIndicator={false}
                    style={styles.libraryList}
                    contentContainerStyle={styles.listContent}
                    windowSize={7}
                  />
                ) : (
                  <FlatList
                    data={groupedLibrary}
                    initialNumToRender={12}
                    keyExtractor={group => group.key}
                    maxToRenderPerBatch={8}
                    renderItem={({ item }) => renderGroupedLibrary(item)}
                    windowSize={7}
                    style={styles.libraryList}
                    contentContainerStyle={styles.listContent}
                    showsVerticalScrollIndicator={false}
                  />
                )}
              </View>
            )}
          </>
        )}
      </Animated.View>
    </View>
  );
}
