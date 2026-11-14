import type { PlayerStyle, ThemeDesign } from './types';

/** Corner radii of the default design; themes may bring their own. */
export const baseRadius = { sm: 6, md: 10, lg: 16, sheet: 20, full: 999 };

/** The same face for headings and another for body text. */
const fontSet = (display: string, body = display) => ({
  display,
  headline: display,
  title: body,
  body,
  bodyStrong: body,
  secondary: body,
  label: body,
  caption: body,
});

/** A theme design with one display font and one body font; options override the rest. */
export const themedDesign = (
  player: PlayerStyle,
  display: string,
  body: string,
  options: Partial<ThemeDesign> = {},
): ThemeDesign => ({
  player,
  fonts: fontSet(display, body),
  scale: {},
  upper: [],
  radius: baseRadius,
  line: 0,
  home: 'tiles',
  tabs: 'pill',
  mini: 'card',
  ...options,
});
