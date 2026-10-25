import { subscriptionStatusStyle, type ThreadView } from '@ab/shared';
import type { TextStyle } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { leadSourceWord, leadStatusChip } from './lead-words';
import { badgeChip } from './subscription/subscription-words';

/** Who the number is: a guardian or teacher on file, else a lead, else nobody known yet. */
function kindWord(th: ThreadView): string {
  if (th.guardian_id) return t.inbox.kind.guardian;
  if (th.teacher_id) return t.inbox.kind.teacher;
  return th.lead_id ? t.inbox.kind.lead : t.inbox.unknownNumber;
}

/** A converted lead with no guardian on this number: «اتحول لطالب» (neutral), never the «مشترك» of a package. */
const statusChip = (status: string) =>
  status === 'converted' ? { tone: 'neutral' as const, glyph: 'fill' as const, label: t.inbox.convertedLead } : leadStatusChip(status);

/**
 * A thread row's tags, like the web inbox row: a lead's status chip, else who the number is
 * («ولي أمر», «معلم/ة»); then the family's package tags; then where the lead came from. ListRow's
 * tags line wraps them.
 */
export function ThreadTags({ thread: th }: { thread: ThreadView }) {
  const { color } = useTheme();
  const word: TextStyle = { fontFamily: type.ui[500], fontSize: type.size['2xs'], color: color.ink3 };
  // A guardian / teacher on file outranks the lead row they once came from.
  const status = th.guardian_id || th.teacher_id ? null : th.lead_status;
  return (
    <>
      {status ? (
        <StatusChip {...statusChip(status)} size="sm" />
      ) : (
        <AppText numberOfLines={1} style={word}>
          {kindWord(th)}
        </AppText>
      )}
      <FamilyTags thread={th} />
      {th.lead_source ? (
        <AppText numberOfLines={1} style={word}>
          {leadSourceWord(th.lead_source)}
        </AppText>
      ) : null}
    </>
  );
}

/**
 * «مشترك» or «الباقة خلصت» (renew, the admin's turn), and «مش مدفوع» while a running package owes
 * money. A list cached before `badge` existed falls back to `subscribed`.
 */
function FamilyTags({ thread: th }: { thread: ThreadView }) {
  const badge = th.badge ?? (th.subscribed ? 'subscribed' : null);
  return (
    <>
      {badge === 'subscribed' || badge === 'expired' ? <StatusChip {...badgeChip(badge)} size="sm" /> : null}
      {th.unpaid ? (
        <StatusChip {...subscriptionStatusStyle.unpaid} label={t.enums.subscriptionStatus.unpaid} size="sm" />
      ) : null}
    </>
  );
}
