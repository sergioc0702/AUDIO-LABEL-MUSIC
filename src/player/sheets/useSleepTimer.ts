import { useEffect, useState } from 'react';
import {
  getSleepTimer,
  subscribeSleepTimer,
  type SleepTimerState,
} from '../../services/playback/sleepTimer';

export function useSleepTimer() {
  const [timer, setTimer] = useState<SleepTimerState>(getSleepTimer);
  const [secondsLeft, setSecondsLeft] = useState(0);

  useEffect(() => subscribeSleepTimer(setTimer), []);
  useEffect(() => {
    if (timer.mode !== 'time') {
      return;
    }
    const update = () =>
      setSecondsLeft(
        Math.max(0, Math.ceil((timer.deadline - Date.now()) / 1000)),
      );
    update();
    const interval = setInterval(update, 1000);
    return () => clearInterval(interval);
  }, [timer]);

  return { timer, secondsLeft };
}
