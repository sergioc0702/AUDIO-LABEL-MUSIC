import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from 'react';
import { BackHandler } from 'react-native';
import {
  getStoredAppearance,
  storeAppearance,
  storeWidgetLook,
} from '../native/musicLibrary';
import { ColorsContext } from '../theme/theme';
import {
  defaultAppearance,
  resolveAppearance,
  type Appearance,
} from '../themes/catalog';
import type { AppTheme, Palette } from '../theme/types';
import type { Playlist, Track } from '../types/Track';
import type { CollectionRef } from '../domain/collections';
import { useMusicController, type MusicController } from './useMusicController';

export type Tab = 'home' | 'search' | 'library';
export type Route =
  | { name: 'collection'; ref: CollectionRef }
  | { name: 'settings' };
export type PlayerSheet =
  | 'sleep'
  | 'speed'
  | 'equalizer'
  | 'lyrics'
  | 'theme'
  | 'palette'
  | 'crossfade'
  | 'folders'
  | null;
export type LibraryFilter =
  | 'songs'
  | 'albums'
  | 'artists'
  | 'playlists'
  | 'folders';

type Navigation = {
  tab: Tab;
  route: Route | null;
  selectTab: (tab: Tab) => void;
  push: (route: Route) => void;
  pop: () => void;
};

type AppContextValue = {
  music: MusicController;
  nav: Navigation;
  /** The songs being added to a list, while its sheet is open. */
  playlistTarget: Track[] | null;
  setPlaylistTarget: (tracks: Track[] | null) => void;
  libraryFilter: LibraryFilter;
  setLibraryFilter: (filter: LibraryFilter) => void;
  playerSheet: PlayerSheet;
  setPlayerSheet: (sheet: PlayerSheet) => void;
  theme: AppTheme;
  palette: Palette;
  selectTheme: (themeId: string) => void;
  selectPalette: (paletteId: string) => void;
};

const AppContext = createContext<AppContextValue | null>(null);

/** Time to press back a second time to leave the app, in milliseconds. */
const exitPressWindow = 2000;

export function useApp() {
  const value = useContext(AppContext);
  if (!value) {
    throw new Error('useApp must be used inside AppProvider.');
  }
  return value;
}

export function AppProvider({
  initialTab,
  children,
}: {
  initialTab: Tab;
  children: ReactNode;
}) {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [stacks, setStacks] = useState<Record<Tab, Route[]>>({
    home: [],
    search: [],
    library: [],
  });
  const [playlistTarget, setPlaylistTarget] = useState<Track[] | null>(null);
  const [playerSheet, setPlayerSheet] = useState<PlayerSheet>(null);
  const [libraryFilter, setLibraryFilter] = useState<LibraryFilter>('songs');
  const [appearance, setAppearance] = useState<Appearance>(defaultAppearance);
  const [appearanceReady, setAppearanceReady] = useState(false);
  const tabRef = useRef(tab);
  tabRef.current = tab;

  const push = useCallback((route: Route) => {
    setStacks(current => ({
      ...current,
      [tabRef.current]: [...current[tabRef.current], route],
    }));
  }, []);
  const pop = useCallback(() => {
    setStacks(current => ({
      ...current,
      [tabRef.current]: current[tabRef.current].slice(0, -1),
    }));
  }, []);
  const selectTab = useCallback((next: Tab) => {
    if (next === tabRef.current) {
      setStacks(current => ({ ...current, [next]: [] }));
    }
    setTab(next);
  }, []);

  useEffect(() => {
    getStoredAppearance()
      .then(stored => {
        if (stored) {
          const { theme, palette } = resolveAppearance(stored);
          setAppearance({ themeId: theme.id, paletteId: palette.id });
        }
      })
      .catch(() => undefined)
      .finally(() => setAppearanceReady(true));
  }, []);

  const saveAppearance = useCallback((next: Partial<Appearance>) => {
    const { theme, palette } = resolveAppearance(next);
    const resolved = { themeId: theme.id, paletteId: palette.id };
    setAppearance(resolved);
    storeAppearance(resolved).catch(() => undefined);
  }, []);
  // Each theme has its own palettes, so a new theme starts on its first one.
  const selectTheme = useCallback(
    (themeId: string) => saveAppearance({ themeId }),
    [saveAppearance],
  );
  const selectPalette = useCallback(
    (paletteId: string) =>
      saveAppearance({ themeId: appearance.themeId, paletteId }),
    [appearance.themeId, saveAppearance],
  );

  const onPlaylistCreated = useCallback(
    (playlist: Playlist) => {
      push({
        name: 'collection',
        ref: { kind: 'playlist', id: playlist.id },
      });
    },
    [push],
  );
  const music = useMusicController({ onPlaylistCreated });
  const route = stacks[tab][stacks[tab].length - 1] ?? null;
  const lastBackPress = useRef(0);

  const hasSelection = music.selectedIds.size > 0;
  const { clearSelection, showQueueNotice } = music;
  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (hasSelection) {
          clearSelection();
          return true;
        }
        if (route) {
          pop();
          return true;
        }
        if (tab !== 'home') {
          setTab('home');
          return true;
        }
        // Leaving takes a second press, so one stray tap does not close the app.
        const now = Date.now();
        if (now - lastBackPress.current < exitPressWindow) {
          return false;
        }
        lastBackPress.current = now;
        showQueueNotice('Pulsa atrás otra vez para salir');
        return true;
      },
    );
    return () => subscription.remove();
  }, [clearSelection, hasSelection, pop, route, showQueueNotice, tab]);

  // Picked songs belong to the screen they were picked on.
  useEffect(() => {
    clearSelection();
    // clearSelection only calls a state setter.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [route, tab]);

  const nav = useMemo(
    () => ({ tab, route, selectTab, push, pop }),
    [pop, push, route, selectTab, tab],
  );

  const { theme, palette } = resolveAppearance(appearance);

  useEffect(() => {
    if (appearanceReady) {
      storeWidgetLook({
        theme: palette.design.player,
        colors: {
          background: palette.background,
          surface: palette.surface,
          surfaceHigh: palette.surfaceHigh,
          outline: palette.outline,
          text: palette.text,
          textSecondary: palette.textSecondary,
          accent: palette.accent,
          onAccent: palette.onAccent,
          control: palette.control,
          onControl: palette.onControl,
        },
        skin: palette.skin,
        display: palette.design.fonts.display,
        body: palette.design.fonts.body,
      });
    }
  }, [appearanceReady, palette]);

  return (
    <AppContext.Provider
      value={{
        music,
        nav,
        playlistTarget,
        setPlaylistTarget,
        libraryFilter,
        setLibraryFilter,
        playerSheet,
        setPlayerSheet,
        theme,
        palette,
        selectTheme,
        selectPalette,
      }}
    >
      <ColorsContext.Provider value={palette}>
        {appearanceReady ? children : null}
      </ColorsContext.Provider>
    </AppContext.Provider>
  );
}
