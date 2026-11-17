import { screenPadding, spacing, createStyles } from '../theme/theme';

/** Shared by the song menu and the playlist dialogs. */
export const useStyles = createStyles(colors => ({
  included: { paddingRight: spacing.lg },
  dialogOverlay: {
    alignItems: 'center',
    backgroundColor: colors.scrim,
    flex: 1,
    justifyContent: 'center',
    padding: spacing.xl,
  },
  dialog: {
    backgroundColor: colors.surface,
    borderRadius: colors.design.radius.sheet,
    gap: spacing.lg,
    maxWidth: 420,
    padding: spacing.xl,
    width: '100%',
  },
  input: {
    backgroundColor: colors.surfaceHigh,
    borderRadius: colors.design.radius.md,
    color: colors.text,
    fontSize: 15,
    height: 48,
    paddingHorizontal: spacing.md,
  },
  error: { color: colors.danger, fontSize: 14 },
  dialogActions: {
    flexDirection: 'row',
    gap: spacing.sm,
    justifyContent: 'flex-end',
  },
  picker: { backgroundColor: colors.background, flex: 1 },
  pickerHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.sm,
    paddingHorizontal: spacing.xs,
    paddingRight: screenPadding,
  },
  pickerTitle: { flex: 1 },
  pickerSearch: { marginHorizontal: screenPadding, marginVertical: spacing.sm },
  pickerRow: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    minHeight: 64,
    paddingHorizontal: screenPadding,
  },
  pickerText: { flex: 1, gap: 2, minWidth: 0 },
}));
