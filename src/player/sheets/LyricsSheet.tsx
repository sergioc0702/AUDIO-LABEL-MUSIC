import { useEffect, useMemo, useRef, useState } from 'react';
import { ScrollView, Text, View, type ScrollViewInstance } from 'react-native';
import { findOnlineLyrics } from '../../services/lyricsSearch';
import { storeLyrics } from '../../native/musicLibrary';
import { useApp } from '../../state/AppContext';
import { useColors } from '../../theme/theme';
import { Button } from '../../ui/Buttons';
import { Tap } from '../../ui/Tap';
import { currentLyricIndex, parseLrc } from '../../domain/lyrics';
import { PlaybackPanel } from '../PlaybackPanel';
import { usePlaybackProgress } from '../PlaybackProgress';

import { useStyles } from './sheetStyles';

export function LyricsSheet() {
  const { type } = useColors();
  const styles = useStyles();
  const { playerSheet, music } = useApp();
  const { currentTrack, importTrackLyrics, getTrackLyrics, deleteTrackLyrics } =
    music;
  const [contents, setContents] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [searching, setSearching] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const visible = playerSheet === 'lyrics';
  const trackId = currentTrack?.id;
  const liveTrackId = useRef(trackId);
  liveTrackId.current = trackId;
  /** Songs already looked up online in this session, so we do not ask twice. */
  const searched = useRef(new Set<string>());
  const lines = useMemo(() => parseLrc(contents ?? ''), [contents]);
  const plain = contents && lines.length === 0 ? contents : null;

  async function searchOnline() {
    const track = currentTrack;
    if (!track) return;
    searched.current.add(track.id);
    setSearching(true);
    setNotice(null);
    try {
      const found = await findOnlineLyrics(track);
      if (liveTrackId.current !== track.id) return;
      if (found.kind === 'synced' || found.kind === 'plain') {
        await storeLyrics(track.id, found.contents);
        if (liveTrackId.current === track.id) setContents(found.contents);
      } else {
        setNotice(
          found.kind === 'instrumental'
            ? 'Esta canción es instrumental.'
            : 'No encontramos letras para esta canción.',
        );
      }
    } catch {
      if (liveTrackId.current === track.id) {
        setNotice(
          'No se pudieron buscar las letras. Revisa tu conexión a internet.',
        );
      }
    } finally {
      if (liveTrackId.current === track.id) setSearching(false);
    }
  }

  useEffect(() => {
    let mounted = true;
    if (!visible || !trackId) {
      return () => {
        mounted = false;
      };
    }
    setLoading(true);
    setNotice(null);
    setContents(null);
    getTrackLyrics(trackId)
      .then(value => {
        if (!mounted) return;
        setContents(value);
        if (!value && !searched.current.has(trackId)) {
          searchOnline();
        }
      })
      .catch(error => {
        if (mounted) {
          setContents(null);
          setNotice(
            error instanceof Error
              ? error.message
              : 'No se pudieron cargar las letras.',
          );
        }
      })
      .finally(() => {
        if (mounted) setLoading(false);
      });
    return () => {
      mounted = false;
    };
    // searchOnline reads the current track through refs.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [getTrackLyrics, trackId, visible]);

  async function chooseLyrics() {
    if (!currentTrack) return;
    if (await importTrackLyrics(currentTrack)) {
      try {
        const next = await getTrackLyrics(currentTrack.id);
        if (liveTrackId.current === currentTrack.id) {
          setContents(next);
          setNotice(null);
        }
      } catch (error) {
        setNotice(
          error instanceof Error
            ? error.message
            : 'No se pudieron cargar las letras.',
        );
      }
    }
  }

  return (
    <PlaybackPanel
      scroll={false}
      subtitle={currentTrack?.artist}
      title={currentTrack?.title ?? 'Letras'}
    >
      {loading ? (
        <Text style={[type.secondary, styles.lyricsMessage]}>
          Cargando letras…
        </Text>
      ) : searching && !contents ? (
        <Text style={[type.secondary, styles.lyricsMessage]}>
          Buscando letras en internet…
        </Text>
      ) : lines.length > 0 ? (
        <SyncedLyrics lines={lines} />
      ) : plain ? (
        <PlainLyrics text={plain} />
      ) : (
        <Text
          accessibilityRole={notice ? 'alert' : undefined}
          style={[type.secondary, styles.lyricsMessage]}
        >
          {notice ?? 'Aún no hay letras para esta canción.'}
        </Text>
      )}
      {plain ? (
        <Text style={[type.caption, styles.lyricsNote]}>
          Esta letra no trae tiempos, así que no avanza con la música.
        </Text>
      ) : null}
      <View style={styles.lyricsActions}>
        <Button
          disabled={searching || !currentTrack}
          label={searching ? 'Buscando…' : 'Buscar letras en internet'}
          multiline
          onPress={searchOnline}
          variant="tonal"
        />
        <Button
          label="Importar archivo LRC"
          multiline
          onPress={chooseLyrics}
          variant="tonal"
        />
        {contents && currentTrack ? (
          <Button
            label="Eliminar letras"
            multiline
            onPress={async () => {
              if (await deleteTrackLyrics(currentTrack.id)) setContents(null);
            }}
            variant="tonal"
          />
        ) : null}
      </View>
    </PlaybackPanel>
  );
}

/** Lines that light up with the song, scroll to stay in view and seek on tap. */
function SyncedLyrics({ lines }: { lines: ReturnType<typeof parseLrc> }) {
  const { colors, type } = useColors();
  const styles = useStyles();
  const { music } = useApp();
  const { position } = usePlaybackProgress();
  const activeIndex = currentLyricIndex(lines, position);
  const scroll = useRef<ScrollViewInstance>(null);
  const offsets = useRef<number[]>([]);
  const [viewHeight, setViewHeight] = useState(0);
  const [userScrolling, setUserScrolling] = useState(false);

  useEffect(() => {
    if (userScrolling || activeIndex < 0) return;
    const y = offsets.current[activeIndex];
    if (y === undefined) return;
    scroll.current?.scrollTo({
      y: Math.max(0, y - viewHeight * 0.35),
      animated: true,
    });
  }, [activeIndex, userScrolling, viewHeight]);

  return (
    <ScrollView
      ref={scroll}
      contentContainerStyle={styles.lyricsLines}
      onLayout={event => setViewHeight(event.nativeEvent.layout.height)}
      onMomentumScrollEnd={() => setUserScrolling(false)}
      onScrollBeginDrag={() => setUserScrolling(true)}
      onScrollEndDrag={() => setTimeout(() => setUserScrolling(false), 2500)}
    >
      {lines.map((line, index) => {
        const active = index === activeIndex;
        const past = index < activeIndex;
        return (
          <Tap
            key={`${line.timeMs}-${index}`}
            accessibilityHint="Toca para ir a esta parte de la canción"
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            onLayout={event => {
              offsets.current[index] = event.nativeEvent.layout.y;
            }}
            onPress={() => music.seekToPosition(line.timeMs / 1000)}
          >
            <Text
              style={[
                active ? type.title : type.body,
                {
                  color: active
                    ? colors.accent
                    : past
                    ? colors.textSecondary
                    : colors.text,
                  opacity: active ? 1 : past ? 0.55 : 0.8,
                },
                styles.lyricLine,
              ]}
            >
              {line.text}
            </Text>
          </Tap>
        );
      })}
    </ScrollView>
  );
}

function PlainLyrics({ text }: { text: string }) {
  const { type } = useColors();
  const styles = useStyles();
  return (
    <ScrollView contentContainerStyle={styles.lyricsLines}>
      <Text style={[type.body, styles.lyricLine]}>{text}</Text>
    </ScrollView>
  );
}
