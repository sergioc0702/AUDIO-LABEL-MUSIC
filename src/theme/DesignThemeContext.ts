import { createContext, useContext } from 'react';
import { defaultDesignTokens, type AppDesignTokens } from './tokens';

export const DesignThemeContext =
  createContext<AppDesignTokens>(defaultDesignTokens);

export function useDesignTokens(): AppDesignTokens {
  return useContext(DesignThemeContext);
}
