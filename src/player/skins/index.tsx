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
  constelacion: TurntablePlayer,
  jardin: KawaiiPlayer,
  origami: TicketPlayer,
  cyberpunk: TerminalPlayer,
  vaporwave: MixtapePlayer,
  manga: BrutalPlayer,
  steampunk: TurntablePlayer,
  naveespacial: TerminalPlayer,
  y2k: MixtapePlayer,
  western: TicketPlayer,
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
