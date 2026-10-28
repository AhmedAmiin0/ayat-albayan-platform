import { threadBadge, type ThreadDetail, type ThreadStudentView } from '@ab/shared';
import type { InfiniteData } from '@tanstack/react-query';
import { router } from 'expo-router';
import { View } from 'react-native';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { badgeChip, childChip, dueLine, packageText, subscribeAction } from './subscription-words';

interface SubscriptionPanelProps {
  /** The cached thread; its newest page's `people` (absent on a thread saved before it existed). */
  data: InfiniteData<Partial<Pick<ThreadDetail, 'people' | 'thread'>>> | undefined;
  phone: string;
}

/**
 * Over a guardian's or a lead's chat (R-SUB-01): «مشترك» / «الباقة خلصت» / «مش مشترك» (none for a
 * converted lead with no family on this number), each child like the web panel (name, «مش مدفوع» /
 * «متوقف مؤقتًا», the package, «عليه X» on its own line in act), and the one subscribe button.
 * A teacher's or an unknown number's chat shows nothing.
 */
export function SubscriptionPanel({ data, phone }: SubscriptionPanelProps) {
  const { color } = useTheme();
  const page = data?.pages[0];
  const people = page?.people;
  if (!people || (!people.guardian && !people.lead)) return null;
  const action = subscribeAction({ people, phone, thread: page?.thread });
  const badge = threadBadge(people);
  return (
    <View style={{ gap: 6, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: color.rule }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 }}>
        {badge ? <StatusChip {...badgeChip(badge)} size="sm" /> : <View />}
        {action ? (
          // Fills the rest of the line beside the chip: never shrink-wrapped (docs/07 «الأزرار»).
          <View testID="subscribe-action" style={{ flex: 1 }}>
            <Button variant="secondary" label={action.label} onPress={() => router.push(action.href)} />
          </View>
        ) : null}
      </View>
      {people.students.map((student) => (
        <ChildLines key={student.id} student={student} />
      ))}
    </View>
  );
}

/** «يوسف [مش مدفوع]», «8 حلقات في الشهر · فاضل حلقتين», «عليه 145 ر.س». */
function ChildLines({ student }: { student: ThreadStudentView }) {
  const { color } = useTheme();
  const sub = student.subscription;
  const chip = childChip(sub);
  const due = dueLine(sub);
  const line = { fontFamily: type.ui[500], fontSize: type.size.xs, lineHeight: type.lineHeight(type.size.xs), fontVariant: ['tabular-nums' as const] };
  return (
    <View style={{ gap: 2 }}>
      <View style={{ flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 }}>
        <AppText style={{ ...line, fontFamily: type.ui[600], color: color.ink }}>{student.name}</AppText>
        {chip ? <StatusChip {...chip} size="sm" /> : null}
      </View>
      <AppText numberOfLines={2} style={{ ...line, color: color.ink2 }}>
        {packageText(sub)}
      </AppText>
      {due ? <AppText style={{ ...line, fontFamily: type.ui[600], color: color.act }}>{due}</AppText> : null}
    </View>
  );
}
