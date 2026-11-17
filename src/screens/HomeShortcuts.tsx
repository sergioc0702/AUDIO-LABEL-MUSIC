import { Text, useWindowDimensions, View } from 'react-native';
import Svg, {
  Circle,
  ClipPath,
  Defs,
  LinearGradient,
  Path,
  Pattern,
  Polygon,
  Rect,
  Stop,
} from 'react-native-svg';
import { Heart } from 'lucide-react-native';
import {
  screenPadding,
  spacing,
  createStyles,
  useColors,
} from '../theme/theme';
import { Tap } from '../ui/Tap';

/*
 * The shortcuts at the top of Home. Each theme draws them its own way
 * (design.home): manga panels, cartridges, a sunset, tickets and more.
 */

const PANEL_H = 60;
const SLANT = 8;

/**
 * A shortcut drawn as a manga panel: the gutter between the two columns is a
 * diagonal, and a corner carries screentone.
 */
function PanelShortcut({
  label,
  icon: Icon,
  index,
  press,
}: {
  label: string;
  icon: typeof Heart;
  index: number;
  press: {
    accessibilityRole: 'button';
    accessibilityLabel: string;
    onPress: () => void;
  };
}) {
  const { colors, type } = useColors();
  const styles = useStyles();
  const { width } = useWindowDimensions();
  const w = Math.floor((width - screenPadding * 2 - spacing.sm) / 2);
  const left = index % 2 === 0;
  const points = left
    ? `1.25,1.25 ${w - 1.25},1.25 ${w - SLANT},${PANEL_H - 1.25} 1.25,${
        PANEL_H - 1.25
      }`
    : `${SLANT},1.25 ${w - 1.25},1.25 ${w - 1.25},${PANEL_H - 1.25} 1.25,${
        PANEL_H - 1.25
      }`;
  const id = `mg-tone-${index}`;
  return (
    <Tap {...press} style={[styles.panelShortcut, { width: w }]}>
      <Svg height={PANEL_H} style={styles.panelArt} width={w}>
        <Defs>
          <Pattern height={6} id={id} patternUnits="userSpaceOnUse" width={6}>
            <Circle cx={3} cy={3} fill={colors.skin.tone} r={1.4} />
          </Pattern>
        </Defs>
        <Polygon fill={colors.surface} points={points} />
        <Polygon
          fill={`url(#${id})`}
          opacity={0.35}
          points={
            left
              ? `${w - 46},${PANEL_H} ${w - SLANT},${PANEL_H} ${w - 2},20`
              : `${w},${PANEL_H - 2} ${w},20 ${w - 40},${PANEL_H - 2}`
          }
        />
        <Polygon
          fill="none"
          points={points}
          stroke={colors.text}
          strokeWidth={2.5}
        />
      </Svg>
      <Icon color={colors.accent} size={22} strokeWidth={2.4} />
      <Text numberOfLines={1} style={[type.headline, styles.panelLabel]}>
        {label}
      </Text>
    </Tap>
  );
}

type ShortcutPress = {
  accessibilityRole: 'button';
  accessibilityLabel: string;
  onPress: () => void;
};

const CART_H = 86;
const CART_CUT = 14;

/** A shortcut drawn as a game cartridge for the Pixel theme. */
function CartridgeShortcut({
  label,
  icon: Icon,
  press,
}: {
  label: string;
  icon: typeof Heart;
  press: ShortcutPress;
}) {
  const { colors, type } = useColors();
  const styles = useStyles();
  const { width } = useWindowDimensions();
  const w = Math.floor((width - screenPadding * 2 - spacing.sm * 2) / 3);
  const ink = colors.skin.labelInk ?? colors.text;
  return (
    <Tap {...press} style={[styles.cartShortcut, { width: w }]}>
      <Svg height={CART_H} style={styles.panelArt} width={w}>
        <Polygon
          fill={colors.skin.cart ?? colors.surfaceHigh}
          points={`0,0 ${
            w - CART_CUT
          },0 ${w},${CART_CUT} ${w},${CART_H} 0,${CART_H}`}
        />
        <Rect
          fill="#000000"
          height={3}
          opacity={0.18}
          width={w}
          y={CART_H - 3}
        />
        {[0, 1, 2].map(n => (
          <Rect
            key={n}
            fill="#000000"
            height={3}
            opacity={0.22}
            width={18}
            x={10 + n * 22}
            y={6}
          />
        ))}
      </Svg>
      <View style={styles.cartLabel}>
        <Icon color={ink} size={16} strokeWidth={2.6} />
        <Text
          numberOfLines={2}
          style={[type.label, styles.cartText, { color: ink }]}
        >
          {label}
        </Text>
      </View>
    </Tap>
  );
}

const SUNSET_H = 68;

/** A shortcut drawn as a tiny vaporwave sunset over a neon grid. */
function SunsetShortcut({
  label,
  icon: Icon,
  index,
  press,
}: {
  label: string;
  icon: typeof Heart;
  index: number;
  press: ShortcutPress;
}) {
  const { colors, type } = useColors();
  const styles = useStyles();
  const { width } = useWindowDimensions();
  const w = Math.floor((width - screenPadding * 2 - spacing.sm) / 2);
  const k = colors.skin;
  const sky = `vw-sky-${index}`;
  const sun = `vw-sun-${index}`;
  const cut = `vw-cut-${index}`;
  const cx = w - 28;
  const horizon = 44;
  return (
    <Tap {...press} style={[styles.sunsetShortcut, { width: w }]}>
      <Svg height={SUNSET_H} style={styles.panelArt} width={w}>
        <Defs>
          <LinearGradient id={sky} x1="0" x2="1" y1="0" y2="0.3">
            <Stop offset="0" stopColor={k.panel ?? colors.surface} />
            <Stop offset="0.5" stopColor={k.panel ?? colors.surface} />
            <Stop offset="1" stopColor={k.sky2 ?? colors.accent} />
          </LinearGradient>
          <LinearGradient id={sun} x1="0" x2="0" y1="0" y2="1">
            <Stop offset="0" stopColor={k.sun1 ?? colors.accent} />
            <Stop offset="1" stopColor={k.sun2 ?? colors.accent} />
          </LinearGradient>
          <ClipPath id={cut}>
            <Rect height={23} width={64} x={cx - 36} y={0} />
            <Rect height={5} width={64} x={cx - 36} y={26} />
            <Rect height={3} width={64} x={cx - 36} y={34} />
            <Rect height={2} width={64} x={cx - 36} y={40} />
          </ClipPath>
        </Defs>
        <Rect fill={`url(#${sky})`} height={SUNSET_H} width={w} />
        <Circle
          clipPath={`url(#${cut})`}
          cx={cx}
          cy={horizon}
          fill={`url(#${sun})`}
          r={26}
        />
        <Rect
          fill={k.floor ?? colors.background}
          height={SUNSET_H - horizon}
          opacity={0.9}
          width={w}
          y={horizon}
        />
        <Path
          d={[
            `M0 ${horizon} H ${w} M0 50 H ${w} M0 58 H ${w}`,
            ...[-60, -24, 24, 60].map(
              dx => `M${w / 2} ${horizon} L ${w / 2 + dx} ${SUNSET_H}`,
            ),
            `M${w / 2} ${horizon} L 0 58 M${w / 2} ${horizon} L ${w} 58`,
          ].join(' ')}
          opacity={0.75}
          stroke={k.grid ?? colors.accent}
          strokeWidth={1}
        />
      </Svg>
      <View style={styles.sunsetLabel}>
        <Icon color={k.accent ?? colors.accent} size={16} strokeWidth={2.4} />
        <Text
          numberOfLines={1}
          style={[type.bodyStrong, { color: k.ink ?? colors.text }]}
        >
          {label}
        </Text>
      </View>
    </Tap>
  );
}

export function Shortcut({
  label,
  icon: Icon,
  index,
  onPress,
}: {
  label: string;
  icon: typeof Heart;
  index: number;
  onPress: () => void;
}) {
  const { colors, type } = useColors();
  const styles = useStyles();
  const variant = colors.design.home;
  const press = {
    accessibilityRole: 'button' as const,
    accessibilityLabel: label,
    onPress,
  };

  if (variant === 'aura') {
    return (
      <Tap
        {...press}
        style={[
          styles.auraShortcut,
          {
            borderColor: colors.skin.outline ?? colors.outline,
            boxShadow: `0 0 12px ${colors.accent}`,
          },
        ]}
      >
        <Icon color={colors.accent} size={20} />
        <Text
          numberOfLines={1}
          style={[type.headline, styles.auraLabel, { color: colors.text }]}
        >
          {label}
        </Text>
      </Tap>
    );
  }
  if (variant === 'bricks') {
    const n = (index % 5) + 1;
    const fill = colors.skin[`p${n}`] ?? colors.surface;
    const ink = colors.skin[`onP${n}`] ?? colors.text;
    return (
      <Tap {...press} style={[styles.brickShortcut, { backgroundColor: fill }]}>
        <Icon color={ink} size={20} />
        <Text
          numberOfLines={1}
          style={[type.bodyStrong, styles.brickLabel, { color: ink }]}
        >
          {label}
        </Text>
      </Tap>
    );
  }
  if (variant === 'notes') {
    const ink = colors.skin.noteInk ?? colors.text;
    return (
      <Tap
        {...press}
        style={[
          styles.noteShortcut,
          {
            backgroundColor: colors.skin.note ?? colors.surface,
            transform: [{ rotate: `${index % 2 ? 1.5 : -1.5}deg` }],
          },
        ]}
      >
        <View
          style={[
            styles.noteTape,
            { backgroundColor: colors.skin.note ?? colors.surface },
          ]}
        />
        <Icon color={ink} size={18} />
        <Text
          numberOfLines={1}
          style={[type.title, styles.noteLabel, { color: ink }]}
        >
          {label}
        </Text>
      </Tap>
    );
  }
  if (variant === 'exits') {
    const ink = colors.skin.onExit ?? colors.text;
    return (
      <Tap
        {...press}
        style={[
          styles.exitShortcut,
          { backgroundColor: colors.skin.exit ?? colors.surface },
        ]}
      >
        <View style={[styles.exitInner, { borderColor: ink }]}>
          <View style={styles.exitTop}>
            <Text style={[styles.exitKanji, { color: ink }]}>出口</Text>
            <Text style={[type.caption, { color: ink }]}>
              SALIDA {String(index + 1).padStart(2, '0')} ↗
            </Text>
          </View>
          <View style={styles.exitRow}>
            <Icon color={ink} size={18} />
            <Text
              numberOfLines={1}
              style={[type.bodyStrong, styles.exitLabel, { color: ink }]}
            >
              {label}
            </Text>
          </View>
        </View>
      </Tap>
    );
  }
  if (variant === 'starry') {
    return (
      <Tap {...press} style={styles.starryShortcut}>
        <Icon color={colors.accent} size={20} />
        <Text numberOfLines={1} style={[type.headline, styles.starryLabel]}>
          {label}
        </Text>
        <Svg
          height={12}
          style={styles.starryMark}
          viewBox="0 0 14 14"
          width={12}
        >
          <Path
            d="M7 0 Q 8.5 5.5 14 7 Q 8.5 8.5 7 14 Q 5.5 8.5 0 7 Q 5.5 5.5 7 0 Z"
            fill={colors.accent}
          />
        </Svg>
      </Tap>
    );
  }
  if (variant === 'cartridges') {
    return <CartridgeShortcut icon={Icon} label={label} press={press} />;
  }
  if (variant === 'sunsets') {
    return (
      <SunsetShortcut icon={Icon} index={index} label={label} press={press} />
    );
  }
  if (variant === 'panels') {
    return (
      <PanelShortcut icon={Icon} index={index} label={label} press={press} />
    );
  }
  if (variant === 'console') {
    return (
      <Tap {...press} style={styles.consoleShortcut}>
        <View style={styles.consoleLed} />
        <Icon color={colors.accent} size={20} />
        <Text numberOfLines={1} style={[type.label, styles.consoleLabel]}>
          {label.toUpperCase()}
        </Text>
      </Tap>
    );
  }
  if (variant === 'rows') {
    const hot = index === 1;
    // The ink made for the hot color; `control` can be the very same color.
    const hotInk = colors.skin.onHot ?? colors.onControl;
    return (
      <Tap
        {...press}
        style={[styles.rowShortcut, hot && styles.rowShortcutHot]}
      >
        <Text
          numberOfLines={1}
          style={[type.headline, hot && { color: hotInk }]}
        >
          {label}
        </Text>
        <Icon color={hot ? hotInk : colors.text} size={26} />
      </Tap>
    );
  }
  if (variant === 'listing') {
    return (
      <Tap {...press} style={styles.listingShortcut}>
        <Text numberOfLines={1} style={[type.body, styles.listingMode]}>
          {index === 1 ? '-a---' : 'd----'}
        </Text>
        <Text numberOfLines={1} style={[type.body, styles.listingName]}>
          {label.replace(/ /g, '-')}
        </Text>
      </Tap>
    );
  }
  if (variant === 'tapes') {
    const stripes = [colors.skin.m1, colors.skin.m3, colors.skin.m2];
    return (
      <Tap {...press} style={styles.tapeShortcut}>
        <View
          style={[
            styles.tapeStripe,
            { backgroundColor: stripes[index % stripes.length] },
          ]}
        />
        <View style={styles.tapeLabel}>
          <Text numberOfLines={1} style={[type.headline, styles.tapeText]}>
            {label}
          </Text>
        </View>
        <Icon color={colors.skin.shellInk} size={20} />
      </Tap>
    );
  }
  if (variant === 'tickets') {
    return (
      <Tap {...press} style={styles.ticketShortcut}>
        <Text numberOfLines={1} style={[type.title, styles.ticketText]}>
          {label.toUpperCase()}
        </Text>
        <View style={styles.ticketStub}>
          <Icon color={colors.skin.ink} size={20} />
        </View>
        <View style={[styles.ticketNotch, styles.ticketNotchTop]} />
        <View style={[styles.ticketNotch, styles.ticketNotchBottom]} />
      </Tap>
    );
  }
  if (variant === 'keys') {
    return (
      <Tap {...press} style={styles.keyShortcut}>
        <Icon color={colors.accent} size={20} />
        <Text numberOfLines={2} style={type.label}>
          {label}
        </Text>
      </Tap>
    );
  }
  if (variant === 'pills') {
    return (
      <Tap {...press} pressedScale={0.96} style={styles.pillShortcut}>
        <View style={styles.pillIcon}>
          <Icon color={colors.accent} size={20} />
        </View>
        <Text numberOfLines={2} style={[type.label, styles.shortcutLabel]}>
          {label}
        </Text>
      </Tap>
    );
  }
  return (
    <Tap {...press} style={styles.shortcut}>
      <View style={styles.shortcutIcon}>
        <Icon color={colors.text} size={20} />
      </View>
      <Text numberOfLines={2} style={[type.label, styles.shortcutLabel]}>
        {label}
      </Text>
    </Tap>
  );
}

const useStyles = createStyles(colors => ({
  rowShortcut: {
    alignItems: 'center',
    borderBottomWidth: colors.design.line,
    borderColor: colors.text,
    flexDirection: 'row',
    justifyContent: 'space-between',
    minHeight: 60,
    paddingHorizontal: screenPadding,
  },
  rowShortcutHot: { backgroundColor: colors.skin.hot ?? colors.accent },
  listingShortcut: {
    flexDirection: 'row',
    gap: spacing.lg,
    minHeight: 44,
    alignItems: 'center',
  },
  listingMode: { color: colors.textSecondary },
  listingName: { flex: 1 },
  tapeShortcut: {
    alignItems: 'center',
    backgroundColor: colors.skin.shell ?? colors.surfaceHigh,
    borderRadius: colors.design.radius.sm,
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 62,
    overflow: 'hidden',
    paddingRight: spacing.md,
  },
  tapeStripe: { alignSelf: 'stretch', width: 22 },
  tapeLabel: {
    alignSelf: 'stretch',
    backgroundColor: colors.skin.label ?? colors.surface,
    flex: 1,
    justifyContent: 'center',
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.md,
  },
  tapeText: { color: colors.skin.ink ?? colors.text, fontSize: 30 },
  ticketShortcut: {
    alignItems: 'center',
    backgroundColor: colors.skin.paper ?? colors.surface,
    borderRadius: colors.design.radius.md,
    flexDirection: 'row',
    minHeight: 64,
    overflow: 'hidden',
  },
  ticketText: {
    color: colors.skin.ink ?? colors.text,
    flex: 1,
    paddingHorizontal: spacing.lg,
  },
  ticketStub: {
    alignItems: 'center',
    alignSelf: 'stretch',
    borderColor: colors.skin.perf ?? colors.outline,
    borderLeftWidth: 3,
    borderStyle: 'dashed',
    justifyContent: 'center',
    width: 72,
  },
  ticketNotch: {
    backgroundColor: colors.background,
    borderRadius: 11,
    height: 22,
    position: 'absolute',
    right: 61,
    width: 22,
  },
  ticketNotchTop: { top: -11 },
  ticketNotchBottom: { bottom: -11 },
  keyShortcut: {
    backgroundColor: colors.surfaceHigh,
    borderBottomWidth: 4,
    borderColor: colors.skin.keyEdge ?? colors.outline,
    borderRadius: colors.design.radius.md,
    flexBasis: '48%',
    flexGrow: 1,
    gap: spacing.sm,
    justifyContent: 'flex-end',
    minHeight: 72,
    padding: spacing.md,
  },
  pillShortcut: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: colors.design.radius.lg,
    flexBasis: '48%',
    flexDirection: 'row',
    flexGrow: 1,
    gap: spacing.sm,
    minHeight: 60,
    paddingHorizontal: spacing.sm,
  },
  pillIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceHigh,
    borderRadius: 20,
    height: 40,
    justifyContent: 'center',
    width: 40,
  },
  consoleShortcut: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.outline,
    borderRadius: colors.design.radius.md,
    borderWidth: 1.5,
    flexBasis: '48%',
    flexDirection: 'row',
    flexGrow: 1,
    gap: spacing.sm,
    height: 58,
    paddingHorizontal: spacing.md,
  },
  consoleLed: {
    backgroundColor: colors.accent,
    borderRadius: 3,
    boxShadow: `0 0 6px ${colors.accent}`,
    height: 6,
    position: 'absolute',
    right: 8,
    top: 8,
    width: 6,
  },
  consoleLabel: { flex: 1, letterSpacing: 1 },
  panelShortcut: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    height: PANEL_H,
    paddingLeft: spacing.lg,
    paddingRight: spacing.md,
  },
  panelArt: { position: 'absolute', left: 0, top: 0 },
  auraShortcut: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: 10,
    borderWidth: 3,
    flexBasis: '47%',
    flexDirection: 'row',
    flexGrow: 1,
    gap: spacing.sm,
    height: 60,
    paddingHorizontal: spacing.md,
  },
  auraLabel: { flex: 1, fontSize: 20, lineHeight: 26, letterSpacing: 1 },
  brickShortcut: {
    alignItems: 'center',
    borderBottomColor: 'rgba(0,0,0,0.25)',
    borderBottomWidth: 6,
    borderRadius: 12,
    borderTopColor: 'rgba(255,255,255,0.35)',
    borderTopWidth: 3,
    flexBasis: '47%',
    flexDirection: 'row',
    flexGrow: 1,
    gap: spacing.sm,
    height: 60,
    paddingHorizontal: spacing.md,
  },
  brickLabel: { flex: 1 },
  noteShortcut: {
    alignItems: 'center',
    boxShadow: '0 4px 10px rgba(0,0,0,0.6)',
    flexBasis: '47%',
    flexDirection: 'row',
    flexGrow: 1,
    gap: spacing.sm,
    height: 58,
    paddingHorizontal: spacing.md,
  },
  noteTape: {
    height: 12,
    left: '38%',
    opacity: 0.5,
    position: 'absolute',
    top: -6,
    transform: [{ rotate: '4deg' }],
    width: 40,
  },
  noteLabel: { flex: 1 },
  exitShortcut: {
    borderRadius: colors.design.radius.sm,
    flexBasis: '48%',
    flexGrow: 1,
    height: 64,
    padding: 3,
  },
  exitInner: {
    borderRadius: colors.design.radius.sm,
    borderWidth: 1.5,
    flex: 1,
    justifyContent: 'center',
    paddingHorizontal: spacing.sm,
  },
  exitTop: { flexDirection: 'row', justifyContent: 'space-between' },
  exitKanji: { fontSize: 11, fontWeight: '900', lineHeight: 14 },
  exitRow: { alignItems: 'center', flexDirection: 'row', gap: 6 },
  exitLabel: { flex: 1 },
  starryShortcut: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderColor: colors.outline,
    borderRadius: colors.design.radius.md,
    borderWidth: 1,
    flexBasis: '48%',
    flexDirection: 'row',
    flexGrow: 1,
    gap: spacing.sm,
    height: 60,
    paddingHorizontal: spacing.md,
  },
  starryLabel: { flex: 1, fontSize: 20, lineHeight: 26 },
  starryMark: { position: 'absolute', right: 8, top: 8 },
  cartShortcut: { height: CART_H },
  cartLabel: {
    backgroundColor: colors.skin.label ?? colors.surface,
    bottom: 10,
    justifyContent: 'space-between',
    left: 8,
    paddingHorizontal: 6,
    paddingVertical: 5,
    position: 'absolute',
    right: 8,
    top: 16,
  },
  cartText: { lineHeight: 17 },
  sunsetShortcut: {
    borderColor: colors.skin.line ?? colors.outline,
    borderRadius: colors.design.radius.md,
    borderWidth: 1,
    height: SUNSET_H,
    overflow: 'hidden',
  },
  sunsetLabel: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 7,
    left: 12,
    position: 'absolute',
    right: 40,
    top: 10,
  },
  panelLabel: { flex: 1, fontSize: 19, lineHeight: 24, letterSpacing: 1 },
  shortcut: {
    alignItems: 'center',
    backgroundColor: colors.surface,
    borderRadius: colors.design.radius.sm,
    flexBasis: '48%',
    flexDirection: 'row',
    flexGrow: 1,
    gap: spacing.md,
    height: 56,
    overflow: 'hidden',
  },
  shortcutIcon: {
    alignItems: 'center',
    backgroundColor: colors.surfaceHigh,
    height: 56,
    justifyContent: 'center',
    width: 56,
  },
  shortcutLabel: { flex: 1, paddingRight: spacing.sm },
  row: { gap: spacing.md, paddingHorizontal: screenPadding },
}));
