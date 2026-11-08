import { Pressable, StatusBar, Text, View } from 'react-native';
import { Home, Library, Search } from 'lucide-react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { MiniPlayer } from './src/player/MiniPlayer';
import { PlaybackProgressProvider } from './src/player/PlaybackProgress';
import { PlaybackWindow } from './src/player/PlaybackWindow';
import { PaletteSheet, ThemeSheet } from './src/player/Sheets';
import {
  AddToPlaylistSheet,
  PlaylistDialogs,
  PlaylistTrackPicker,
  TrackMenu,
} from './src/player/TrackMenu';
import { CollectionScreen } from './src/screens/CollectionScreen';
import { HomeScreen } from './src/screens/HomeScreen';
import { LibraryScreen } from './src/screens/LibraryScreen';
import { SearchScreen } from './src/screens/SearchScreen';
import { SettingsScreen } from './src/screens/SettingsScreen';
import { AppProvider, useApp, type Tab } from './src/state/AppContext';
import {
  spacing,
  createStyles,
  useColors,
  strongFont,
} from './src/theme/theme';
import { Snackbar } from './src/ui/Snackbar';

const tabs: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Inicio', icon: Home },
  { id: 'search', label: 'Buscar', icon: Search },
  { id: 'library', label: 'Biblioteca', icon: Library },
];

function TabBar() {
  const { colors, type } = useColors();
  const styles = useStyles();
  const { nav } = useApp();
  const insets = useSafeAreaInsets();
  const variant = colors.design.tabs;

  if (variant !== 'pill') {
    return (
      <View
        accessibilityRole="tablist"
        style={[
          styles.tabBar,
          variant === 'blocks' && styles.blockBar,
          { paddingBottom: insets.bottom },
        ]}
      >
        {tabs.map((tab, index) => {
          const selected = nav.tab === tab.id;
          const inverted = variant === 'blocks' && selected;
          return (
            <Pressable
              key={tab.id}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected }}
              android_ripple={{ color: colors.ripple }}
              onPress={() => nav.selectTab(tab.id)}
              style={[
                styles.tab,
                variant === 'blocks' && styles.blockTab,
                variant === 'blocks' && index > 0 && styles.blockDivider,
                inverted && styles.blockSelected,
              ]}
            >
              {variant === 'brackets' ? null : (
                <tab.icon
                  color={
                    inverted
                      ? colors.background
                      : selected
                      ? colors.accent
                      : colors.textSecondary
                  }
                  size={22}
                />
              )}
              <Text
                style={[
                  type.label,
                  { color: selected ? colors.text : colors.textSecondary },
                  selected && variant === 'brackets' && styles.bracketSelected,
                  inverted && styles.blockLabelSelected,
                ]}
              >
                {variant === 'brackets' && selected
                  ? `[${tab.label}]`
                  : tab.label}
              </Text>
              {variant === 'underline' ? (
                <View
                  style={[styles.underline, selected && styles.underlineOn]}
                />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.tabBar, { paddingBottom: insets.bottom }]}
    >
      {tabs.map(tab => {
        const selected = nav.tab === tab.id;
        return (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected }}
            android_ripple={{
              color: colors.ripple,
              borderless: true,
              radius: 48,
            }}
            onPress={() => nav.selectTab(tab.id)}
            style={styles.tab}
          >
            <View
              collapsable={false}
              style={[styles.tabIcon, selected && styles.tabIconSelected]}
            >
              <tab.icon
                color={
                  !selected
                    ? colors.textSecondary
                    : colors.design.player === 'kawaii'
                    ? colors.onAccent
                    : colors.text
                }
                size={22}
              />
            </View>
            <Text style={[type.caption, selected && styles.tabLabelSelected]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function Screens() {
  const styles = useStyles();
  const { nav } = useApp();
  return (
    <View style={styles.screens}>
      {nav.route?.name === 'collection' ? (
        <CollectionScreen collection={nav.route.ref} />
      ) : nav.route?.name === 'settings' ? (
        <SettingsScreen />
      ) : nav.tab === 'home' ? (
        <HomeScreen />
      ) : nav.tab === 'search' ? (
        <SearchScreen />
      ) : (
        <LibraryScreen />
      )}
    </View>
  );
}

function AppContent() {
  const styles = useStyles();
  const { colors } = useColors();
  const { music } = useApp();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.app}>
      <StatusBar barStyle={colors.isLight ? 'dark-content' : 'light-content'} />
      <Screens />
      <View style={[styles.statusBar, { height: insets.top }]} />
      <MiniPlayer />
      <TabBar />
      <Snackbar
        bottom={insets.bottom + (music.currentTrack ? 140 : 76)}
        placement="app"
      />
      <PlaybackWindow />
      <ThemeSheet />
      <PaletteSheet />
      <TrackMenu />
      <AddToPlaylistSheet />
      <PlaylistTrackPicker />
      <PlaylistDialogs />
    </View>
  );
}

export default function App({
  initialScreen = 'home',
}: {
  initialScreen?: Tab;
}) {
  return (
    <GestureHandlerRootView>
      <SafeAreaProvider>
        <AppProvider initialTab={initialScreen}>
          <PlaybackProgressProvider>
            <AppContent />
          </PlaybackProgressProvider>
        </AppProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

const useStyles = createStyles(colors => ({
  app: { backgroundColor: colors.background, flex: 1 },
  screens: { flex: 1 },
  statusBar: {
    backgroundColor: colors.background,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  tabBar: {
    backgroundColor: colors.navigation,
    marginTop: spacing.sm,
    flexDirection: 'row',
    paddingTop: spacing.sm,
  },
  tab: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.xs,
    minHeight: 56,
  },
  tabIcon: {
    alignItems: 'center',
    backgroundColor: colors.navigation,
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 64,
  },
  tabIconSelected: {
    backgroundColor:
      colors.design.player === 'kawaii' ? colors.accent : colors.surfaceHigh,
  },
  blockBar: {
    marginTop: 0,
    paddingTop: 0,
    borderTopWidth: colors.design.line,
    borderColor: colors.text,
  },
  blockTab: { justifyContent: 'center', minHeight: 64 },
  blockDivider: {
    borderLeftWidth: colors.design.line,
    borderColor: colors.text,
  },
  blockSelected: { backgroundColor: colors.text },
  blockLabelSelected: { color: colors.background },
  bracketSelected: { color: colors.accent },
  underline: { height: 3, width: 28, borderRadius: 2 },
  underlineOn: { backgroundColor: colors.accent },
  tabLabelSelected: { color: colors.text, ...strongFont(colors) },
}));
