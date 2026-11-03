import type { Permission } from '@ab/shared';

/**
 * Keys whose role_permissions rows are added by hand in production after the merge, not by a
 * migration (owner 2026-11-02: «assistant can update user data», feat/assistant-people-edit).
 * The system admin holds them anyway (allGrantable); the system sales role and the custom sales
 * roles get them from the matrix («استعادة الافتراضي» restores them for the system sales role).
 */
const PEOPLE_EDIT: Permission[] = ['people.edit', 'students.attach_guardian', 'people.switch_role'];

export const GRANTED_BY_HAND: Record<'admin' | 'teacher' | 'assistant' | 'sales', Permission[]> = {
  admin: PEOPLE_EDIT,
  teacher: [],
  assistant: [],
  sales: PEOPLE_EDIT,
};

const BY_ROLE: Record<string, readonly Permission[] | undefined> = GRANTED_BY_HAND;

/** The keys granted by hand for a system role (none for any other key). */
export const byHand = (role: string): readonly Permission[] => BY_ROLE[role] ?? [];
