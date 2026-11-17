import { useCallback, useRef, useState } from 'react';
import {
  getEqualizerSettings,
  getPlaybackRate,
  getPlaybackTuning,
  setCrossfadeSeconds as persistCrossfadeSeconds,
  setEqualizerSettings as persistEqualizerSettings,
  setPlaybackRate as persistPlaybackRate,
  setVolumeLeveling,
  type EqualizerSettings,
} from '../../native/musicLibrary';
import { setPlayerRate } from '../../services/playback/player';
import { describeFailure } from './failure';

export const playbackRates = [0.75, 1, 1.25, 1.5, 2];
export const crossfadeChoices = [0, 2, 4, 6, 8, 12];
const equalizerBandCount = 5;

/** How the music sounds: speed, equalizer, even volume and crossfade. */
export function useSoundSettings({
  setErrorMessage,
}: {
  setErrorMessage: (message: string | null) => void;
}) {
  const [playbackRate, setPlaybackRate] = useState(1);
  const [equalizerSettings, setEqualizerSettings] = useState<EqualizerSettings>(
    {
      enabled: false,
      bandGainsDb: [0, 0, 0, 0, 0],
    },
  );
  const [levelVolume, setLevelVolume] = useState(false);
  const [crossfadeSeconds, setCrossfadeSeconds] = useState(0);
  const equalizerWriteChain = useRef<Promise<void>>(Promise.resolve());

  /** Before the player starts. A damaged preference keeps the defaults. */
  const restoreEqualizer = useCallback(async (isMounted: () => boolean) => {
    const savedEqualizer = await getEqualizerSettings().catch(() => null);
    if (
      isMounted() &&
      savedEqualizer?.bandGainsDb.length === equalizerBandCount &&
      savedEqualizer.bandGainsDb.every(
        gain => Number.isFinite(gain) && gain >= -12 && gain <= 12,
      )
    ) {
      setEqualizerSettings(savedEqualizer);
    }
  }, []);

  /** Once the player started: even volume, crossfade and speed. */
  const restoreTuning = useCallback(async (isMounted: () => boolean) => {
    const tuning = await getPlaybackTuning().catch(() => null);
    if (isMounted() && tuning) {
      setLevelVolume(tuning.levelVolume);
      setCrossfadeSeconds(tuning.crossfadeSeconds);
    }
    const savedRate = await getPlaybackRate().catch(() => 1);
    const startupRate = playbackRates.includes(savedRate) ? savedRate : 1;
    await setPlayerRate(startupRate);
    if (isMounted()) {
      setPlaybackRate(startupRate);
    }
  }, []);

  async function toggleLevelVolume() {
    const next = !levelVolume;
    try {
      await setVolumeLeveling(next);
      setLevelVolume(next);
    } catch (error) {
      setErrorMessage(
        describeFailure(
          error,
          'No se pudo guardar el ajuste',
          'No se pudo guardar el ajuste.',
        ),
      );
    }
  }
  async function changeCrossfade(seconds: number) {
    try {
      await persistCrossfadeSeconds(seconds);
      setCrossfadeSeconds(seconds);
    } catch (error) {
      setErrorMessage(
        describeFailure(
          error,
          'No se pudo guardar el fundido',
          'No se pudo guardar el fundido.',
        ),
      );
    }
  }
  async function changePlaybackRate(nextRate: number) {
    let rateWasApplied = false;
    try {
      await setPlayerRate(nextRate);
      rateWasApplied = true;
      await persistPlaybackRate(nextRate);
      setPlaybackRate(nextRate);
      setErrorMessage(null);
    } catch (error) {
      let detail =
        error instanceof Error ? error.message : 'Error desconocido.';
      if (rateWasApplied) {
        try {
          await setPlayerRate(playbackRate);
        } catch (rollbackError) {
          const rollbackMessage =
            rollbackError instanceof Error
              ? rollbackError.message
              : 'Error desconocido.';
          detail = `${detail} No se pudo restaurar la velocidad anterior: ${rollbackMessage}`;
        }
      }
      setErrorMessage(`No se pudo cambiar la velocidad: ${detail}`);
    }
  }
  function updateEqualizerSettings(next: EqualizerSettings) {
    setEqualizerSettings(next);
    equalizerWriteChain.current = equalizerWriteChain.current
      .catch(() => undefined)
      .then(() => persistEqualizerSettings(next.enabled, next.bandGainsDb))
      .catch(error => {
        setErrorMessage(
          describeFailure(
            error,
            'No se pudo guardar el ecualizador',
            'No se pudo guardar la configuración del ecualizador.',
          ),
        );
      });
  }
  function changeEqualizerBand(index: number, gain: number) {
    const bandGainsDb = [...equalizerSettings.bandGainsDb];
    if (bandGainsDb[index] === gain) {
      return;
    }
    bandGainsDb[index] = gain;
    updateEqualizerSettings({ ...equalizerSettings, bandGainsDb });
  }

  return {
    playbackRate,
    equalizerSettings,
    levelVolume,
    crossfadeSeconds,
    restoreEqualizer,
    restoreTuning,
    toggleLevelVolume,
    changeCrossfade,
    changePlaybackRate,
    updateEqualizerSettings,
    changeEqualizerBand,
  };
}
