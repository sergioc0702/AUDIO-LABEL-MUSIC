import { useColors } from '../../theme/theme';
import { NowPlaying } from '../NowPlaying';
import { BrutalPlayer } from './BrutalPlayer';
import { KawaiiPlayer } from './KawaiiPlayer';
import { MixtapePlayer } from './MixtapePlayer';
import { TerminalPlayer } from './TerminalPlayer';
import { TicketPlayer } from './TicketPlayer';
import { TurntablePlayer } from './TurntablePlayer';
import type { SkinProps } from './kit';

const players = {
  kawaii: KawaiiPlayer,
  brutalista: BrutalPlayer,
  terminal: TerminalPlayer,
  tornamesa: TurntablePlayer,
  mixtape: MixtapePlayer,
  taquilla: TicketPlayer,
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
