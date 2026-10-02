import { subscriptionBadge, type ThreadDetail } from '@ab/shared';
import type { InfiniteData } from '@tanstack/react-query';
import { router } from 'expo-router';
import { View } from 'react-native';
import { type, useTheme } from '@/theme';
import { AppText } from '@/ui/AppText';
import { Button } from '@/ui/Button';
import { StatusChip } from '@/ui/StatusChip';
import { badgeChip, studentLine, subscribeAction } from './subscription-words';

export interface SubscriptionPanelProps {
  /** The cached thread; its newest page's `people` (absent on a thread saved before it existed). */
  data: InfiniteData<Partial<Pick<ThreadDetail, 'people' | 'thread'>>> | undefined;
  phone: string;
}

/**
 * Over a guardian's or a lead's chat (R-SUB-01): «مشترك» / «اشتراكه خلص» / «مش مشترك», each child's
 * package line with what is still due, and the one subscribe button. A teacher's or an unknown
 * number's chat shows nothing.
 */
export function SubscriptionPanel({ data, phone }: SubscriptionPanelProps) {
  const { color } = useTheme();
  const page = data?.pages[0];
  const people = page?.people;
  if (!people || (!people.guardian && !people.lead)) return null;
  const action = subscribeAction({ people, phone, thread: page?.thread });
  const line = {
    fontFamily: type.ui[500],
    fontSize: type.size.xs,
    lineHeight: type.lineHeight(type.size.xs),
    color: color.ink2,
    fontVariant: ['tabular-nums' as const],
  };
  return (
    <View
      style={{ gap: 4, paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: color.rule }}
    >
      <View
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          justifyContent: 'space-between',
          gap: 8,
        }}
      >
        <StatusChip {...badgeChip(subscriptionBadge(people.students))} size="sm" />
        {action ? (
          <Button
            variant="secondary"
            label={action.label}
            onPress={() => router.push(action.href)}
          />
        ) : null}
      </View>
      {people.students.map((student) => (
        <AppText key={student.id} numberOfLines={1} style={line}>
          {studentLine(student)}
        </AppText>
      ))}
    </View>
  );
}
