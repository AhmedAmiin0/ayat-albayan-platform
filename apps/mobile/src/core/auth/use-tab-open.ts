import { type TabRoute, tabOpen } from './route-permissions';
import { usePermissions } from './use-permissions';

/** Is this tab visible to the held role? Guards every push into a tab (a hidden tab goes nowhere). */
export function useTabOpen(tab: TabRoute): boolean {
  return tabOpen(usePermissions(), tab);
}
