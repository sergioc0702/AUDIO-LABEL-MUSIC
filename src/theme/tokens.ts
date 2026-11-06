export type AppColorRole =
  | 'background'
  | 'surface'
  | 'surfaceRaised'
  | 'text'
  | 'muted'
  | 'accent'
  | 'accentSoft'
  | 'onAccent'
  | 'border'
  | 'danger'
  | 'errorSurface'
  | 'ripple';

export type AppDesignTokens = {
  colors: Record<AppColorRole, string>;
  typography: Record<'displayFamily' | 'bodyFamily', string>;
  spacing: Record<'xs' | 'sm' | 'md' | 'lg' | 'xl', number>;
  radius: Record<'sm' | 'md' | 'lg' | 'pill', number>;
  motion: Record<'quick' | 'standard', number>;
};

const sharedTokens = {
  typography: {
    displayFamily: 'sans-serif',
    bodyFamily: 'sans-serif',
  },
  spacing: {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 24,
  },
  radius: {
    sm: 10,
    md: 16,
    lg: 22,
    pill: 999,
  },
  motion: {
    quick: 140,
    standard: 200,
  },
};

export const defaultDesignTokens: AppDesignTokens = {
  ...sharedTokens,
  colors: {
    background: '#f6f7fb',
    surface: '#ffffff',
    surfaceRaised: '#eef0f6',
    text: '#171925',
    muted: '#696e7f',
    accent: '#6848e8',
    accentSoft: '#eee9ff',
    onAccent: '#ffffff',
    border: '#e4e6ee',
    danger: '#b93848',
    errorSurface: '#fcebed',
    ripple: '#17192514',
  },
};

export const darkDesignTokens: AppDesignTokens = {
  ...sharedTokens,
  colors: {
    background: '#0f0e13',
    surface: '#1a1820',
    surfaceRaised: '#24212c',
    text: '#f5f2ee',
    muted: '#a7a1b2',
    accent: '#d6ff3d',
    accentSoft: '#30351f',
    onAccent: '#12130a',
    border: '#2e2a38',
    danger: '#ff9aa2',
    errorSurface: '#38232a',
    ripple: '#ffffff24',
  },
};
