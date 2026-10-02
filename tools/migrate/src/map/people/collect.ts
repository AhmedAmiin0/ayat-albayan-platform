// collectPeople: every people row merged into one Person per child (docs/06 steps 1–5). Pure.
// Sources in order: HUB «الطلاب» (master), «ردود التسجيل», confirmed bookings, then HEART
// «subscription» (collect.heart.ts). Rows merge on the student natural key; a registration or
// booking row carrying the AB code of a «الطلاب» child on the same phone is that child (the code
// is the identity, the master tab's spelling wins). Merge rules and issues: collect.merge.ts.
import type { SourceBundle } from '../../entities/contract.ts';
import { keyId } from '../../keys.ts';
import type { RowIssue } from '../../types.ts';
import { addHeartPeople } from './collect.heart.ts';
import {
  type Person,
  claimLegacyCodes,
  codeMergeIssues,
  mergeCandidates,
  mergeInto,
} from './collect.merge.ts';
import { type PersonRow, type PhoneOnly, isPeopleBooking, personRows } from './rows.ts';

export type { Person } from './collect.merge.ts';

export interface People {
  people: Person[];
  issues: RowIssue[];
  /** Families with a valid phone whose only rows have no child name (guardian only). */
  phoneOnly: PhoneOnly[];
}

function sourceRows(bundle: SourceBundle) {
  const s = (id: string) => bundle.sheets[id] ?? [];
  return [
    ...s('hub_students').map((r) => personRows(r, 'student')),
    ...s('hub_registrations').map((r) => personRows(r, 'registration')),
    ...[...s('hub_bookings'), ...s('book_bookings')]
      .filter(isPeopleBooking)
      .map((r) => personRows(r, 'booking')),
  ];
}

const codeId = (p: { phone: string; legacy: number | null }) => `${p.phone}|${p.legacy}`;

/** The «الطلاب» child this row's AB code names on the same phone, when the spelling differs. */
function byCode(row: PersonRow, masters: ReadonlyMap<string, Person>): Person | undefined {
  if (row.kind === 'student' || row.legacy === null) return undefined;
  const master = masters.get(codeId(row));
  return master && keyId(master.key) !== keyId(row.key) ? master : undefined;
}

export function collectPeople(bundle: SourceBundle): People {
  const byKey = new Map<string, Person>();
  const masters = new Map<string, Person>();
  const issues: RowIssue[] = [];
  const phoneOnly: PhoneOnly[] = [];
  for (const r of sourceRows(bundle)) {
    issues.push(...r.issues);
    if (r.phoneOnly) phoneOnly.push(r.phoneOnly);
    for (const row of r.rows) {
      // Same spelling first (a sibling's own row keeps its child), then the AB code.
      const known = byKey.get(keyId(row.key));
      const master = known ? undefined : byCode(row, masters);
      if (master) issues.push(...codeMergeIssues(master, row));
      const into = known ?? master;
      if (into) {
        issues.push(...mergeInto(into, row));
        byKey.set(keyId(row.key), into); // later rows with this spelling join the same child
        continue;
      }
      const p: Person = { ...row, merged: 0, aliases: [] };
      byKey.set(keyId(row.key), p);
      if (row.kind === 'student' && row.legacy !== null && !masters.has(codeId(row)))
        masters.set(codeId(row), p);
    }
  }
  const people = [...new Set(byKey.values())];
  issues.push(...addHeartPeople(bundle.sheets['heart_subscriptions'] ?? [], people));
  issues.push(...claimLegacyCodes(people), ...mergeCandidates(people));
  const named = new Set(people.map((p) => p.phone));
  return { people, issues, phoneOnly: phoneOnly.filter((o) => !named.has(o.phone)) };
}
