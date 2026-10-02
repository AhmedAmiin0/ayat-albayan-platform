import type { ThreadView } from '@ab/shared';
import type { TextStyle } from 'react-native';
import { t } from '@/lib/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { StatusChip } from '@/ui/StatusChip';
import { leadSourceWord, leadStatusChip } from './lead-words';

/** Who the number is: a guardian or teacher on file, else a lead, else nobody known yet. */
function kindWord(th: ThreadView): string {
  if (th.guardian_id) return t.inbox.kind.guardian;
  if (th.teacher_id) return t.inbox.kind.teacher;
  return th.lead_id ? t.inbox.kind.lead : t.inbox.unknownNumber;
}

/**
 * A thread row's tags, like the web inbox row: a lead's status chip, else who the number is
 * («ولي أمر», «معلم/ة»); then where the lead came from. ListRow's tags line wraps them.
 */
export function ThreadTags({ thread: th }: { thread: ThreadView }) {
  const { color } = useTheme();
  const word: TextStyle = { fontFamily: type.ui[500], fontSize: type.size['2xs'], color: color.ink3 };
  // A guardian / teacher on file outranks the lead row they once came from.
  const status = th.guardian_id || th.teacher_id ? null : th.lead_status;
  return (
    <>
      {status ? (
        <StatusChip {...leadStatusChip(status)} size="sm" />
      ) : (
        <AppText numberOfLines={1} style={word}>
          {kindWord(th)}
        </AppText>
      )}
      {th.lead_source ? (
        <AppText numberOfLines={1} style={word}>
          {leadSourceWord(th.lead_source)}
        </AppText>
      ) : null}
    </>
  );
}
