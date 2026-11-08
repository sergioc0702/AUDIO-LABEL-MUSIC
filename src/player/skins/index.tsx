import { useColors } from '../../theme/theme';
import { NowPlaying } from '../NowPlaying';
import { BrutalPlayer } from './BrutalPlayer';
import { KawaiiPlayer } from './KawaiiPlayer';
import { MixtapePlayer } from './MixtapePlayer';
import { TerminalPlayer } from './TerminalPlayer';
import { TicketPlayer } from './TicketPlayer';
import { TurntablePlayer } from './TurntablePlayer';
import type { SkinProps } from './kit';
import { AcuarioPlayer } from './AcuarioPlayer';
import { RadioBulbosPlayer } from './RadioBulbosPlayer';
import { PixelPlayer } from './PixelPlayer';
import { AcuarelaPlayer } from './AcuarelaPlayer';
import { NeonBarPlayer } from './NeonBarPlayer';
import { ConstelacionPlayer } from './ConstelacionPlayer';
import { JardinPlayer } from './JardinPlayer';
import { OrigamiPlayer } from './OrigamiPlayer';
import { CyberpunkPlayer } from './CyberpunkPlayer';
import { VaporwavePlayer } from './VaporwavePlayer';
import { MangaPlayer } from './MangaPlayer';
import { SteampunkPlayer } from './SteampunkPlayer';
import { NaveEspacialPlayer } from './NaveEspacialPlayer';
import { Y2KPlayer } from './Y2KPlayer';
import { WesternPlayer } from './WesternPlayer';

const players = {
  kawaii: KawaiiPlayer,
  brutalista: BrutalPlayer,
  terminal: TerminalPlayer,
  tornamesa: TurntablePlayer,
  mixtape: MixtapePlayer,
  taquilla: TicketPlayer,
  acuario: AcuarioPlayer,
  radiobulbos: RadioBulbosPlayer,
  pixel: PixelPlayer,
  acuarela: AcuarelaPlayer,
  neonbar: NeonBarPlayer,
  constelacion: ConstelacionPlayer,
  jardin: JardinPlayer,
  origami: OrigamiPlayer,
  cyberpunk: CyberpunkPlayer,
  vaporwave: VaporwavePlayer,
  manga: MangaPlayer,
  steampunk: SteampunkPlayer,
  naveespacial: NaveEspacialPlayer,
  y2k: Y2KPlayer,
  western: WesternPlayer,
  fantasiamedieval: TurntablePlayer,
  lofi: KawaiiPlayer,
  terrorgotico: TicketPlayer,
  playa: KawaiiPlayer,
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
