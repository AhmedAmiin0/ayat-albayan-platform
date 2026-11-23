import type { Permission } from '@ab/shared';

/** Added by hand in production, not by migration; the sales matrix holds them for restore. */
const PEOPLE_EDIT: Permission[] = ['people.edit', 'students.attach_guardian', 'people.switch_role'];
/** Admin only, no migration (allGrantable). */
const REFUND: Permission[] = ['subscriptions.refund'];

export const GRANTED_BY_HAND: Record<'admin' | 'teacher' | 'assistant' | 'sales', Permission[]> = {
  admin: [...PEOPLE_EDIT, ...REFUND],
  teacher: [],
  assistant: [],
  sales: PEOPLE_EDIT,
};

const BY_ROLE: Record<string, readonly Permission[] | undefined> = GRANTED_BY_HAND;

/** The keys granted by hand for a system role (none for any other key). */
export const byHand = (role: string): readonly Permission[] => BY_ROLE[role] ?? [];
