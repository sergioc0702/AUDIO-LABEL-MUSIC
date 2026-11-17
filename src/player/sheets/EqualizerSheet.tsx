import { Switch, Text, useWindowDimensions, View } from 'react-native';
import { useApp } from '../../state/AppContext';
import { useColors } from '../../theme/theme';
import { Tap } from '../../ui/Tap';
import { EqualizerBandControl } from '../controls';
import { PlaybackPanel } from '../PlaybackPanel';

import { useStyles } from './sheetStyles';

const equalizerBands = [
  { label: 'Graves', frequency: '60 Hz' },
  { label: 'Bajos', frequency: '250 Hz' },
  { label: 'Medios', frequency: '1 kHz' },
  { label: 'Presencia', frequency: '4 kHz' },
  { label: 'Agudos', frequency: '12 kHz' },
];

const equalizerPresets = [
  { name: 'Plano', gains: [0, 0, 0, 0, 0] },
  { name: 'Graves', gains: [5, 4, 0, 0, 0] },
  { name: 'Voz', gains: [-2, 1, 4, 3, 0] },
  { name: 'Acústico', gains: [2, 3, 1, 2, 2] },
  { name: 'Agudos', gains: [0, 0, 1, 4, 5] },
];

export function EqualizerSheet() {
  const { fontScale } = useWindowDimensions();
  const { colors, type } = useColors();
  const styles = useStyles();
  const { music } = useApp();
  const { equalizerSettings, updateEqualizerSettings, changeEqualizerBand } =
    music;

  return (
    <PlaybackPanel title="Ecualizador">
      <View style={styles.equalizer}>
        <View style={styles.equalizerHeader}>
          <Text style={type.bodyStrong}>
            {equalizerSettings.enabled ? 'Activado' : 'Desactivado'}
          </Text>
          <Switch
            accessibilityLabel="Activar ecualizador"
            onValueChange={enabled =>
              updateEqualizerSettings({ ...equalizerSettings, enabled })
            }
            thumbColor={colors.text}
            trackColor={{ false: colors.outline, true: colors.accent }}
            value={equalizerSettings.enabled}
          />
        </View>
        <View
          needsOffscreenAlphaCompositing
          style={[styles.presets, !equalizerSettings.enabled && styles.off]}
        >
          {equalizerPresets.map(preset => {
            const selected = preset.gains.every(
              (gain, index) => gain === equalizerSettings.bandGainsDb[index],
            );
            return (
              <Tap
                key={preset.name}
                accessibilityRole="button"
                accessibilityLabel={`Usar perfil ${preset.name}`}
                accessibilityState={{ selected }}
                onPress={() =>
                  updateEqualizerSettings({
                    ...equalizerSettings,
                    bandGainsDb: [...preset.gains],
                  })
                }
                style={[
                  styles.preset,
                  { minWidth: 66 * fontScale },
                  selected && styles.presetSelected,
                ]}
              >
                <Text
                  style={[
                    type.label,
                    styles.presetText,
                    selected && styles.presetSelectedText,
                  ]}
                >
                  {preset.name}
                </Text>
              </Tap>
            );
          })}
        </View>
        <View style={styles.bands}>
          {equalizerBands.map((band, index) => (
            <EqualizerBandControl
              key={band.frequency}
              frequency={band.frequency}
              label={band.label}
              enabled={equalizerSettings.enabled}
              onChange={gain => changeEqualizerBand(index, gain)}
              value={equalizerSettings.bandGainsDb[index] ?? 0}
            />
          ))}
        </View>
      </View>
    </PlaybackPanel>
  );
}
