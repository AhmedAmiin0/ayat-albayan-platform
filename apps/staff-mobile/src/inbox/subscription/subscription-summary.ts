import type { ThreadStudentView } from '@ab/shared';
import { counted } from '@ab/core';
import { t, isolate } from '@ab/mobile-kit';
import { childChip, running } from './subscription-words';

// A family's one folded line over the chat (owner 2026-10-29: the messages get the room): pure.

type Chip = NonNullable<ReturnType<typeof childChip>>;

export interface FamilySummary {
  /** Each chip once, by the rows' own rule (packageChip). */
  chips: Chip[];
  count: string;
  /** The children with a package (running, ended, trial…): one line each once opened. */
  packaged: ThreadStudentView[];
  /** Null when every child has a package. */
  noPackage: string | null;
}

export function familySummary(students: readonly ThreadStudentView[]): FamilySummary {
  const s = t.inbox.subscription;
  const chips = new Map<string, Chip>();
  for (const student of students) {
    const chip = childChip(student.subscription);
    if (chip) chips.set(chip.label, chip);
  }
  const total = students.length;
  const on = students.filter(running).length;
  const count =
    on > 0 && on < total
      ? s.subscribedOf.replace('{n}', String(on)).replace('{total}', String(total))
      : counted(s.students, total);
  // Each name isolated: adjacent Latin names never merge into one run read backwards in RTL.
  const bare = students.filter((st) => st.subscription === null).map((st) => isolate(st.name));
  return {
    chips: [...chips.values()],
    count,
    packaged: students.filter((st) => st.subscription !== null),
    noPackage: bare.length > 0 ? s.noPackage.replace('{names}', bare.join(' · ')) : null,
  };
}
