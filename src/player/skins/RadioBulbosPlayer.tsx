import { IllustratedPlayer } from './IllustratedPlayer';
import { playerTools, usePlayerKit, type SkinProps } from './kit';

export function RadioBulbosPlayer(props: SkinProps) {
  const kit = usePlayerKit({ covered: props.covered });
  const tools = playerTools(kit);
  return <IllustratedPlayer {...props} kind="radio" kit={kit} tools={tools} />;
}
