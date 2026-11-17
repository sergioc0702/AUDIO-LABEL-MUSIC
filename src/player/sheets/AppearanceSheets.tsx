import { ScrollView, Text, useWindowDimensions, View } from 'react-native';
import { Check } from 'lucide-react-native';
import { useApp } from '../../state/AppContext';
import { appThemes } from '../../themes/catalog';
import { useColors } from '../../theme/theme';
import { Sheet, SheetAction } from '../../ui/Sheet';
import { Tap } from '../../ui/Tap';

import { useStyles } from './sheetStyles';

export function ThemeSheet() {
  const { colors } = useColors();
  const styles = useStyles();
  const { height } = useWindowDimensions();
  const { playerSheet, setPlayerSheet, theme, selectTheme } = useApp();

  return (
    <Sheet
      closeLabel="Cerrar temas"
      onClose={() => setPlayerSheet(null)}
      subtitle="El diseño de toda la app"
      title="Tema"
      visible={playerSheet === 'theme'}
    >
      <ScrollView
        accessibilityLabel="Lista desplazable de temas disponibles"
        style={[styles.themeList, { maxHeight: height * 0.68 }]}
        showsVerticalScrollIndicator
      >
        {appThemes.map(item => (
          <SheetAction
            key={item.id}
            label={item.name}
            onPress={() => selectTheme(item.id)}
            selected={item.id === theme.id}
            trailing={
              item.id === theme.id ? (
                <Check color={colors.accent} size={22} />
              ) : null
            }
          />
        ))}
      </ScrollView>
    </Sheet>
  );
}

export function PaletteSheet() {
  const { type } = useColors();
  const styles = useStyles();
  const { playerSheet, setPlayerSheet, theme, palette, selectPalette } =
    useApp();

  return (
    <Sheet
      closeLabel="Cerrar paletas de colores"
      lightScrim
      onClose={() => setPlayerSheet(null)}
      subtitle={`Colores del tema ${theme.name}`}
      title="Paleta de colores"
      visible={playerSheet === 'palette'}
    >
      <ScrollView
        contentContainerStyle={styles.palettes}
        horizontal
        showsHorizontalScrollIndicator={false}
      >
        {theme.palettes.map(item => {
          const selected = item.id === palette.id;
          return (
            <Tap
              key={item.id}
              accessibilityRole="button"
              accessibilityLabel={`Usar paleta ${item.name}`}
              accessibilityState={{ selected }}
              onPress={() => selectPalette(item.id)}
              style={[
                styles.palette,
                { backgroundColor: item.background },
                selected && styles.paletteSelected,
              ]}
            >
              <View style={styles.paletteColors}>
                {[item.accent, item.control]
                  .concat(item.sceneColors.slice(1, 2))
                  .map((color, index) => (
                    <View
                      key={index}
                      style={[styles.paletteColor, { backgroundColor: color }]}
                    />
                  ))}
              </View>
              <Text
                numberOfLines={1}
                style={[type.label, { color: item.text }]}
              >
                {item.name}
              </Text>
              {selected ? (
                <View style={styles.paletteCheck}>
                  <Check color={item.text} size={18} />
                </View>
              ) : null}
            </Tap>
          );
        })}
      </ScrollView>
    </Sheet>
  );
}
