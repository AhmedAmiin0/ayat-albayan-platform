import { familyChatViaSales, type StudentStatus } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { shape, type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';

/**
 * A trial student's family is reached through sales, not the teacher (owner, 2026-10-11): the
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
