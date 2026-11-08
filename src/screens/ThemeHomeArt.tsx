import { Text, View } from 'react-native';
import { createStyles, spacing, useColors } from '../theme/theme';

const copy: Record<string, string> = {
  acuario: 'Tu música nada contigo',
  radiobulbos: 'Sintoniza un buen momento',
  pixel: 'Cada canción es un nuevo nivel',
  acuarela: 'Colores para escuchar despacio',
  neonbar: 'Sube el volumen de la noche',
  constelacion: 'Tu cola forma su propia constelación',
  jardin: 'Deja que la música florezca',
  origami: 'Historias que se pliegan en papel',
  cyberpunk: 'La ciudad también tiene ritmo',
  vaporwave: 'Una noche de sintetizadores',
  manga: 'Tu banda sonora, en viñetas',
  steampunk: 'Música de precisión y engranajes',
  naveespacial: 'Rumbo a nuevos sonidos',
  y2k: 'Brillo cromado para tu biblioteca',
  western: 'El próximo tema ya está buscado',
};

const motifs: Record<string, string> = {
  constelacion: '✦',
  jardin: '✿',
  origami: '◇',
  cyberpunk: '▰',
  vaporwave: '◉',
  manga: '!',
  steampunk: '⚙',
  naveespacial: '◌',
  y2k: '✧',
  western: '★',
};

export function ThemeHomeArt() {
  const { colors, type } = useColors();
  const styles = useStyles();
  const id = colors.design.player;
  if (!(id in copy)) return null;

  return (
    <View style={styles.wrap}>
      <View style={[styles.hero, { backgroundColor: colors.surfaceHigh }]}>
        {id === 'acuario' ? (
          <View style={[styles.tank, { backgroundColor: colors.skin.glass }]}>
            <View
              style={[
                styles.wave,
                styles.waveBack,
                { backgroundColor: colors.skin.deep },
              ]}
            />
            <View
              style={[styles.wave, { backgroundColor: colors.skin.water }]}
            />
            {(colors.skin.fish ?? '#ff8855,#ffd04a,#ff5c8a')
              .split(',')
              .slice(0, 3)
              .map((color, i) => (
                <View
                  key={color}
                  style={[
                    styles.fish,
                    {
                      backgroundColor: color,
                      left: 18 + i * 44,
                      top: 16 + (i % 2) * 10,
                    },
                  ]}
                />
              ))}
            <View
              style={[
                styles.seaweed,
                { backgroundColor: colors.skin.plant, left: 22 },
              ]}
            />
            <View
              style={[
                styles.seaweed,
                { backgroundColor: colors.skin.plant, right: 26, height: 35 },
              ]}
            />
          </View>
        ) : null}
        {id === 'radiobulbos' ? (
          <View
            style={[styles.radio, { backgroundColor: colors.skin.cabinet }]}
          >
            <View
              style={[styles.radioDial, { backgroundColor: colors.skin.dial }]}
            >
              <View
                style={[
                  styles.radioLine,
                  { backgroundColor: colors.skin.needle },
                ]}
              />
            </View>
            <View
              style={[
                styles.radioGrille,
                { backgroundColor: colors.skin.grille },
              ]}
            />
            <View style={styles.radioKnobs}>
              <View
                style={[styles.knob, { backgroundColor: colors.skin.knob }]}
              />
              <View
                style={[styles.knob, { backgroundColor: colors.skin.knob }]}
              />
            </View>
          </View>
        ) : null}
        {id === 'pixel' ? (
          <View style={[styles.pixel, { backgroundColor: colors.skin.screen }]}>
            <View style={styles.pixelBars}>
              {[15, 26, 18, 32, 22, 36, 20].map((h, i) => (
                <View
                  key={i}
                  style={{
                    width: 8,
                    height: h,
                    backgroundColor: i % 2 ? colors.skin.s1 : colors.skin.s2,
                  }}
                />
              ))}
            </View>
            <View
              style={[styles.pixelHead, { backgroundColor: colors.skin.s2 }]}
            />
            <View
              style={[styles.pixelBody, { backgroundColor: colors.skin.ink }]}
            />
            <View
              style={[styles.pixelGround, { backgroundColor: colors.skin.s1 }]}
            />
          </View>
        ) : null}
        {id === 'acuarela' ? (
          <View style={[styles.water, { backgroundColor: colors.skin.paper2 }]}>
            {(colors.skin.blobs ?? '#d4b7d9,#e5a89b,#a7c8ae')
              .split(',')
              .slice(0, 3)
              .map((color, i) => (
                <View
                  key={color}
                  style={[
                    styles.blob,
                    {
                      backgroundColor: color,
                      left: 32 + i * 46,
                      top: i === 1 ? 12 : 32,
                      opacity: 0.78,
                      transform: [{ scale: i === 1 ? 0.84 : 1 }],
                    },
                  ]}
                />
              ))}
            <View
              style={[styles.brushLine, { backgroundColor: colors.accent }]}
            />
          </View>
        ) : null}
        {id === 'neonbar' ? (
          <View
            style={[
              styles.neon,
              {
                backgroundColor: colors.skin.wall,
                borderColor: colors.skin.tubeB,
              },
            ]}
          >
            <Text
              style={[
                type.title,
                {
                  color: colors.skin.tubeA,
                  textShadowColor: colors.skin.tubeA,
                  textShadowRadius: 8,
                },
              ]}
            >
              MI MÚSICA
            </Text>
            <Text style={[type.caption, { color: colors.skin.tubeB }]}>
              EN VIVO
            </Text>
          </View>
        ) : null}
        {id in motifs ? (
          <View
            style={[
              styles.motif,
              { backgroundColor: colors.skin.panel ?? colors.surfaceHigh },
            ]}
          >
            <View
              style={[
                styles.motifGlow,
                { backgroundColor: colors.skin.accent ?? colors.accent },
              ]}
            />
            <Text
              style={[
                type.display,
                styles.motifMark,
                { color: colors.skin.accent ?? colors.accent },
              ]}
            >
              {motifs[id]}
            </Text>
            <View
              style={[
                styles.motifLine,
                { backgroundColor: colors.skin.line ?? colors.outline },
              ]}
            />
          </View>
        ) : null}
      </View>
      <Text
        style={[type.label, styles.caption, { color: colors.textSecondary }]}
      >
        {copy[id]}
      </Text>
    </View>
  );
}

const useStyles = createStyles(colors => ({
  wrap: { marginHorizontal: spacing.lg, marginBottom: spacing.sm },
  hero: {
    alignItems: 'center',
    borderRadius: 20,
    height: 116,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  caption: { paddingTop: spacing.xs, textAlign: 'center' },
  tank: { borderRadius: 56, height: 92, overflow: 'hidden', width: 170 },
  wave: {
    bottom: 0,
    height: 38,
    left: 0,
    opacity: 0.75,
    position: 'absolute',
    right: 0,
  },
  waveBack: {
    bottom: 16,
    borderTopLeftRadius: 70,
    borderTopRightRadius: 70,
    height: 35,
    opacity: 0.65,
  },
  fish: { borderRadius: 8, height: 16, position: 'absolute', width: 24 },
  seaweed: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
    bottom: 8,
    height: 48,
    position: 'absolute',
    width: 8,
  },
  radio: { borderRadius: 10, height: 88, padding: 8, width: 168 },
  radioDial: {
    alignItems: 'center',
    borderRadius: 8,
    height: 32,
    justifyContent: 'center',
  },
  radioLine: { height: 3, width: '75%' },
  radioGrille: { borderRadius: 4, flex: 1, marginTop: 6 },
  radioKnobs: {
    flexDirection: 'row',
    gap: 8,
    justifyContent: 'flex-end',
    marginTop: 5,
    position: 'absolute',
    right: 15,
    top: 12,
  },
  knob: { borderRadius: 6, height: 12, width: 12 },
  pixel: {
    alignItems: 'center',
    borderColor: '#ffffff',
    borderWidth: 4,
    height: 88,
    justifyContent: 'flex-end',
    overflow: 'hidden',
    width: 160,
  },
  pixelBars: {
    alignItems: 'flex-end',
    bottom: 12,
    flexDirection: 'row',
    gap: 5,
    position: 'absolute',
  },
  pixelHead: { height: 24, width: 24 },
  pixelBody: { height: 20, marginTop: 3, width: 34 },
  pixelGround: { height: 8, marginTop: 4, width: '100%' },
  water: { borderRadius: 14, height: 90, overflow: 'hidden', width: 170 },
  blob: { borderRadius: 32, height: 56, position: 'absolute', width: 56 },
  brushLine: {
    borderRadius: 4,
    bottom: 15,
    height: 5,
    left: 30,
    position: 'absolute',
    right: 30,
    transform: [{ rotate: '-4deg' }],
  },
  neon: {
    alignItems: 'center',
    borderRadius: 12,
    borderWidth: 3,
    justifyContent: 'center',
    height: 82,
    width: 180,
  },
  motif: {
    alignItems: 'center',
    borderColor: colors.outline,
    borderRadius: 18,
    borderWidth: colors.design.line || 1,
    height: 90,
    justifyContent: 'center',
    overflow: 'hidden',
    width: 170,
  },
  motifGlow: {
    borderRadius: 80,
    height: 90,
    opacity: 0.15,
    position: 'absolute',
    width: 90,
  },
  motifMark: { fontSize: 42, lineHeight: 54 },
  motifLine: {
    bottom: 12,
    height: 3,
    position: 'absolute',
    width: '66%',
  },
}));
