import { threadBadge, type ThreadDetail } from '@ab/shared';
import type { InfiniteData } from '@tanstack/react-query';
import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { PillButton } from '@/core/ui/primitives/PillButton';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { ChevronDownIcon } from '../thread/calls/screen/call-icons';
import { ThreadMenu } from '../thread/components/ThreadMenu';
import { ChildLines, FamilyList, LINE } from './ChildLines';
import { type FamilySummary, familySummary } from './subscription-summary';
import { badgeChip, subscribeAction, type SubscribeAction } from './subscription-words';

interface SubscriptionPanelProps {
  /** The cached thread; its newest page's `people` (absent on a thread saved before it existed). */
  data: InfiniteData<Partial<Pick<ThreadDetail, 'people' | 'thread'>>> | undefined;
  phone: string;
}

/**
 * Over a guardian's or a lead's chat (R-SUB-01), ONE row so the messages get the room (owner
 * 2026-10-29): «مشترك» / «انتهت الباقة» / «غير مشترك» (none for a converted lead with no family on this
 * number) and one subscribe pill. An only child's package sits beside the chip; a family folds into
 * «غير مدفوع · مشترك: 2 من 5 ⌄», opened in place (a line per package, one «بلا باقة: …»). A
 * teacher's or an unknown number's chat shows nothing.
 */
export function SubscriptionPanel({ data, phone }: SubscriptionPanelProps) {
  const { color } = useTheme();
  const [open, setOpen] = useState(false);
  const page = data?.pages[0];
  const people = page?.people;
  if (!people || (!people.guardian && !people.lead)) return null;
  const action = subscribeAction({ people, phone, thread: page?.thread });
  const badge = threadBadge(people);
  const chip = badge ? badgeChip(badge) : null;
  const kids = people.guardian ? people.students : [];
  const summary = kids.length > 1 ? familySummary(kids) : null;
  const only = kids.length === 1 ? kids[0] : undefined;
  return (
    <View style={{ gap: 6, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: color.rule }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        {summary && chip ? (
          <FamilyToggle chip={chip} summary={summary} open={open} onToggle={() => setOpen((v) => !v)} />
        ) : (
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8, flexShrink: 1 }}>
            {chip ? <StatusChip {...chip} size="sm" /> : null}
            {/* No package: the chip alone says «غير مشترك». */}
            {only?.subscription ? <ChildLines student={only} named={false} /> : null}
          </View>
        )}
        {action ? <SubscribePill action={action} /> : null}
      </View>
      {summary && open ? <FamilyList packaged={summary.packaged} noPackage={summary.noPackage} /> : null}
    </View>
  );
}

interface FamilyToggleProps {
  chip: ReturnType<typeof badgeChip>;
  summary: FamilySummary;
  open: boolean;
  onToggle: () => void;
}

/** The folded family: the family chip, what needs the admin, the count and a chevron; a tap opens it. */
function FamilyToggle({ chip, summary, open, onToggle }: FamilyToggleProps) {
  const { color } = useTheme();
  const s = t.inbox.subscription;
  // Open, each row carries its own chip.
  const folded = open ? [] : summary.chips;
  const words = [chip.label, ...folded.map((c) => c.label), summary.count].join(' · ');
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ expanded: open }}
      accessibilityLabel={`${open ? s.hideStudents : s.showStudents} — ${words}`}
      onPress={onToggle}
      hitSlop={{ top: 8, bottom: 8 }}
      style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6, flexShrink: 1, minHeight: 36 }}
    >
      <StatusChip {...chip} size="sm" />
      {folded.map((c) => (
        <StatusChip key={c.label} {...c} size="sm" />
      ))}
      <AppText numberOfLines={1} style={{ ...LINE, flexShrink: 1, color: color.ink2 }}>
        {summary.count}
      </AppText>
      <View style={{ transform: [{ rotate: open ? '180deg' : '0deg' }] }}>
        <ChevronDownIcon color={color.ink2} size={16} />
      </View>
    </Pressable>
  );
}

/**
 * The 36pt pill at the row's end (44pt with its hitSlop), as the sales strip: one child → its form;
 * several → «لأيّ طالب؟», each row with that child's own new / renew (owner 2026-10-29, one pill).
 */
function SubscribePill({ action }: { action: SubscribeAction }) {
  const [picking, setPicking] = useState(false);
  const targets = 'targets' in action ? action.targets : null;
  const press = () => ('targets' in action ? setPicking(true) : router.push(action.href));
  return (
    <View testID="subscribe-action" style={{ flexShrink: 0 }}>
      <PillButton label={action.label} accessibilityLabel={'targets' in action ? undefined : action.accessibilityLabel} onPress={press} />
      {targets ? (
        <ThreadMenu
          open={picking}
          label={t.trialDate.mobile.pickStudent}
          items={targets.map((target) => ({ label: target.label, onPress: () => router.push(target.href) }))}
          onClose={() => setPicking(false)}
        />
      ) : null}
    </View>
  );
}
