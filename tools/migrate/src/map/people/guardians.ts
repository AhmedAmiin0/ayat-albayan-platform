// guardians ← collectPeople grouped by E.164 phone (docs/06 step 1): one guardian per phone,
// including families whose rows name no child (kept, the child is a review row). «اسم ولي الأمر»
// is filled in one row of the export, so the name falls back to the first child's name, else the
// phone (the owner renames in the app); issues are reported once, by the students module.
import type { EntityModule, SourceBundle } from '../../entities/contract.ts';
import { keys } from '../../keys.ts';
import { personTz } from '../../sources/sheets/cells.ts';
import { accepted } from '../../sources/sheets/issues.ts';
import { leadSource } from '../../sources/values.ts';
import type { Mapped } from '../../types.ts';
import { collectPeople } from './collect.ts';
import type { PhoneOnly } from './rows.ts';

/** A people row as the guardian sees it: phone, fields and (unless phone-only) a child name. */
type Row = PhoneOnly & { name?: string };

function first<T>(rows: readonly Row[], pick: (r: Row) => T | null): T | null {
  for (const r of rows) {
    const v = pick(r);
    if (v !== null) return v;
  }
  return null;
}

export function mapGuardians(bundle: SourceBundle): Mapped[] {
  const { people, phoneOnly } = collectPeople(bundle);
  const byPhone = new Map<string, Row[]>();
  for (const r of [...people, ...phoneOnly])
    byPhone.set(r.phone, [...(byPhone.get(r.phone) ?? []), r]);
  return [...byPhone].flatMap(([phone, rows]) => {
    const head = rows[0];
    if (!head) return [];
    const source = leadSource(first(rows, (r) => r.fields.source));
    const declared = first(rows, (r) => r.fields.tzCountry ?? r.fields.country);
    return [
      accepted({
        key: keys.guardian(phone),
        ref: head.ref,
        columns: {
          name: first(rows, (r) => r.fields.guardianName) ?? head.name ?? phone,
          phone_e164: phone,
          country: first(rows, (r) => r.fields.country),
          tz: personTz({ declared, phone }),
          source: source && source !== 'skip' ? source : null,
        },
      }),
    ];
  });
}

export const guardiansModule: EntityModule = {
  entity: 'guardians',
  table: 'guardians',
  adoptBy: 'phone_e164',
  map: mapGuardians,
};
