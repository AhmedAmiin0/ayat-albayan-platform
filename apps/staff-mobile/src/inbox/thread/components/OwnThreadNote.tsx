import { t, shape, type, useTheme, AppText } from '@ab/mobile-kit';

/** Instead of the composer in a teacher's own chat with the academy: the academy answers. */
export function OwnThreadNote() {
  const { color } = useTheme();
  return (
    <AppText
      style={{
        marginBottom: 12,
        padding: 12,
        borderRadius: shape.radius.md,
        borderWidth: 1,
        borderColor: color.rule,
        backgroundColor: color.sunk,
        fontFamily: type.ui[500],
        fontSize: type.size.xs,
        lineHeight: type.lineHeight(type.size.xs),
        color: color.ink2,
      }}
    >
      {t.inbox.ownThreadReadOnly}
    </AppText>
  );
}
