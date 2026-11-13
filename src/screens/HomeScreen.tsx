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
  icon: Icon,
  index,
  onPress,
}: {
  label: string;
  icon: typeof Heart;
  index: number;
  onPress: () => void;
}) {
  const { colors, type } = useColors();
  const styles = useStyles();
  const variant = colors.design.home;
  const press = {
    accessibilityRole: 'button' as const,
    accessibilityLabel: label,
    onPress,
  };

  if (variant === 'rows') {
    const hot = index === 1;
    return (
      <Tap
        {...press}
        style={[styles.rowShortcut, hot && styles.rowShortcutHot]}
      >
        <Text
          numberOfLines={1}
          style={[type.headline, hot && { color: colors.control }]}
        >
          {label}
        </Text>
        <Icon color={hot ? colors.control : colors.text} size={26} />
      </Tap>
    );
  }
  if (variant === 'listing') {
    return (
      <Tap {...press} style={styles.listingShortcut}>
        <Text numberOfLines={1} style={[type.body, styles.listingMode]}>
          {index === 1 ? '-a---' : 'd----'}
        </Text>
        <Text numberOfLines={1} style={[type.body, styles.listingName]}>
          {label.replace(/ /g, '-')}
        </Text>
      </Tap>
    );
  }
  if (variant === 'tapes') {
    const stripes = [colors.skin.m1, colors.skin.m3, colors.skin.m2];
    return (
      <Tap {...press} style={styles.tapeShortcut}>
        <View
          style={[
            styles.tapeStripe,
            { backgroundColor: stripes[index % stripes.length] },
          ]}
        />
        <View style={styles.tapeLabel}>
          <Text numberOfLines={1} style={[type.headline, styles.tapeText]}>
            {label}
          </Text>
        </View>
        <Icon color={colors.skin.shellInk} size={20} />
      </Tap>
    );
  }
  if (variant === 'tickets') {
    return (
      <Tap {...press} style={styles.ticketShortcut}>
        <Text numberOfLines={1} style={[type.title, styles.ticketText]}>
          {label.toUpperCase()}
        </Text>
        <View style={styles.ticketStub}>
          <Icon color={colors.skin.ink} size={20} />
        </View>
        <View style={[styles.ticketNotch, styles.ticketNotchTop]} />
        <View style={[styles.ticketNotch, styles.ticketNotchBottom]} />
      </Tap>
    );
  }
  if (variant === 'keys') {
    return (
      <Tap {...press} style={styles.keyShortcut}>
        <Icon color={colors.accent} size={20} />
        <Text numberOfLines={2} style={type.label}>
          {label}
        </Text>
      </Tap>
    );
  }
  if (variant === 'pills') {
    return (
      <Tap {...press} pressedScale={0.96} style={styles.pillShortcut}>
        <View style={styles.pillIcon}>
          <Icon color={colors.accent} size={20} />
        </View>
        <Text numberOfLines={2} style={[type.label, styles.shortcutLabel]}>
          {label}
        </Text>
      </Tap>
    );
  }
  return (
    <Tap {...press} style={styles.shortcut}>
      <View style={styles.shortcutIcon}>
        <Icon color={colors.text} size={20} />
      </View>
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
  rowShortcut: {
    alignItems: 'center',
    borderBottomWidth: colors.design.line,
    borderColor: colors.text,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 60,
    paddingHorizontal: screenPadding,
  },
  rowShortcutHot: { backgroundColor: colors.skin.hot ?? colors.accent },
  listingShortcut: {
    flexDirection: 'row',
    gap: spacing.lg,
    minHeight: 44,
    alignItems: 'center',
  },
  listingMode: { color: colors.textSecondary },
  listingName: { flex: 1 },
  tapeShortcut: {
    alignItems: 'center',
    backgroundColor: colors.skin.shell ?? colors.surfaceHigh,
    borderRadius: colors.design.radius.sm,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 62,
    overflow: 'hidden',
    paddingRight: spacing.md,
  },
  tapeStripe: { alignSelf: 'stretch', width: 22 },
  tapeLabel: {
    alignSelf: 'stretch',
    backgroundColor: colors.skin.label ?? colors.surface,
    flex: 1,
    justifyContent: 'center',
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  tapeText: { color: colors.skin.ink ?? colors.text, fontSize: 30 },
  ticketShortcut: {
    alignItems: 'center',
    backgroundColor: colors.skin.paper ?? colors.surface,
    borderRadius: colors.design.radius.md,
    flexDirection: 'row',
    minHeight: 64,
    overflow: 'hidden',
  },
  ticketText: {
    color: colors.skin.ink ?? colors.text,
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  ticketStub: {
    alignItems: 'center',
    alignSelf: 'stretch',
    borderColor: colors.skin.perf ?? colors.outline,
    borderLeftWidth: 3,
    borderStyle: 'dashed',
    justifyContent: 'center',
    width: 72,
  },
  ticketNotch: {
    backgroundColor: colors.background,
    borderRadius: 11,
    height: 22,
    position: 'absolute',
    right: 61,
    width: 22,
  },
  ticketNotchTop: { top: -11 },
  ticketNotchBottom: { bottom: -11 },
  keyShortcut: {
    backgroundColor: colors.surfaceHigh,
    borderBottomWidth: 4,
    borderColor: colors.skin.keyEdge ?? colors.outline,
    borderRadius: colors.design.radius.md,
    flexBasis: '48%',
    flexGrow: 1,
    gap: spacing.sm,
    justifyContent: 'flex-end',
    minHeight: 72,
    padding: spacing.md,
  },
  pillShortcut: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: colors.design.radius.lg,
    flexBasis: '48%',
    flexDirection: 'row',
    flexGrow: 1,
    gap: spacing.sm,
    minHeight: 60,
    paddingHorizontal: spacing.sm,
  },
  pillIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceHigh,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
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
}));
