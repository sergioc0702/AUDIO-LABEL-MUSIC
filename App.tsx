import { useEffect, useRef } from 'react';
import {
  Animated,
  Pressable,
  StatusBar,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { Home, Library, Search } from 'lucide-react-native';
import {
  SafeAreaProvider,
  useSafeAreaInsets,
} from 'react-native-safe-area-context';
import { useReducedMotion } from './src/hooks/useReducedMotion';
import { MiniPlayer } from './src/player/MiniPlayer';
import { NowPlaying } from './src/player/NowPlaying';
import {
  EqualizerSheet,
  QueueSheet,
  SleepTimerSheet,
  SpeedSheet,
} from './src/player/Sheets';
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
import { motionDuration, motionEasing } from './src/theme/motion';
import { colors, spacing, type } from './src/theme/theme';
import { Snackbar } from './src/ui/Snackbar';

const tabs: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Inicio', icon: Home },
  { id: 'search', label: 'Buscar', icon: Search },
  { id: 'library', label: 'Biblioteca', icon: Library },
];

function TabBar() {
  const { nav } = useApp();
  const insets = useSafeAreaInsets();

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
                color={selected ? colors.text : colors.textSecondary}
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
  const { nav } = useApp();
  const reducedMotion = useReducedMotion();
  const reveal = useRef(new Animated.Value(1)).current;
  const routeKey = `${nav.tab}:${JSON.stringify(nav.route)}`;

  useEffect(() => {
    if (reducedMotion) {
      return;
    }
    reveal.setValue(0);
    Animated.timing(reveal, {
      toValue: 1,
      duration: motionDuration.state,
      easing: motionEasing.enter,
      useNativeDriver: true,
    }).start();
  }, [reducedMotion, reveal, routeKey]);

  return (
    <Animated.View style={[styles.screens, { opacity: reveal }]}>
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
    </Animated.View>
  );
}

function AppContent() {
  const { music } = useApp();
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.app}>
      <StatusBar barStyle="light-content" />
      <Screens />
      <View style={[styles.statusBar, { height: insets.top }]} />
      <MiniPlayer />
      <TabBar />
      <Snackbar
        bottom={insets.bottom + (music.currentTrack ? 140 : 76)}
        placement="app"
      />
      <NowPlaying />
      <QueueSheet />
      <SleepTimerSheet />
      <SpeedSheet />
      <EqualizerSheet />
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
    <SafeAreaProvider>
      <AppProvider initialTab={initialScreen}>
        <AppContent />
      </AppProvider>
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
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
  tabIconSelected: { backgroundColor: colors.surfaceHigh },
  tabLabelSelected: { color: colors.text, fontWeight: '600' },
});
