import { useEffect, useRef, useState } from 'react';
import { Pressable, Text, useWindowDimensions, View } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { createStyles, useColors } from '../../theme/theme';
import type { Track } from '../../types/Track';
import { formatTime } from '../../utils/formatTime';
import {
  DragHeader,
  SeekArea,
  playerTools,
  useTicker,
  useTrackChange,
  usePlayerKit,
  type SkinProps,
} from './kit';

const PROMPT = 'PS C:\\Música> ';
const LOG_LINES = 14;
const ROWS = 5;
const TYPE_MS = 35;

type Line = { text: string; command?: boolean; dim?: boolean };

const noise = (seed: number) => {
  const value = Math.sin(seed * 12.9898) * 43758.5453;
  return value - Math.floor(value);
};

function details(track: Track): Line[] {
  return [
    { text: ' ' },
    { text: `Título   : ${track.title}` },
    { text: `Artista  : ${track.artist}` },
    { text: `Álbum    : ${track.album}` },
    { text: `Duración : ${formatTime(track.duration)}` },
    { text: ' ' },
  ];
}

/** A console that types every action as a command, letter by letter. */
function useConsole(track: Track | null, running: boolean) {
  const reducedMotion = useReducedMotion();
  const [log, setLog] = useState<Line[]>([
    { text: 'Mi Música. Biblioteca local en este teléfono.', dim: true },
  ]);
  const [command, setCommand] = useState({
    text: '',
    typed: 0,
    output: [] as Line[],
  });
  const pending = useRef(command);
  pending.current = command;

  const flush = (current = pending.current) =>
    current.text
      ? (lines: Line[]) =>
          [
            ...lines,
            { text: PROMPT + current.text, command: true },
            ...current.output,
          ].slice(-LOG_LINES)
      : (lines: Line[]) => lines;

  const run = (text: string, output: Line[] = []) => {
    setLog(flush());
    if (reducedMotion) {
      setLog(lines =>
        [...lines, { text: PROMPT + text, command: true }, ...output].slice(
          -LOG_LINES,
        ),
      );
      setCommand({ text: '', typed: 0, output: [] });
    } else {
      setCommand({ text, typed: 0, output });
    }
  };

  useEffect(() => {
    if (!command.text || !running) return;
    const timer = setTimeout(() => {
      if (command.typed > command.text.length + 3) {
        setLog(flush(command));
        setCommand({ text: '', typed: 0, output: [] });
      } else {
        setCommand(current => ({ ...current, typed: current.typed + 1 }));
      }
    }, TYPE_MS);
    return () => clearTimeout(timer);
  }, [command, running]);

  const first = useRef(true);
  useEffect(() => {
    if (first.current && track) {
      first.current = false;
      run('Get-Cancion -Actual', details(track));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [track]);

  return { log, typing: command.text.slice(0, command.typed), run };
}

export function TerminalPlayer({ covered, headerGesture, onClose }: SkinProps) {
  const kit = usePlayerKit({ covered });
  const { colors, type } = useColors();
  const styles = useStyles();
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const reducedMotion = useReducedMotion();
  const terminal = useConsole(kit.track, kit.visible);
  const tick = useTicker(kit.visible && !reducedMotion, 120);
  const charWidth = (type.body.fontSize ?? 14) * 0.6;
  const columns = Math.max(20, Math.floor((width - 24) / charWidth));
  const barWidth = Math.max(10, columns - 14);
  useTrackChange(kit.track?.id, () => {
    if (kit.track) terminal.run('Get-Cancion -Actual', details(kit.track));
  });

  if (!kit.track) return null;
  const { band, bandInk } = colors.skin;
  const filled = Math.round(kit.progress * barWidth);
  const playhead = Math.round(kit.progress * columns);
  const seed = Number(kit.track.id) || kit.track.title.length;
  const heights = Array.from({ length: columns }, (_, column) => {
    const base =
      1 +
      Math.abs(
        Math.sin(column * 0.31 + seed * 1.7) * Math.sin(column * 0.13 + seed),
      ) *
        (ROWS - 1);
    const near = kit.lively && Math.abs(column - playhead) < 6;
    return base + (near ? noise(column + Math.floor(tick / 2)) * 2 : 0);
  });
  const wave = Array.from({ length: ROWS }, (_, row) => {
    const cells = heights
      .map(height => (height >= ROWS - row ? '█' : ' '))
      .join('');
    return { played: cells.slice(0, playhead), rest: cells.slice(playhead) };
  });
  const tools = playerTools(kit);
  const act = (command: string, action: () => void) => () => {
    terminal.run(command);
    action();
  };
  const keys = [
    { ...tools[0], caption: 'Cola', command: 'Get-Cola' },
    { ...tools[1], command: 'Get-Letra' },
    {
      key: 'shuffle',
      caption: 'Mezcla',
      label: kit.shuffle ? 'Desactivar mezcla' : 'Activar mezcla',
      active: kit.shuffle,
      onPress: kit.toggleShuffle,
      command: `Set-Mezcla $${!kit.shuffle}`,
    },
    {
      key: 'repeat',
      caption: 'Repetir',
      label: kit.repeatLabel,
      active: kit.repeatOn,
      onPress: kit.cycleRepeat,
      command: 'Set-Repetir',
    },
    { ...tools[2], command: 'Set-Temporizador' },
    { ...tools[3], command: 'Set-Velocidad' },
    { ...tools[4], caption: 'Ecual.', command: 'Set-Ecualizador' },
    {
      key: 'menu',
      caption: 'Más',
      label: `Más acciones para ${kit.track.title}`,
      active: false,
      onPress: kit.openMenu,
      command: 'Get-Acciones',
    },
  ];

  return (
    <View style={[styles.player, { paddingBottom: insets.bottom + 8 }]}>
      <DragHeader
        gesture={headerGesture}
        style={[styles.band, { paddingTop: insets.top, backgroundColor: band }]}
      >
        <View style={styles.bandRow}>
          <Pressable
            accessibilityLabel="Cerrar reproductor"
            accessibilityRole="button"
            onPress={onClose}
            style={styles.bandButton}
          >
            <Text style={[type.bodyStrong, { color: bandInk }]}>[ Salir ]</Text>
          </Pressable>
          <Pressable
            accessibilityLabel={
              kit.favorite ? 'Quitar de favoritas' : 'Añadir a favoritas'
            }
            accessibilityRole="button"
            accessibilityState={{ selected: kit.favorite }}
            onPress={act(
              kit.favorite ? 'Remove-Favorita' : 'Add-Favorita',
              kit.toggleFavorite,
            )}
            style={styles.bandButton}
          >
            <Text style={[type.bodyStrong, { color: bandInk }]}>
              [ Favorita: {kit.favorite ? 'sí' : 'no'} ]
            </Text>
          </Pressable>
        </View>
        <Text
          numberOfLines={1}
          style={[type.bodyStrong, styles.bandText, { color: bandInk }]}
        >
          Reproduciendo: {kit.track.title}
        </Text>
        <SeekArea kit={kit} style={styles.bandSeek}>
          <Text numberOfLines={1} style={[type.body, { color: bandInk }]}>
            [{'o'.repeat(filled)}
            {' '.repeat(barWidth - filled)}] {formatTime(kit.position)}
          </Text>
        </SeekArea>
      </DragHeader>

      <View style={styles.log}>
        {terminal.log.map((line, index) => (
          <Text
            key={index}
            numberOfLines={1}
            style={[
              type.body,
              styles.line,
              line.dim && { color: colors.textSecondary },
            ]}
          >
            {line.command ? (
              <>
                {PROMPT}
                <Text style={{ color: colors.accent }}>
                  {line.text.slice(PROMPT.length)}
                </Text>
              </>
            ) : (
              line.text
            )}
          </Text>
        ))}
        <Text numberOfLines={1} style={[type.body, styles.line]}>
          {PROMPT}
          <Text style={{ color: colors.accent }}>{terminal.typing}</Text>
          {Math.floor(tick / 4) % 2 ? ' ' : '█'}
        </Text>
      </View>

      <SeekArea
        kit={kit}
        label="Forma de la canción. Toca para cambiar la posición"
        style={styles.wave}
      >
        {wave.map((row, index) => (
          <Text key={index} numberOfLines={1} style={styles.waveRow}>
            <Text style={{ color: colors.accent }}>{row.played}</Text>
            <Text style={{ color: colors.textSecondary }}>{row.rest}</Text>
          </Text>
        ))}
      </SeekArea>

      <View style={styles.transport}>
        <Pressable
          accessibilityLabel="Canción anterior"
          accessibilityRole="button"
          onPress={act('Skip-Cancion -Anterior', kit.previous)}
          style={styles.key}
        >
          <Text style={type.title}>{'<<'}</Text>
        </Pressable>
        <Pressable
          accessibilityLabel={kit.isPlaying ? 'Pausar' : 'Reproducir'}
          accessibilityRole="button"
          disabled={!kit.ready}
          onPress={act(
            kit.isPlaying ? 'Suspend-Musica' : 'Resume-Musica',
            kit.toggle,
          )}
          style={[styles.key, styles.playKey]}
        >
          <Text style={[type.title, { color: colors.onControl }]}>
            {kit.isPlaying ? 'Suspender' : 'Reanudar'}
          </Text>
        </Pressable>
        <Pressable
          accessibilityLabel="Siguiente canción"
          accessibilityRole="button"
          onPress={act('Skip-Cancion -Siguiente', kit.next)}
          style={styles.key}
        >
          <Text style={type.title}>{'>>'}</Text>
        </Pressable>
      </View>

      <View style={styles.keys}>
        {keys.map(key => (
          <Pressable
            key={key.key}
            accessibilityLabel={key.label}
            accessibilityRole="button"
            accessibilityState={{ selected: key.active }}
            onPress={act(key.command, key.onPress)}
            style={[styles.fkey, key.active && styles.fkeyOn]}
          >
            <Text
              numberOfLines={1}
              style={[
                type.caption,
                { color: key.active ? colors.background : colors.text },
              ]}
            >
              {key.caption}
            </Text>
          </Pressable>
        ))}
      </View>
    </View>
  );
}

const useStyles = createStyles(colors => ({
  player: { flex: 1, backgroundColor: colors.background },
  band: { paddingHorizontal: 10, paddingBottom: 6 },
  bandRow: { flexDirection: 'row', justifyContent: 'space-between' },
  bandButton: { minHeight: 48, justifyContent: 'center' },
  bandText: {},
  bandSeek: { minHeight: 40, justifyContent: 'center' },
  log: {
    flex: 1,
    justifyContent: 'flex-end',
    paddingHorizontal: 10,
    paddingVertical: 8,
    overflow: 'hidden',
  },
  line: { lineHeight: 20 },
  wave: { paddingHorizontal: 10, paddingVertical: 6 },
  waveRow: {
    fontFamily: colors.design.fonts.body,
    fontSize: 13,
    lineHeight: 14,
  },
  transport: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 10,
    paddingTop: 6,
  },
  key: {
    flex: 1,
    minHeight: 64,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.text,
  },
  playKey: {
    flex: 2,
    backgroundColor: colors.control,
    borderColor: colors.control,
  },
  keys: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    paddingHorizontal: 10,
    paddingTop: 6,
  },
  fkey: {
    flexBasis: '23%',
    flexGrow: 1,
    minHeight: 50,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 1,
    borderColor: colors.outline,
  },
  fkeyOn: { backgroundColor: colors.accent, borderColor: colors.accent },
}));
