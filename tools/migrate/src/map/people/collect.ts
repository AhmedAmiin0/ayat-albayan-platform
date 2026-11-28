// docs/06 steps 1-5: rows merge on the natural key; an AB code on the same phone is the identity.
import type { SourceBundle } from '../../entities/contract.ts';
import { keyId } from '../../keys.ts';
import { text } from '../../sources/sheets/cells.ts';
import { bookingStatus } from '../../sources/values.schedule.ts';
import type { RowIssue, SourceRow } from '../../types.ts';
import { addHeartPeople } from './collect.heart.ts';
import {
  type Person,
  claimLegacyCodes,
  codeMergeIssues,
  mergeCandidates,
  mergeInto,
} from './collect.merge.ts';
import { personRows } from './rows.ts';
import type { PersonRow, PhoneOnly } from './rows.types.ts';

export type { Person } from './collect.merge.ts';

export interface People {
  people: Person[];
  issues: RowIssue[];
  /** Families with a valid phone whose only rows have no child name (guardian only). */
  phoneOnly: PhoneOnly[];
}

/** Booking rows that make people: only confirmed / subscribed (docs/06 schedule_rules). */
function isPeopleBooking(row: SourceRow): boolean {
  const s = bookingStatus(text(row.fields.status));
  return s === 'confirmed' || s === 'subscribed';
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

const codeId = (p: { phone: string; legacy: number | null }) => `${p.phone}|${String(p.legacy)}`;

/** The master child this row's AB code names on the same phone, when the spelling differs. */
function byCode(row: PersonRow, masters: ReadonlyMap<string, Person>): Person | undefined {
  if (row.kind === 'student' || row.legacy === null) return undefined;
  const master = masters.get(codeId(row));
  return master && keyId(master.key) !== keyId(row.key) ? master : undefined;
}

interface Registry {
  byKey: Map<string, Person>;
  masters: Map<string, Person>;
  issues: RowIssue[];
}

const isNewMaster = (row: PersonRow, masters: ReadonlyMap<string, Person>): boolean =>
  row.kind === 'student' && row.legacy !== null && !masters.has(codeId(row));

function placeRow(row: PersonRow, reg: Registry): void {
  // Same spelling first (a sibling's own row keeps its child), then the AB code.
  const known = reg.byKey.get(keyId(row.key));
  const master = known ? undefined : byCode(row, reg.masters);
  if (master) reg.issues.push(...codeMergeIssues(master, row));
  const into = known ?? master;
  if (into) {
    reg.issues.push(...mergeInto(into, row));
    reg.byKey.set(keyId(row.key), into); // later rows with this spelling join the same child
    return;
  }
  const p: Person = { ...row, merged: 0, aliases: [] };
  reg.byKey.set(keyId(row.key), p);
  if (isNewMaster(row, reg.masters)) reg.masters.set(codeId(row), p);
}

export function collectPeople(bundle: SourceBundle): People {
  const reg: Registry = { byKey: new Map(), masters: new Map(), issues: [] };
  const { issues } = reg;
  const phoneOnly: PhoneOnly[] = [];
  for (const r of sourceRows(bundle)) {
    issues.push(...r.issues);
    if (r.phoneOnly) phoneOnly.push(r.phoneOnly);
    for (const row of r.rows) placeRow(row, reg);
  }
  const people = [...new Set(reg.byKey.values())];
  issues.push(...addHeartPeople(bundle.sheets.heart_subscriptions ?? [], people));
  issues.push(...claimLegacyCodes(people), ...mergeCandidates(people));
  const named = new Set(people.map((p) => p.phone));
  return { people, issues, phoneOnly: phoneOnly.filter((o) => !named.has(o.phone)) };
}
