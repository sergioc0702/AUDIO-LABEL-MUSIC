import { useEffect, useState } from 'react';
import { AccessibilityInfo } from 'react-native';

/** Follows Android's "Remove animations" accessibility setting. */
export function useReducedMotion(): boolean {
  const [reducedMotion, setReducedMotion] = useState(false);

  useEffect(() => {
    let mounted = true;
    AccessibilityInfo.isReduceMotionEnabled()
      .then(enabled => {
        if (mounted) {
          setReducedMotion(enabled);
        }
      })
      .catch(() => undefined);
    const subscription = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setReducedMotion,
    );
    return () => {
      mounted = false;
      subscription?.remove();
    };
  }, []);

  return reducedMotion;
}
