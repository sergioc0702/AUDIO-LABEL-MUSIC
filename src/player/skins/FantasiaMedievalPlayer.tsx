import { IllustratedPlayer } from './IllustratedPlayer';
import { playerTools, usePlayerKit, type SkinProps } from './kit';

export function FantasiaMedievalPlayer(props: SkinProps) {
  const kit = usePlayerKit({ covered: props.covered });
  const tools = playerTools(kit);
  return (
    <IllustratedPlayer
      {...props}
      kind="fantasiamedieval"
      kit={kit}
      tools={tools}
    />
  );
}
