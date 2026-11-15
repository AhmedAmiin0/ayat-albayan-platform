import { router } from 'expo-router';
import { BellButton as KitBell } from '@ab/mobile-kit';
import { notificationsHref, type PushTree } from '@/core/push/notification-route';

interface BellButtonProps {
  /** Which tree's notifications screen it opens. */
  tree: PushTree;
  /** A round button (the calm Today header's 44pt circle): the pressed wash takes the circle. */
  round?: boolean;
}

/** The kit's bell (R-NOT-01), opening the notifications screen of the staff tree it sits in. */
export function BellButton({ tree, round = false }: BellButtonProps) {
  return <KitBell round={round} onPress={() => router.push(notificationsHref(tree))} />;
}
