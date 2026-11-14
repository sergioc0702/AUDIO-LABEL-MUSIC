import { StatusBar, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { TabBar } from './src/navigation/TabBar';
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
import { createStyles, useColors } from './src/theme/theme';
import { Snackbar } from './src/ui/Snackbar';

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
}));
