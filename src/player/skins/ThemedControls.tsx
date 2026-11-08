import { useState } from 'react';
import {
  Pressable,
  Text,
  View,
  type StyleProp,
  type TextStyle,
  type ViewStyle,
} from 'react-native';
import Svg, { Path, Rect } from 'react-native-svg';
import type { Palette } from '../../theme/themes';
import type { IllustratedKind } from './IllustratedPlayer';

type Shape =
  | 'circle'
  | 'rounded'
  | 'square'
  | 'diamond'
  | 'cut'
  | 'blob'
  | 'arch';

/** How one control looks: a plate, its ink and an optional shadow. */
export type Plate = {
  shape: Shape;
  radius?: number;
  bg: string;
  fg: string;
  border?: string;
  borderWidth?: number;
  borderStyle?: 'solid' | 'dashed';
  /** CSS box-shadow, for hard offsets or neon glows. */
  shadow?: string;
  glossy?: boolean;
};

export type Look = {
  button: Plate;
  play: Plate & {
    width: number;
    height: number;
    text?: [string, string];
    font?: string;
  };
  tool: Plate & {
    active: Plate;
    link?: boolean;
    upper?: boolean;
    font?: string;
  };
  seek: {
    kind: 'bar' | 'xp' | 'brush';
    height: number;
    track: string;
    fill: string;
    thumb:
      | 'dot'
      | 'ring'
      | 'needle'
      | 'star'
      | 'leaf'
      | 'diamond'
      | 'square'
      | 'none';
    thumbColor: string;
    ring?: string;
    glow?: string;
  };
  icons: 'line' | 'pixel';
  /** Radio dials turn instead of showing arrows. */
  knobs?: boolean;
  headerFont?: string;
  upper?: boolean;
  /** Color of the page behind cut corners. */
  page: string;
};

const pick = (value: string | undefined, fallback: string) => value ?? fallback;

/** The controls of each illustrated theme, taken from its prototype. */
export function lookFor(kind: IllustratedKind, colors: Palette): Look {
  const s = colors.skin;
  const c = colors;
  const fonts = c.design.fonts;
  const accent = pick(s.accent, c.accent);
  const onAccent = pick(s.onAccent, c.onAccent);
  const ink = pick(s.ink, c.text);
  const bg = pick(s.bg, c.background);
  const panel = pick(s.panel, c.surface);
  const line = pick(s.line, c.outline);
  const page = c.background;
  const outline = (shape: Shape, radius: number, width = 2): Plate => ({
    shape,
    radius,
    bg: panel,
    fg: ink,
    border: line,
    borderWidth: width,
  });
  const chip = (
    plate: Plate,
    extra: Partial<Look['tool']> = {},
  ): Look['tool'] => ({
    ...plate,
    active: { ...plate, bg: accent, fg: onAccent, border: accent },
    ...extra,
  });
  const bar = (
    height: number,
    thumb: Look['seek']['thumb'] = 'dot',
  ): Look['seek'] => ({
    kind: 'bar',
    height,
    track: line,
    fill: accent,
    thumb,
    thumbColor: accent,
  });
  switch (kind) {
    case 'acuario': {
      const glass = pick(s.glass, c.surfaceHigh);
      const button: Plate = { shape: 'circle', bg: glass, fg: ink };
      return {
        page,
        icons: 'line',
        button,
        play: {
          shape: 'circle',
          bg: accent,
          fg: onAccent,
          width: 88,
          height: 88,
        },
        tool: chip({ shape: 'rounded', radius: 24, bg: glass, fg: ink }),
        seek: {
          kind: 'bar',
          height: 12,
          track: glass,
          fill: pick(s.water, accent),
          thumb: 'ring',
          thumbColor: bg,
          ring: accent,
        },
      };
    }
    case 'radio': {
      const dark = pick(s.cabinetDark, c.outline);
      return {
        page,
        icons: 'line',
        knobs: true,
        button: {
          shape: 'circle',
          bg: pick(s.knob, c.surfaceHigh),
          fg: pick(s.knobInk, ink),
          shadow: `0 4px 0 ${dark}`,
        },
        play: {
          shape: 'rounded',
          radius: 14,
          bg: accent,
          fg: onAccent,
          width: 150,
          height: 64,
          text: ['Pausa', 'Encender'],
          shadow: `0 5px 0 ${dark}`,
          font: fonts.bodyStrong,
        },
        tool: {
          shape: 'rounded',
          radius: 10,
          bg: 'transparent',
          fg: ink,
          border: ink,
          borderWidth: 2,
          active: {
            shape: 'rounded',
            radius: 10,
            bg: ink,
            fg: bg,
            border: ink,
            borderWidth: 2,
          },
        },
        seek: {
          kind: 'bar',
          height: 4,
          track: pick(s.grilleLine, line),
          fill: ink,
          thumb: 'needle',
          thumbColor: pick(s.needle, accent),
        },
      };
    }
    case 'pixel': {
      const text = pick(s.text, c.text);
      const hard = `5px 5px 0 ${pick(s.s2, c.outline)}`;
      const square: Plate = {
        shape: 'square',
        bg: 'transparent',
        fg: text,
        border: text,
        borderWidth: 4,
        shadow: hard,
      };
      return {
        page,
        icons: 'pixel',
        button: square,
        play: {
          shape: 'square',
          bg: accent,
          fg: onAccent,
          width: 150,
          height: 72,
          text: ['PAUSA', 'JUGAR'],
          shadow: hard,
          font: fonts.display,
        },
        tool: {
          ...square,
          shadow: undefined,
          active: {
            ...square,
            shadow: undefined,
            bg: text,
            fg: pick(s.bg, c.background),
          },
        },
        seek: {
          kind: 'xp',
          height: 24,
          track: 'transparent',
          fill: text,
          thumb: 'none',
          thumbColor: text,
          ring: text,
        },
        upper: true,
      };
    }
    case 'acuarela': {
      const thin: Plate = {
        shape: 'circle',
        bg: 'transparent',
        fg: ink,
        border: line,
        borderWidth: 1.5,
      };
      return {
        page,
        icons: 'line',
        button: thin,
        play: {
          shape: 'blob',
          bg: accent,
          fg: onAccent,
          width: 88,
          height: 88,
        },
        tool: {
          shape: 'rounded',
          radius: 0,
          bg: 'transparent',
          fg: ink,
          link: true,
          active: {
            shape: 'rounded',
            radius: 0,
            bg: 'transparent',
            fg: accent,
          },
        },
        seek: {
          kind: 'brush',
          height: 10,
          track: line,
          fill: accent,
          thumb: 'none',
          thumbColor: accent,
        },
      };
    }
    case 'neon': {
      const tubeA = pick(s.tubeA, accent);
      const tubeB = pick(s.tubeB, accent);
      const off = pick(s.off, c.outline);
      return {
        page,
        icons: 'line',
        button: {
          shape: 'circle',
          bg: 'transparent',
          fg: tubeB,
          border: tubeB,
          borderWidth: 2,
          shadow: `0 0 10px ${tubeB}`,
        },
        play: {
          shape: 'circle',
          bg: tubeA,
          fg: pick(s.onA, onAccent),
          width: 88,
          height: 88,
          shadow: `0 0 18px ${tubeA}`,
        },
        tool: {
          shape: 'rounded',
          radius: 23,
          bg: 'transparent',
          fg: ink,
          border: off,
          borderWidth: 2,
          active: {
            shape: 'rounded',
            radius: 23,
            bg: 'transparent',
            fg: tubeB,
            border: tubeB,
            borderWidth: 2,
            shadow: `0 0 10px ${tubeB}`,
          },
        },
        seek: {
          kind: 'bar',
          height: 4,
          track: off,
          fill: tubeA,
          thumb: 'dot',
          thumbColor: tubeA,
          glow: tubeA,
        },
      };
    }
    case 'constelacion': {
      const dim = pick(s.dim, line);
      const thin: Plate = {
        shape: 'circle',
        bg: 'transparent',
        fg: ink,
        border: dim,
        borderWidth: 1.5,
      };
      return {
        page,
        icons: 'line',
        button: thin,
        play: {
          shape: 'circle',
          bg: accent,
          fg: onAccent,
          width: 88,
          height: 88,
          shadow: `0 0 0 8px ${dim}`,
        },
        tool: chip({
          shape: 'rounded',
          radius: 23,
          bg: 'transparent',
          fg: ink,
          border: dim,
          borderWidth: 1.5,
        }),
        seek: {
          kind: 'bar',
          height: 2,
          track: dim,
          fill: accent,
          thumb: 'star',
          thumbColor: accent,
        },
      };
    }
    case 'jardin': {
      const sky = pick(s.sky, c.surfaceHigh);
      return {
        page,
        icons: 'line',
        button: { shape: 'rounded', radius: 20, bg: sky, fg: ink },
        play: {
          shape: 'rounded',
          radius: 30,
          bg: accent,
          fg: onAccent,
          width: 86,
          height: 86,
        },
        tool: chip({ shape: 'rounded', radius: 16, bg: sky, fg: ink }),
        seek: {
          kind: 'bar',
          height: 8,
          track: pick(s.ground, line),
          fill: pick(s.stem, accent),
          thumb: 'leaf',
          thumbColor: pick(s.leaf, accent),
          ring: pick(s.stem, accent),
        },
      };
    }
    case 'origami': {
      return {
        page,
        icons: 'line',
        button: {
          shape: 'diamond',
          bg: 'transparent',
          fg: ink,
          border: line,
          borderWidth: 1.5,
        },
        play: {
          shape: 'diamond',
          bg: accent,
          fg: onAccent,
          width: 72,
          height: 72,
        },
        tool: {
          shape: 'square',
          bg: 'transparent',
          fg: ink,
          border: line,
          borderWidth: 1.5,
          active: {
            shape: 'square',
            bg: ink,
            fg: bg,
            border: ink,
            borderWidth: 1.5,
          },
        },
        seek: {
          kind: 'bar',
          height: 2,
          track: line,
          fill: ink,
          thumb: 'diamond',
          thumbColor: accent,
        },
      };
    }
    case 'cyberpunk':
      return {
        page,
        icons: 'line',
        upper: true,
        button: outline('cut', 0),
        play: {
          shape: 'cut',
          bg: accent,
          fg: onAccent,
          width: 88,
          height: 88,
          shadow: `0 0 16px ${accent}`,
        },
        tool: chip(outline('cut', 0), { upper: true }),
        seek: { ...bar(6, 'square'), glow: accent },
      };
    case 'vaporwave':
      return {
        page,
        icons: 'line',
        upper: true,
        button: outline('rounded', 6),
        play: {
          shape: 'rounded',
          radius: 6,
          bg: accent,
          fg: onAccent,
          width: 88,
          height: 88,
          glossy: true,
          shadow: `4px 4px 0 ${pick(s.grid, line)}`,
        },
        tool: chip(outline('rounded', 6), { upper: true }),
        seek: bar(6, 'square'),
      };
    case 'manga': {
      const hard = `4px 4px 0 ${ink}`;
      const plate: Plate = {
        shape: 'square',
        bg: panel,
        fg: ink,
        border: ink,
        borderWidth: 3,
        shadow: hard,
      };
      return {
        page,
        icons: 'line',
        button: plate,
        play: {
          shape: 'square',
          bg: accent,
          fg: onAccent,
          width: 88,
          height: 88,
          border: ink,
          borderWidth: 3,
          shadow: hard,
        },
        tool: { ...plate, active: { ...plate, bg: accent, fg: onAccent } },
        seek: {
          kind: 'bar',
          height: 10,
          track: panel,
          fill: ink,
          thumb: 'square',
          thumbColor: accent,
          ring: ink,
        },
        headerFont: fonts.display,
      };
    }
    case 'steampunk': {
      const metal = pick(s.metal, line);
      const dark = pick(s.metalDark, line);
      return {
        page,
        icons: 'line',
        button: {
          shape: 'circle',
          bg: metal,
          fg: pick(s.dialInk, ink),
          border: dark,
          borderWidth: 3,
        },
        play: {
          shape: 'circle',
          bg: accent,
          fg: onAccent,
          width: 88,
          height: 88,
          border: dark,
          borderWidth: 4,
        },
        tool: chip({
          shape: 'rounded',
          radius: 10,
          bg: panel,
          fg: ink,
          border: metal,
          borderWidth: 2,
        }),
        seek: {
          kind: 'bar',
          height: 6,
          track: dark,
          fill: metal,
          thumb: 'ring',
          thumbColor: accent,
          ring: dark,
        },
      };
    }
    case 'naveespacial':
      return {
        page,
        icons: 'line',
        upper: true,
        button: outline('rounded', 14, 1.5),
        play: {
          shape: 'circle',
          bg: accent,
          fg: onAccent,
          width: 88,
          height: 88,
          shadow: `0 0 20px ${accent}`,
        },
        tool: chip(outline('rounded', 14, 1.5), { upper: true }),
        seek: { ...bar(4, 'dot'), glow: accent },
      };
    case 'y2k': {
      const plate: Plate = { ...outline('circle', 0), glossy: true };
      return {
        page,
        icons: 'line',
        button: plate,
        play: {
          shape: 'circle',
          bg: accent,
          fg: onAccent,
          width: 88,
          height: 88,
          glossy: true,
          border: line,
          borderWidth: 2,
        },
        tool: chip({ ...outline('rounded', 23), glossy: true }),
        seek: bar(8, 'ring'),
      };
    }
    case 'western':
      return {
        page,
        icons: 'line',
        button: outline('rounded', 4),
        play: {
          shape: 'circle',
          bg: accent,
          fg: onAccent,
          width: 88,
          height: 88,
          border: pick(s.posterInk, ink),
          borderWidth: 3,
        },
        tool: chip({ ...outline('rounded', 4), borderStyle: 'dashed' }),
        seek: bar(6, 'star'),
      };
    case 'fantasiamedieval':
      return {
        page,
        icons: 'line',
        button: outline('arch', 24),
        play: {
          shape: 'circle',
          bg: accent,
          fg: onAccent,
          width: 88,
          height: 88,
          shadow: `0 0 18px ${pick(s.spark, accent)}`,
        },
        tool: chip(outline('arch', 20)),
        seek: bar(6, 'diamond'),
      };
    case 'lofi':
      return {
        page,
        icons: 'line',
        button: { shape: 'rounded', radius: 18, bg: panel, fg: ink },
        play: {
          shape: 'rounded',
          radius: 28,
          bg: accent,
          fg: onAccent,
          width: 86,
          height: 86,
        },
        tool: chip({ shape: 'rounded', radius: 18, bg: panel, fg: ink }),
        seek: bar(6, 'dot'),
      };
    case 'terrorgotico':
      return {
        page,
        icons: 'line',
        button: outline('arch', 24),
        play: {
          shape: 'arch',
          radius: 44,
          bg: accent,
          fg: onAccent,
          width: 80,
          height: 92,
          border: line,
          borderWidth: 2,
        },
        tool: chip(outline('arch', 20)),
        seek: bar(4, 'diamond'),
        headerFont: fonts.display,
      };
    case 'playa':
    default:
      return {
        page,
        icons: 'line',
        button: outline('circle', 0),
        play: {
          shape: 'circle',
          bg: accent,
          fg: onAccent,
          width: 88,
          height: 88,
        },
        tool: chip(outline('rounded', 22)),
        seek: bar(8, 'ring'),
      };
  }
}

/* ───────────── drawing ───────────── */

type Mutable<T> = { -readonly [K in keyof T]: T[K] };

function plateStyle(plate: Plate, width?: number, height?: number): ViewStyle {
  const radius =
    plate.shape === 'circle'
      ? 999
      : plate.shape === 'blob'
      ? undefined
      : plate.shape === 'square' ||
        plate.shape === 'cut' ||
        plate.shape === 'diamond'
      ? 0
      : plate.radius ?? 12;
  const style: Mutable<ViewStyle> & { boxShadow?: string } = {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: plate.bg,
    borderColor: plate.border,
    borderWidth: plate.border ? plate.borderWidth ?? 2 : 0,
    borderStyle: plate.borderStyle,
    borderRadius: radius,
    overflow: 'visible',
    width,
    height,
  };
  if (plate.shape === 'blob') {
    style.borderTopLeftRadius = 44;
    style.borderTopRightRadius = 40;
    style.borderBottomLeftRadius = 38;
    style.borderBottomRightRadius = 46;
  }
  if (plate.shape === 'arch' && height) {
    const r = Math.min(plate.radius ?? 24, (width ?? height) / 2);
    style.borderRadius = 6;
    style.borderTopLeftRadius = r;
    style.borderTopRightRadius = r;
  }
  if (plate.shape === 'arch' && !height) {
    style.borderRadius = 6;
    style.borderTopLeftRadius = plate.radius ?? 20;
    style.borderTopRightRadius = plate.radius ?? 20;
  }
  if (plate.shape === 'diamond') style.transform = [{ rotate: '45deg' }];
  if (plate.shadow) style.boxShadow = plate.shadow;
  return style;
}

/** Two small triangles in the page color cut the corners of a plate. */
function CutCorners({ page }: { page: string }) {
  return (
    <>
      <Svg
        height={12}
        pointerEvents="none"
        style={cutStyles.topRight}
        viewBox="0 0 12 12"
        width={12}
      >
        <Path d="M0 0 H12 V12 Z" fill={page} />
      </Svg>
      <Svg
        height={12}
        pointerEvents="none"
        style={cutStyles.bottomLeft}
        viewBox="0 0 12 12"
        width={12}
      >
        <Path d="M0 0 L12 12 H0 Z" fill={page} />
      </Svg>
    </>
  );
}

const cutStyles = {
  topRight: { position: 'absolute' as const, right: -2, top: -2 },
  bottomLeft: { position: 'absolute' as const, left: -2, bottom: -2 },
  gloss: {
    position: 'absolute' as const,
    left: '12%' as const,
    right: '12%' as const,
    top: 4,
    height: '38%' as const,
    borderRadius: 999,
    backgroundColor: 'rgba(255,255,255,0.45)',
  },
};

function Decorations({ plate, page }: { plate: Plate; page: string }) {
  return (
    <>
      {plate.glossy ? (
        <View pointerEvents="none" style={cutStyles.gloss} />
      ) : null}
      {plate.shape === 'cut' ? <CutCorners page={page} /> : null}
    </>
  );
}

/* ───────────── icons ───────────── */

export type IconName =
  | 'close'
  | 'heart'
  | 'heartOff'
  | 'prev'
  | 'next'
  | 'play'
  | 'pause';

const LINE_ICONS: Record<IconName, string> = {
  close: 'm6 9 6 6 6-6',
  heart:
    'M12 20s-7-4.4-8.8-8.8C2 8 4 4.8 7.3 4.8c1.9 0 3.4 1 4.7 2.7 1.3-1.7 2.8-2.7 4.7-2.7C20 4.8 22 8 20.8 11.2 19 15.6 12 20 12 20z',
  heartOff:
    'M12 20s-7-4.4-8.8-8.8C2 8 4 4.8 7.3 4.8c1.9 0 3.4 1 4.7 2.7 1.3-1.7 2.8-2.7 4.7-2.7C20 4.8 22 8 20.8 11.2 19 15.6 12 20 12 20z',
  prev: 'M5 4h2.5v16H5zM20 4 9 12l11 8z',
  next: 'M16.5 4H19v16h-2.5zM4 4l11 8-11 8z',
  play: 'M8 4.5v15L20 12z',
  pause: 'M6 4h4v16H6zM14 4h4v16h-4z',
};

const PIXEL_ICONS: Record<IconName, string> = {
  close: 'M1 2h2v1H1zM2 3h2v1H2zM3 4h2v1H3zM4 3h2v1H4zM5 2h2v1H5z',
  heart: 'M1 1h2v1h2V1h2v1h1v2H7v1H6v1H5v1H3V6H2V5H1V4H0V2h1z',
  heartOff:
    'M1 1h2v1H1zM5 1h2v1H5zM0 2h1v2H0zM7 2h1v2H7zM1 4h1v1H1zM6 4h1v1H6zM2 5h1v1H2zM5 5h1v1H5zM3 6h2v1H3zM3 2h2v1H3z',
  prev: 'M1 1h1v6H1zM7 1v6H6V6H5V5H4V3h1V2h1V1z',
  next: 'M6 1h1v6H6zM1 1h1v1h1v1h1v2H3v1H2v1H1z',
  play: 'M2 1h1v1h1v1h1v1h1v1H5v1H4v1H3v1H2z',
  pause: 'M1 1h2v6H1zM5 1h2v6H5z',
};

export function Icon({
  look,
  name,
  color,
  size,
}: {
  look: Look;
  name: IconName;
  color: string;
  size: number;
}) {
  if (look.icons === 'pixel') {
    return (
      <Svg height={size} viewBox="0 0 8 8" width={size}>
        <Path d={PIXEL_ICONS[name]} fill={color} />
      </Svg>
    );
  }
  const stroke = name === 'close' || name === 'heartOff';
  return (
    <Svg height={size} viewBox="0 0 24 24" width={size}>
      <Path
        d={LINE_ICONS[name]}
        fill={stroke ? 'none' : color}
        stroke={stroke ? color : 'none'}
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeWidth={2.2}
      />
    </Svg>
  );
}

/* ───────────── controls ───────────── */

export function ThemedButton({
  look,
  label,
  icon,
  onPress,
  disabled,
  size = 60,
  active,
}: {
  look: Look;
  label: string;
  icon: IconName;
  onPress: () => void;
  disabled?: boolean;
  size?: number;
  active?: boolean;
}) {
  const plate = active
    ? { ...look.button, bg: look.tool.active.bg, fg: look.tool.active.fg }
    : look.button;
  const [turn, setTurn] = useState(0);
  const diamond = plate.shape === 'diamond';
  const box = diamond ? Math.round(size * 0.74) : size;
  const iconSize = Math.round(size * (look.knobs ? 0.3 : 0.42));
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ disabled, selected: active }}
      disabled={disabled}
      hitSlop={diamond ? 8 : 0}
      onPress={() => {
        if (look.knobs) setTurn(value => value + (icon === 'prev' ? -40 : 40));
        onPress();
      }}
      style={({ pressed }) => [
        plateStyle(plate, box, box),
        { opacity: disabled ? 0.4 : pressed ? 0.75 : 1 },
      ]}
    >
      {look.knobs && (icon === 'prev' || icon === 'next') ? (
        <View
          style={[knobStyles.dial, { transform: [{ rotate: `${turn}deg` }] }]}
        >
          <View style={[knobStyles.mark, { backgroundColor: plate.fg }]} />
        </View>
      ) : (
        <View style={diamond ? knobStyles.unrotate : undefined}>
          <Icon color={plate.fg} look={look} name={icon} size={iconSize} />
        </View>
      )}
      <Decorations page={look.page} plate={plate} />
    </Pressable>
  );
}

const knobStyles = {
  dial: {
    position: 'absolute' as const,
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center' as const,
  },
  mark: { width: 4, height: 22, marginTop: 6, borderRadius: 2 },
  unrotate: { transform: [{ rotate: '-45deg' }] },
};

export function ThemedPlay({
  look,
  isPlaying,
  disabled,
  onPress,
}: {
  look: Look;
  isPlaying: boolean;
  disabled?: boolean;
  onPress: () => void;
}) {
  const p = look.play;
  const [pressed, setPressed] = useState(false);
  const hardShadow = p.shadow && !p.shadow.startsWith('0 0 ');
  const plate = { ...p, shadow: pressed && hardShadow ? undefined : p.shadow };
  const offset = pressed && hardShadow ? 4 : 0;
  return (
    <Pressable
      accessibilityLabel={isPlaying ? 'Pausar' : 'Reproducir'}
      accessibilityRole="button"
      disabled={disabled}
      onPress={onPress}
      onPressIn={() => setPressed(true)}
      onPressOut={() => setPressed(false)}
      style={[
        plateStyle(plate, p.width, p.height),
        {
          transform: [
            ...(p.shape === 'diamond' ? [{ rotate: '45deg' }] : []),
            { translateX: offset },
            { translateY: offset },
          ],
          opacity: disabled ? 0.5 : 1,
        },
      ]}
    >
      <View style={p.shape === 'diamond' ? knobStyles.unrotate : undefined}>
        {p.text ? (
          <Text
            style={[
              playStyles.text,
              {
                color: p.fg,
                fontFamily: p.font,
                fontSize: look.icons === 'pixel' ? 14 : 18,
              },
            ]}
          >
            {isPlaying ? p.text[0] : p.text[1]}
          </Text>
        ) : (
          <Icon
            color={p.fg}
            look={look}
            name={isPlaying ? 'pause' : 'play'}
            size={34}
          />
        )}
      </View>
      <Decorations page={look.page} plate={p} />
    </Pressable>
  );
}

const playStyles = {
  text: { letterSpacing: 2, textTransform: 'uppercase' as const },
};

export function ThemedTool({
  look,
  label,
  caption,
  active,
  onPress,
  textStyle,
}: {
  look: Look;
  label: string;
  caption: string;
  active: boolean;
  onPress: () => void;
  textStyle?: StyleProp<TextStyle>;
}) {
  const t = look.tool;
  const plate = active ? t.active : t;
  return (
    <Pressable
      accessibilityLabel={label}
      accessibilityRole="button"
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [
        plateStyle({
          ...plate,
          shape: plate.shape === 'diamond' ? 'square' : plate.shape,
        }),
        toolStyles.tool,
        { opacity: pressed ? 0.75 : 1 },
      ]}
    >
      <Text
        numberOfLines={1}
        style={[
          textStyle,
          toolStyles.text,
          {
            color: plate.fg,
            fontFamily:
              t.font ?? (textStyle as TextStyle | undefined)?.fontFamily,
            textTransform: t.upper || look.upper ? 'uppercase' : 'none',
            textDecorationLine: t.link && active ? 'underline' : 'none',
            fontSize: look.icons === 'pixel' ? 18 : 13,
          },
        ]}
      >
        {caption}
      </Text>
      <Decorations page={look.page} plate={plate} />
    </Pressable>
  );
}

const toolStyles = {
  tool: {
    height: 48,
    flexBasis: '22%' as const,
    flexGrow: 1,
    paddingHorizontal: 6,
  },
  text: { letterSpacing: 0.5 },
};

const STAR =
  'M12 0 C 13 9 15 11 24 12 C 15 13 13 15 12 24 C 11 15 9 13 0 12 C 9 11 11 9 12 0 Z';
const LEAF = 'M12 22 C 4 16 4 6 12 2 C 20 6 20 16 12 22 Z';

/** The seek bar's look; `SeekArea` around it handles touches. */
export function ThemedSeek({
  look,
  progress,
}: {
  look: Look;
  progress: number;
}) {
  const s = look.seek;
  const pct = `${Math.max(0, Math.min(1, progress)) * 100}%` as const;
  if (s.kind === 'xp') {
    const filled = Math.round(progress * 20);
    return (
      <View style={[seekStyles.xp, { borderColor: s.ring ?? s.fill }]}>
        {Array.from({ length: 20 }, (_, i) => (
          <View
            key={i}
            style={[
              seekStyles.xpCell,
              { backgroundColor: i < filled ? s.fill : 'transparent' },
            ]}
          />
        ))}
      </View>
    );
  }
  if (s.kind === 'brush') {
    return <Brush color={s.fill} progress={progress} track={s.track} />;
  }
  const glow = s.glow
    ? ({ boxShadow: `0 0 8px ${s.glow}` } as ViewStyle)
    : undefined;
  return (
    <View
      style={[
        seekStyles.track,
        {
          height: s.height,
          backgroundColor: s.track,
          borderRadius: s.height / 2,
        },
      ]}
    >
      <View
        style={[
          seekStyles.fill,
          { width: pct, backgroundColor: s.fill, borderRadius: s.height / 2 },
          glow,
        ]}
      />
      <Thumb look={look} pct={pct} />
    </View>
  );
}

function Thumb({ look, pct }: { look: Look; pct: `${number}%` }) {
  const s = look.seek;
  const base: ViewStyle = { position: 'absolute', left: pct, top: '50%' };
  switch (s.thumb) {
    case 'none':
      return null;
    case 'ring':
      return (
        <View
          style={[
            base,
            seekStyles.ring,
            { backgroundColor: s.thumbColor, borderColor: s.ring ?? s.fill },
          ]}
        />
      );
    case 'needle':
      return (
        <View
          style={[base, seekStyles.needle, { backgroundColor: s.thumbColor }]}
        />
      );
    case 'square':
      return (
        <View
          style={[
            base,
            seekStyles.square,
            {
              backgroundColor: s.thumbColor,
              borderColor: s.ring,
              borderWidth: s.ring ? 2 : 0,
            },
          ]}
        />
      );
    case 'diamond':
      return (
        <View
          style={[
            base,
            seekStyles.square,
            { backgroundColor: s.thumbColor, transform: [{ rotate: '45deg' }] },
          ]}
        />
      );
    case 'star':
    case 'leaf':
      return (
        <View style={[base, seekStyles.glyph]}>
          <Svg height={24} viewBox="0 0 24 24" width={24}>
            <Path d={s.thumb === 'star' ? STAR : LEAF} fill={s.thumbColor} />
            {s.thumb === 'leaf' ? (
              <Path
                d="M12 21 V 5"
                stroke={s.ring ?? s.thumbColor}
                strokeWidth={1.6}
              />
            ) : null}
          </Svg>
        </View>
      );
    default:
      return (
        <View
          style={[
            base,
            seekStyles.dot,
            { backgroundColor: s.thumbColor },
            s.glow ? ({ boxShadow: `0 0 10px ${s.glow}` } as ViewStyle) : null,
          ]}
        />
      );
  }
}

function Brush({
  progress,
  color,
  track,
}: {
  progress: number;
  color: string;
  track: string;
}) {
  const d = 'M8 22 C 60 12, 110 30, 175 20 S 290 14, 342 22';
  return (
    <Svg
      height={40}
      preserveAspectRatio="none"
      viewBox="0 0 350 40"
      width="100%"
    >
      <Path
        d={d}
        fill="none"
        stroke={track}
        strokeLinecap="round"
        strokeWidth={5}
      />
      <Path
        d={d}
        fill="none"
        opacity={0.85}
        stroke={color}
        strokeDasharray={`${Math.max(0.01, progress) * 340} 400`}
        strokeLinecap="round"
        strokeWidth={10}
      />
      <Rect fill="transparent" height={40} width={350} />
    </Svg>
  );
}

const seekStyles = {
  track: { width: '100%' as const, position: 'relative' as const },
  fill: { position: 'absolute' as const, left: 0, top: 0, bottom: 0 },
  dot: {
    width: 18,
    height: 18,
    borderRadius: 9,
    marginLeft: -9,
    marginTop: -9,
  },
  ring: {
    width: 26,
    height: 26,
    borderRadius: 13,
    borderWidth: 3,
    marginLeft: -13,
    marginTop: -13,
  },
  needle: {
    width: 12,
    height: 28,
    borderRadius: 4,
    marginLeft: -6,
    marginTop: -14,
  },
  square: { width: 16, height: 16, marginLeft: -8, marginTop: -8 },
  glyph: { width: 24, height: 24, marginLeft: -12, marginTop: -12 },
  xp: {
    width: '100%' as const,
    height: 24,
    borderWidth: 4,
    padding: 2,
    flexDirection: 'row' as const,
    gap: 2,
  },
  xpCell: { flex: 1 },
};
