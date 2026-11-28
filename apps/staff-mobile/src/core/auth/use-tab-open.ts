import { type TabRoute, tabOpen } from './route-permissions';
import { usePermissions } from '@ab/mobile-kit';

/** Guards every push into a tab: a tab hidden for the held role goes nowhere. */
export function useTabOpen(tab: TabRoute): boolean {
  return tabOpen(usePermissions(), tab);
}
