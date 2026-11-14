// Picks the full-screen player of the active theme (colors.design.player).
// Each player lives in src/themes/<id>/ and only draws: data and actions come
// from usePlayerKit in src/player/kit/playerKit.tsx.
import { useColors } from '../theme/theme';
import { NowPlaying } from '../themes/estandar/NowPlaying';
import { BloquesPlayer } from '../themes/bloques/BloquesPlayer';
import { BrutalPlayer } from '../themes/brutalista/BrutalPlayer';
import { ConstelacionPlayer } from '../themes/constelacion/ConstelacionPlayer';
import { CyberpunkPlayer } from '../themes/cyberpunk/CyberpunkPlayer';
import { KawaiiPlayer } from '../themes/kawaii/KawaiiPlayer';
import { MangaPlayer } from '../themes/manga/MangaPlayer';
import { MixtapePlayer } from '../themes/mixtape/MixtapePlayer';
import { NaveEspacialPlayer } from '../themes/naveespacial/NaveEspacialPlayer';
import { PixelPlayer } from '../themes/pixel/PixelPlayer';
import { PoderPlayer } from '../themes/poder/PoderPlayer';
import { TerminalPlayer } from '../themes/terminal/TerminalPlayer';
import { TerrorPlayer } from '../themes/terror/TerrorPlayer';
import { TicketPlayer } from '../themes/taquilla/TicketPlayer';
import { TurntablePlayer } from '../themes/tornamesa/TurntablePlayer';
import { VaporwavePlayer } from '../themes/vaporwave/VaporwavePlayer';
import type { SkinProps } from './kit/playerKit';

const players = {
  kawaii: KawaiiPlayer,
  brutalista: BrutalPlayer,
  terminal: TerminalPlayer,
  tornamesa: TurntablePlayer,
  mixtape: MixtapePlayer,
  taquilla: TicketPlayer,
  pixel: PixelPlayer,
  vaporwave: VaporwavePlayer,
  manga: MangaPlayer,
  naveespacial: NaveEspacialPlayer,
  constelacion: ConstelacionPlayer,
  cyberpunk: CyberpunkPlayer,
  terror: TerrorPlayer,
  bloques: BloquesPlayer,
  poder: PoderPlayer,
};

/** The full player of the active theme. */
export function ThemedPlayer(props: SkinProps) {
  const { colors } = useColors();
  const style = colors.design.player;
  if (style === 'estandar') {
    return <NowPlaying {...props} />;
  }
  const Player = players[style];
  return <Player {...props} />;
}
