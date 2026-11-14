import { useEffect } from 'react';
import { Pressable, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import { Home, Library, Search } from 'lucide-react-native';
import Svg, {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Stop,
} from 'react-native-svg';
import { useReducedMotion } from '../hooks/useReducedMotion';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useApp, type Tab } from '../state/AppContext';
import { spacing, createStyles, useColors, strongFont } from '../theme/theme';

// The bottom tab bar. Each theme picks one look with design.tabs; every look
// keeps the same three tabs and accessibility labels.
/** A small manga burst behind the selected tab of the Manga theme. */
const BURST = (() => {
  let d = '';
  for (let n = 0; n < 18; n += 1) {
    const a = (n / 18) * Math.PI * 2;
    const r = n % 2 ? 0.62 : 1;
    d += `${n ? ' L ' : 'M'}${(32 + Math.cos(a) * 31 * r).toFixed(1)} ${(
      17 +
      Math.sin(a) * 16 * r
    ).toFixed(1)}`;
  }
  return `${d} Z`;
})();

/** The blinking ▶ of a game menu, for the Pixel theme. */
function MenuCursor({ color }: { color: string }) {
  const reducedMotion = useReducedMotion();
  const blink = useSharedValue(1);
  useEffect(() => {
    if (reducedMotion) return;
    blink.value = withRepeat(
      withSequence(
        withDelay(500, withTiming(0, { duration: 0 })),
        withDelay(500, withTiming(1, { duration: 0 })),
      ),
      -1,
    );
    return () => cancelAnimation(blink);
  }, [blink, reducedMotion]);
  const style = useAnimatedStyle(() => ({ opacity: blink.value }));
  return (
    <Animated.View style={style}>
      <Svg height={10} width={8}>
        <Path d="M0 0h2v2h2v2h2v2h-2v2h-2v2h-2z" fill={color} />
      </Svg>
    </Animated.View>
  );
}

/** A sun that rises behind the selected tab of the Vaporwave theme. */
function TabSun({ top, bottom }: { top: string; bottom: string }) {
  const rise = useSharedValue(14);
  useEffect(() => {
    rise.value = withTiming(0, { duration: 450 });
  }, [rise]);
  const style = useAnimatedStyle(() => ({
    transform: [{ translateY: rise.value }],
  }));
  const styles = useStyles();
  return (
    <Animated.View pointerEvents="none" style={[styles.sun, style]}>
      <Svg height={36} width={36}>
        <Defs>
          <LinearGradient id="vw-tab-sun" x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0" stopColor={top} />
            <Stop offset="1" stopColor={bottom} />
          </LinearGradient>
        </Defs>
        <Circle cx={18} cy={18} fill="url(#vw-tab-sun)" r={18} />
      </Svg>
    </Animated.View>
  );
}

/** The faint neon floor under the Vaporwave tabs. */
const HORIZON_GRID = [
  'M0 22 H 360 M0 40 H 360 M0 62 H 360',
  ...[0, 90, 150, 210, 270, 360].map(x => `M180 0 L ${x} 66`),
  'M180 0 L 0 30 M180 0 L 360 30',
].join(' ');

const tabs: { id: Tab; label: string; icon: typeof Home }[] = [
  { id: 'home', label: 'Inicio', icon: Home },
  { id: 'search', label: 'Buscar', icon: Search },
  { id: 'library', label: 'Biblioteca', icon: Library },
];

export function TabBar() {
  const { colors, type } = useColors();
  const styles = useStyles();
  const { nav } = useApp();
  const insets = useSafeAreaInsets();
  const variant = colors.design.tabs;

  if (variant !== 'pill') {
    return (
      <View
        accessibilityRole="tablist"
        style={[
          styles.tabBar,
          variant === 'blocks' && styles.blockBar,
          variant === 'bubbles' && styles.bubbleBar,
          variant === 'hud' && styles.hudBar,
          variant === 'cursor' && styles.cursorBar,
          variant === 'horizon' && styles.horizonBar,
          variant === 'sparkle' && styles.sparkleBar,
          variant === 'neural' && styles.neuralBar,
          variant === 'flashlight' && styles.flashBar,
          variant === 'stack' && styles.stackBar,
          variant === 'ki' && styles.kiBar,
          { paddingBottom: insets.bottom },
        ]}
      >
        {variant === 'horizon' ? (
          <>
            <Svg
              height={66}
              pointerEvents="none"
              preserveAspectRatio="none"
              style={styles.horizonGrid}
              viewBox="0 0 360 66"
              width="100%"
            >
              <Path
                d={HORIZON_GRID}
                opacity={0.22}
                stroke={colors.skin.grid ?? colors.accent}
                strokeWidth={1}
              />
            </Svg>
            <View pointerEvents="none" style={styles.horizonLine} />
          </>
        ) : null}
        {tabs.map((tab, index) => {
          const selected = nav.tab === tab.id;
          const inverted = variant === 'blocks' && selected;
          const burst = variant === 'bubbles' && selected;
          const aimed = variant === 'hud' && selected;
          const boxed = variant === 'cursor' && selected;
          const sunlit = variant === 'horizon' && selected;
          const starred = variant === 'sparkle' && selected;
          const locked = variant === 'neural' && selected;
          const lit = variant === 'flashlight' && selected;
          const stacked = variant === 'stack' && selected;
          const charged = variant === 'ki' && selected;
          return (
            <Pressable
              key={tab.id}
              accessibilityRole="tab"
              accessibilityLabel={tab.label}
              accessibilityState={{ selected }}
              android_ripple={{ color: colors.ripple }}
              onPress={() => nav.selectTab(tab.id)}
              style={[
                styles.tab,
                variant === 'blocks' && styles.blockTab,
                variant === 'blocks' && index > 0 && styles.blockDivider,
                inverted && styles.blockSelected,
              ]}
            >
              {variant === 'brackets' ? null : (
                <View
                  style={
                    boxed
                      ? styles.cursorBox
                      : locked
                      ? styles.lockBox
                      : lit
                      ? styles.litBox
                      : stacked
                      ? styles.stackBox
                      : charged
                      ? styles.kiBox
                      : variant === 'horizon'
                      ? [styles.tabGlyph, styles.horizonGlyph]
                      : variant === 'bubbles' ||
                        variant === 'hud' ||
                        variant === 'sparkle'
                      ? styles.tabGlyph
                      : undefined
                  }
                >
                  {aimed
                    ? (['tl', 'tr', 'bl', 'br'] as const).map(corner => (
                        <View
                          key={corner}
                          style={[styles.hudCorner, styles[corner]]}
                        />
                      ))
                    : null}
                  {starred ? (
                    <Svg
                      height={14}
                      style={styles.tabStar}
                      viewBox="0 0 14 14"
                      width={14}
                    >
                      <Path
                        d="M7 0 Q 8.5 5.5 14 7 Q 8.5 8.5 7 14 Q 5.5 8.5 0 7 Q 5.5 5.5 7 0 Z"
                        fill={colors.accent}
                      />
                    </Svg>
                  ) : null}
                  {sunlit ? (
                    <TabSun
                      bottom={colors.skin.sun2 ?? colors.accent}
                      top={colors.skin.sun1 ?? colors.accent}
                    />
                  ) : null}
                  {burst ? (
                    <Svg height={34} style={styles.burst} width={64}>
                      <Path
                        d={BURST}
                        fill={colors.accent}
                        stroke={colors.text}
                        strokeLinejoin="round"
                        strokeWidth={2}
                      />
                    </Svg>
                  ) : null}
                  <tab.icon
                    color={
                      inverted || boxed
                        ? colors.background
                        : locked || stacked || charged
                        ? colors.onAccent
                        : burst || sunlit
                        ? colors.onAccent
                        : selected
                        ? colors.accent
                        : colors.textSecondary
                    }
                    size={22}
                  />
                </View>
              )}
              <View style={styles.tabLabelRow}>
                {boxed ? <MenuCursor color={colors.accent} /> : null}
                <Text
                  style={[
                    type.label,
                    { color: selected ? colors.text : colors.textSecondary },
                    variant === 'horizon' && styles.horizonLabel,
                    selected &&
                      variant === 'brackets' &&
                      styles.bracketSelected,
                    inverted && styles.blockLabelSelected,
                  ]}
                >
                  {variant === 'brackets' && selected
                    ? `[${tab.label}]`
                    : tab.label}
                </Text>
              </View>
              {variant === 'underline' ? (
                <View
                  style={[styles.underline, selected && styles.underlineOn]}
                />
              ) : null}
            </Pressable>
          );
        })}
      </View>
    );
  }

  return (
    <View
      accessibilityRole="tablist"
      style={[styles.tabBar, { paddingBottom: insets.bottom }]}
    >
      {tabs.map(tab => {
        const selected = nav.tab === tab.id;
        return (
          <Pressable
            key={tab.id}
            accessibilityRole="tab"
            accessibilityLabel={tab.label}
            accessibilityState={{ selected }}
            android_ripple={{
              color: colors.ripple,
              borderless: true,
              radius: 48,
            }}
            onPress={() => nav.selectTab(tab.id)}
            style={styles.tab}
          >
            <View
              collapsable={false}
              style={[styles.tabIcon, selected && styles.tabIconSelected]}
            >
              <tab.icon
                color={
                  !selected
                    ? colors.textSecondary
                    : colors.design.player === 'kawaii'
                    ? colors.onAccent
                    : colors.text
                }
                size={22}
              />
            </View>
            <Text style={[type.caption, selected && styles.tabLabelSelected]}>
              {tab.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

const useStyles = createStyles(colors => ({
  tabBar: {
    backgroundColor: colors.navigation,
    marginTop: spacing.sm,
    flexDirection: 'row',
    paddingTop: spacing.sm,
  },
  tab: {
    alignItems: 'center',
    flex: 1,
    gap: spacing.xs,
    minHeight: 56,
  },
  tabIcon: {
    alignItems: 'center',
    backgroundColor: colors.navigation,
    borderRadius: 16,
    height: 32,
    justifyContent: 'center',
    width: 64,
  },
  tabIconSelected: {
    backgroundColor:
      colors.design.player === 'kawaii' ? colors.accent : colors.surfaceHigh,
  },
  blockBar: {
    marginTop: 0,
    paddingTop: 0,
    borderTopWidth: colors.design.line,
    borderColor: colors.text,
  },
  blockTab: { justifyContent: 'center', minHeight: 64 },
  bubbleBar: {
    borderTopWidth: 2.5,
    borderColor: colors.text,
  },
  tabGlyph: {
    alignItems: 'center',
    height: 34,
    justifyContent: 'center',
    width: 64,
  },
  burst: { position: 'absolute', left: 0, top: 0 },
  hudBar: {
    borderTopWidth: 1.5,
    borderColor: colors.outline,
    boxShadow: `0 -4px 14px ${colors.accent}33`,
  },
  hudCorner: {
    borderColor: colors.accent,
    height: 9,
    position: 'absolute',
    width: 9,
  },
  cursorBar: {
    borderTopWidth: 4,
    borderColor: colors.text,
  },
  cursorBox: {
    alignItems: 'center',
    backgroundColor: colors.text,
    height: 28,
    justifyContent: 'center',
    width: 34,
  },
  horizonBar: {
    backgroundColor: colors.skin.floor ?? colors.navigation,
    overflow: 'hidden',
  },
  horizonGrid: { position: 'absolute', left: 0, top: 0 },
  horizonLine: {
    backgroundColor: colors.accent,
    boxShadow: `0 0 10px ${colors.accent}`,
    height: 2,
    left: 0,
    position: 'absolute',
    right: 0,
    top: 0,
  },
  kiBar: { borderTopWidth: 2, borderColor: colors.accent },
  kiBox: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 17,
    boxShadow: `0 0 16px 4px ${colors.accent}`,
    height: 34,
    justifyContent: 'center',
    width: 34,
  },
  stackBar: { borderTopWidth: 1, borderColor: colors.outline },
  stackBox: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderBottomColor: 'rgba(0,0,0,0.25)',
    borderBottomWidth: 4,
    borderRadius: 8,
    borderTopColor: 'rgba(255,255,255,0.35)',
    borderTopWidth: 2,
    height: 34,
    justifyContent: 'center',
    width: 52,
  },
  flashBar: { borderTopWidth: 1, borderColor: colors.outline },
  litBox: {
    alignItems: 'center',
    borderRadius: 18,
    boxShadow: `0 0 22px 6px rgba(${colors.skin.beam ?? '255,232,180'},0.35)`,
    backgroundColor: `rgba(${colors.skin.beam ?? '255,232,180'},0.16)`,
    height: 34,
    justifyContent: 'center',
    width: 56,
  },
  neuralBar: { borderTopWidth: 1, borderColor: colors.accent },
  lockBox: {
    alignItems: 'center',
    backgroundColor: colors.accent,
    borderRadius: 4,
    boxShadow: `0 0 12px ${colors.accent}, 3px 0 0 ${colors.control}`,
    height: 30,
    justifyContent: 'center',
    width: 44,
  },
  sparkleBar: { borderTopWidth: 1, borderColor: colors.outline },
  tabStar: { position: 'absolute', right: 12, top: -2 },
  horizonGlyph: { overflow: 'hidden' },
  horizonLabel: { letterSpacing: 1, textTransform: 'uppercase' },
  sun: { bottom: -18, left: 14, position: 'absolute' },
  tabLabelRow: { alignItems: 'center', flexDirection: 'row', gap: 4 },
  tl: { borderLeftWidth: 2, borderTopWidth: 2, left: 12, top: 0 },
  tr: { borderRightWidth: 2, borderTopWidth: 2, right: 12, top: 0 },
  bl: { borderBottomWidth: 2, borderLeftWidth: 2, bottom: 0, left: 12 },
  br: { borderBottomWidth: 2, borderRightWidth: 2, bottom: 0, right: 12 },
  blockDivider: {
    borderLeftWidth: colors.design.line,
    borderColor: colors.text,
  },
  blockSelected: { backgroundColor: colors.text },
  blockLabelSelected: { color: colors.background },
  bracketSelected: { color: colors.accent },
  underline: { height: 3, width: 28, borderRadius: 2 },
  underlineOn: { backgroundColor: colors.accent },
  tabLabelSelected: { color: colors.text, ...strongFont(colors) },
}));
