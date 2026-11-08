import { IllustratedPlayer } from './IllustratedPlayer';
import { playerTools, usePlayerKit, type SkinProps } from './kit';

export function VaporwavePlayer(props: SkinProps) {
  const kit = usePlayerKit({ covered: props.covered });
  const tools = playerTools(kit);
  return (
    <IllustratedPlayer {...props} kind="vaporwave" kit={kit} tools={tools} />
  );
}
