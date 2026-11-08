import { IllustratedPlayer } from './IllustratedPlayer';
import { playerTools, usePlayerKit, type SkinProps } from './kit';

export function NaveEspacialPlayer(props: SkinProps) {
  const kit = usePlayerKit({ covered: props.covered });
  const tools = playerTools(kit);
  return (
    <IllustratedPlayer {...props} kind="naveespacial" kit={kit} tools={tools} />
  );
}
