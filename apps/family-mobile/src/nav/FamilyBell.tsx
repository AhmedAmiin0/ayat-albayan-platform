import { router } from 'expo-router';
import { BellButton } from '@ab/mobile-kit';
import { ALERTS_HREF } from './hrefs';

export function FamilyBell() {
  return <BellButton round onPress={() => router.push(ALERTS_HREF)} />;
}
