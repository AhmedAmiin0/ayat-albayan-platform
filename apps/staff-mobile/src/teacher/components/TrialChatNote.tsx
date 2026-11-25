import { familyChatViaSales } from '@ab/shared';
import type { StudentStatus } from '@ab/catalog';
import { t, shape, type, useTheme, AppText } from '@ab/mobile-kit';

/**
 * A trial student's family is reached through sales, not the teacher: the
 * teacher's student file shows this note where a family contact would be. Nothing otherwise.
 */
export function TrialChatNote({ status }: { status: StudentStatus | undefined }) {
  const { color } = useTheme();
  if (!familyChatViaSales(status)) return null;
  return (
    <AppText
      testID="trial-chat-note"
      style={{
        fontFamily: type.ui[500],
        fontSize: type.size.sm,
        lineHeight: type.lineHeight(type.size.sm),
        color: color.ink2,
        backgroundColor: color.sunk,
        borderRadius: shape.radius.md,
        paddingHorizontal: 12,
        paddingVertical: 8,
        overflow: 'hidden',
      }}
    >
      {t.teacherDash.trialChatViaSales}
    </AppText>
  );
}
