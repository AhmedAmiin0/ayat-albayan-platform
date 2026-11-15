import { router } from 'expo-router';
import { BellButton } from '@ab/mobile-kit';
import { ALERTS_HREF } from './hrefs';

/** The bell at the top of every tab screen: the unread badge, «الإشعارات» pushed above the tabs. */
export function FamilyBell() {
  return <BellButton round onPress={() => router.push(ALERTS_HREF)} />;
}
