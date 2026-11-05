import type { Permission } from '@ab/shared';

/** One /people write as the apps build it (a react-query mutation plus its MSA refusal). */
export interface PeopleWrite<I> {
  mutate: (input: I) => void;
  isPending: boolean;
  errorText: string | null;
}

/** A success notice; `removed`: the student row is gone (the screen leaves it). */
export type PeopleDone = (notice: string, removed?: boolean) => void;

export type PeopleActionKind = 'edit' | 'attach' | 'convert';

/** The keys each action needs; the edit view itself is people.edit. */
const NEEDS: Record<PeopleActionKind, readonly Permission[]> = {
  edit: ['people.edit'],
  attach: ['people.edit', 'students.attach_guardian'],
  convert: ['people.edit', 'people.switch_role'],
};
const KINDS: readonly PeopleActionKind[] = ['edit', 'attach', 'convert'];

/** The actions a role holding `can` sees, in order. */
export const allowedPeopleActions = (can: (p: Permission) => boolean): PeopleActionKind[] =>
  KINDS.filter((k) => NEEDS[k].every((p) => can(p)));

/** The first refusal among several writes, or null. */
export const firstError = (writes: readonly PeopleWrite<never>[]): string | null =>
  writes.find((w) => w.errorText !== null)?.errorText ?? null;
