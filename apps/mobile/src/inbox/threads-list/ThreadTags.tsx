import { subscriptionStatusStyle, type ThreadView } from '@ab/shared';
import { Fragment, type ReactNode } from 'react';
import { View, type TextStyle } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Ltr } from '@/core/ui/primitives/Ltr';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { leadSourceWord, leadStatusChip } from '../leads/detail/lead-words';
import { badgeChip } from '../subscription/subscription-words';

/** Who the number is: a guardian or teacher on file, else a lead, else nobody known yet. */
function kindWord(th: ThreadView): string {
  if (th.guardian_id) return t.inbox.kind.guardian;
  if (th.teacher_id) return t.inbox.kind.teacher;
  return th.lead_id ? t.inbox.kind.lead : t.inbox.unknownNumber;
}

/** A converted lead with no guardian on this number: «تحوّل إلى طالب» (neutral), never «مشترك». */
const statusChip = (status: string) =>
  status === 'converted'
    ? { tone: 'neutral' as const, glyph: 'fill' as const, label: t.inbox.convertedLead }
    : leadStatusChip(status);

/** A guardian / teacher on file outranks the lead row they once came from. */
const leadStatusOf = (th: ThreadView): string | null =>
  th.guardian_id || th.teacher_id ? null : th.lead_status;

type Item = [key: string, node: ReactNode];

/** «مشترك» or «انتهت الباقة», and «غير مدفوع» while a running package owes money (admin only). */
function familyChips(th: ThreadView, money: boolean): Item[] {
  const badge = th.badge ?? (th.subscribed ? 'subscribed' : null);
  const known = badge === 'subscribed' || badge === 'expired';
  const unpaid = { ...subscriptionStatusStyle.unpaid, label: t.enums.subscriptionStatus.unpaid };
  return [
    ['badge', known ? <StatusChip {...badgeChip(badge)} size="sm" /> : null],
    ['unpaid', money && th.unpaid ? <StatusChip {...unpaid} size="sm" /> : null],
  ];
}

interface ThreadMetaProps {
  thread: ThreadView;
  /** False in the sales tree (docs/16): never «غير مدفوع», whatever the payload says. */
  money: boolean;
  /** The formatted phone when the name took line 1; drawn last, LTR-isolated. */
  phone: string | undefined;
}

/**
 * The row's third line, one line that never wraps (owner 2026-11-06): role (or the lead's status
 * chip) · source · package chips · phone. Chips keep their size; the words shrink and ellipsize.
 */
export function ThreadMeta({ thread: th, money, phone }: ThreadMetaProps) {
  const { color } = useTheme();
  const word: TextStyle = {
    flexShrink: 1,
    fontFamily: type.ui[500],
    fontSize: type.size['2xs'],
    color: color.ink3,
  };
  const status = leadStatusOf(th);
  const words = [
    status ? null : kindWord(th),
    th.lead_source ? leadSourceWord(th.lead_source) : null,
  ];
  const items: Item[] = [
    ['status', status ? <StatusChip {...statusChip(status)} size="sm" /> : null],
    ...words.map((w): Item => [
      `w${String(w)}`,
      w ? (
        <AppText numberOfLines={1} style={word}>
          {w}
        </AppText>
      ) : null,
    ]),
    ...familyChips(th, money),
    ['phone', phone ? <Ltr style={{ ...word, fontFamily: type.ui[400] }}>{phone}</Ltr> : null],
  ];
  return (
    <View
      testID="thread-meta"
      style={{
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        minHeight: 22,
        overflow: 'hidden',
      }}
    >
      {items
        .filter(([, node]) => node !== null)
        .map(([key, node], at) => (
          <Fragment key={key}>
            {at > 0 ? <Dot style={word} /> : null}
            {node}
          </Fragment>
        ))}
    </View>
  );
}

/** «·» between two meta items: drawn, not read. */
function Dot({ style }: { style: TextStyle }) {
  return (
    <AppText
      accessibilityElementsHidden
      importantForAccessibility="no"
      style={{ ...style, flexShrink: 0 }}
    >
      ·
    </AppText>
  );
}
