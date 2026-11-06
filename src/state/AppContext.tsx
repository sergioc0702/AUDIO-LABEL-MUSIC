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
import type { Playlist, Track } from '../types/Track';
import type { CollectionRef } from '../utils/collections';
import { useMusicController, type MusicController } from './useMusicController';

export type Tab = 'home' | 'search' | 'library';
export type Route =
  | { name: 'collection'; ref: CollectionRef }
  | { name: 'settings' };
export type PlayerSheet = 'sleep' | 'speed' | 'equalizer' | null;
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
  playlistTarget: Track | null;
  setPlaylistTarget: (track: Track | null) => void;
  libraryFilter: LibraryFilter;
  setLibraryFilter: (filter: LibraryFilter) => void;
  playerSheet: PlayerSheet;
  setPlayerSheet: (sheet: PlayerSheet) => void;
};

const AppContext = createContext<AppContextValue | null>(null);

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
  const [playlistTarget, setPlaylistTarget] = useState<Track | null>(null);
  const [playerSheet, setPlayerSheet] = useState<PlayerSheet>(null);
  const [libraryFilter, setLibraryFilter] = useState<LibraryFilter>('songs');
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

  useEffect(() => {
    const subscription = BackHandler.addEventListener(
      'hardwareBackPress',
      () => {
        if (route) {
          pop();
          return true;
        }
        if (tab !== 'home') {
          setTab('home');
          return true;
        }
        return false;
      },
    );
    return () => subscription.remove();
  }, [pop, route, tab]);

  const nav = useMemo(
    () => ({ tab, route, selectTab, push, pop }),
    [pop, push, route, selectTab, tab],
  );

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
      }}
    >
      {children}
    </AppContext.Provider>
  );
}
