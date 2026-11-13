import { RepeatMode } from 'react-native-track-player';
import { playerTools, type PlayerKit } from './kit';

export type Tool = {
  key: string;
  caption: string;
  label: string;
  active: boolean;
  onPress: () => void;
};

/** Every action of the player besides play, skip, seek and favorite. */
export function allTools(kit: PlayerKit): Tool[] {
  const tools = playerTools(kit);
  return [
    tools[0],
    tools[1],
    {
      key: 'shuffle',
      caption: 'Mezcla',
      label: kit.shuffle ? 'Desactivar mezcla' : 'Activar mezcla',
      active: kit.shuffle,
      onPress: kit.toggleShuffle,
    },
    {
      key: 'repeat',
      caption:
        kit.repeatMode === RepeatMode.Track
          ? 'Canción'
          : kit.repeatMode === RepeatMode.Queue
          ? 'Repite cola'
          : 'Repetir',
      label: kit.repeatLabel,
      active: kit.repeatOn,
      onPress: kit.cycleRepeat,
    },
    tools[2],
    tools[3],
    { ...tools[4], caption: 'Ecualizador' },
    {
      key: 'menu',
      caption: 'Más',
      label: `Más acciones para ${kit.track?.title ?? 'la canción'}`,
      active: false,
      onPress: kit.openMenu,
    },
  ];
}
