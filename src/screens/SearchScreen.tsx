import type { ReactNode, Ref } from 'react';
import {
  Animated,
  FlatList,
  RefreshControl,
  Text,
  TextInput,
  View,
} from 'react-native';
import { Music2, Search, X } from 'lucide-react-native';
import type { Track } from '../types/Track';
import type { createStyles } from '../theme/createStyles';
import type { AppDesignTokens } from '../theme/tokens';
import { LibrarySkeleton } from '../components/library/LibraryComponents';
import { PressableScale } from '../components/motion/PressableScale';

type ScreenStyles = ReturnType<typeof createStyles>;

type SearchScreenProps = {
  colors: AppDesignTokens['colors'];
  styles: ScreenStyles;
  scrollY: Animated.Value;
  scrollRef: Ref<FlatList<Track>>;
  query: string;
  onQueryChange: (query: string) => void;
  tracks: Track[];
  loading: boolean;
  errorMessage: string | null;
  errorRetryAction: (() => void) | null;
  queueNotice: string | null;
  onRefresh: () => void;
  renderTrack: (track: Track, index: number, tracks: Track[]) => ReactNode;
};

export function SearchScreen({
  colors,
  styles,
  scrollY,
  scrollRef,
  query,
  onQueryChange,
  tracks,
  loading,
  errorMessage,
  errorRetryAction,
  queueNotice,
  onRefresh,
  renderTrack,
}: SearchScreenProps) {
  return (
    <View style={styles.libraryScreen}>
      <View style={styles.header}>
        <View style={styles.headerTitle}>
          <Animated.Text
            style={[
              styles.eyebrow,
              {
                opacity: scrollY.interpolate({
                  inputRange: [0, 52],
                  outputRange: [1, 0],
                  extrapolate: 'clamp',
                }),
              },
            ]}
          >
            ENCUENTRA TU MÚSICA
          </Animated.Text>
          <Animated.Text
            numberOfLines={1}
            style={[
              styles.heading,
              {
                transform: [
                  {
                    scale: scrollY.interpolate({
                      inputRange: [0, 80],
                      outputRange: [1, 20 / 28],
                      extrapolate: 'clamp',
                    }),
                  },
                ],
              },
            ]}
          >
            Buscar
          </Animated.Text>
        </View>
      </View>

      <View style={styles.searchBox}>
        <Search color={colors.muted} size={20} strokeWidth={2} />
        <TextInput
          accessibilityLabel="Buscar canciones, artistas o álbumes"
          onChangeText={onQueryChange}
          placeholder="Buscar en tu música"
          placeholderTextColor={colors.muted}
          returnKeyType="search"
          style={styles.searchInput}
          value={query}
        />
        {query ? (
          <PressableScale
            accessibilityRole="button"
            accessibilityLabel="Borrar búsqueda"
            hitSlop={6}
            onPress={() => onQueryChange('')}
            pressedScale={0.85}
            style={styles.searchClear}
          >
            <X color={colors.muted} size={20} />
          </PressableScale>
        ) : null}
      </View>

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

      {loading ? (
        <LibrarySkeleton />
      ) : tracks.length === 0 ? (
        <View style={styles.emptyState}>
          <Music2 color={colors.muted} size={40} />
          <Text style={styles.emptyTitle}>
            {query ? 'No encontramos resultados' : 'Tu biblioteca está vacía'}
          </Text>
          <Text style={styles.emptyDescription}>
            {query
              ? 'Prueba con otro título, artista o álbum.'
              : 'Añade archivos de audio al dispositivo y vuelve a escanear.'}
          </Text>
        </View>
      ) : (
        <Animated.FlatList
          ref={scrollRef}
          data={tracks}
          getItemLayout={(_data, index) => ({
            length: 76,
            offset: 76 * index,
            index,
          })}
          initialNumToRender={12}
          keyboardDismissMode="on-drag"
          keyboardShouldPersistTaps="handled"
          keyExtractor={track => track.id}
          maxToRenderPerBatch={8}
          onScroll={Animated.event(
            [{ nativeEvent: { contentOffset: { y: scrollY } } }],
            { useNativeDriver: true },
          )}
          refreshControl={
            <RefreshControl
              refreshing={loading}
              onRefresh={onRefresh}
              tintColor={colors.accent}
              colors={[colors.accent]}
            />
          }
          renderItem={({ item, index }) => renderTrack(item, index, tracks)}
          scrollEventThrottle={16}
          showsVerticalScrollIndicator={false}
          style={styles.libraryList}
          contentContainerStyle={styles.listContent}
          windowSize={7}
        />
      )}
    </View>
  );
}
