// HEART «subscription» (paying families, Latin names) as a student source (docs/06). Pure.
// The child is found on the guardian phone by consonant skeleton (or the only child there) and
// merged; a phone with no child yet gets a new student; several possible children go to review.
import { keys, personName } from '../../keys.ts';
import { phoneCell, text } from '../../sources/sheets/cells.ts';
import { issuesFor } from '../../sources/sheets/issues.ts';
import { testReason } from '../../sources/sheets/test-rows.ts';
import type { RowIssue, SourceRow } from '../../types.ts';
import { type Person, mergeInto } from './collect.merge.ts';
import { fieldsOf } from './rows.ts';
import { latinMatchesArabic } from './translit.ts';

function personOf(row: SourceRow, o: { name: string; phone: string }): Person {
  return {
    ref: row.ref,
    key: keys.student({ guardianPhone: o.phone, name: o.name }),
    kind: 'heart',
    phone: o.phone,
    name: o.name,
    legacy: null,
    claims: ['heart_row'],
    fields: fieldsOf(row.fields, 'heart'),
    merged: 0,
    aliases: [],
  };
}

/** Mutates `people`: merges HEART rows into their children or appends new ones. */
export function addHeartPeople(rows: readonly SourceRow[], people: Person[]): RowIssue[] {
  const issues: RowIssue[] = [];
  for (const row of rows) {
    const name = text(row.fields['name']);
    const phone = phoneCell(row.fields['phone']);
    // Test rows, bad phones and empty names are reported by the subscriptions module (heart.ts).
    if (!name || !phone.ok || testReason({ names: [name], phone: phone.e164 })) continue;
    const issue = issuesFor('students', row.ref);
    const cands = people.filter((p) => p.phone === phone.e164);
    const hits = cands.filter(
      (p) => personName(p.name) === personName(name) || latinMatchesArabic(name, p.name),
    );
    const [only] = hits.length ? hits : cands;
    if (only && (hits.length === 1 || cands.length === 1)) {
      issues.push(...mergeInto(only, personOf(row, { name: only.name, phone: phone.e164 })));
    } else if (cands.length === 0) {
      people.push(personOf(row, { name, phone: phone.e164 }));
      issues.push(
        issue({
          code: 'missing_ref',
          severity: 'review',
          field: 'student',
          detail: 'paying child not in the registry: student created from HEART (Latin name)',
        }),
      );
    } else {
      const among = (hits.length ? hits : cands).map((p) => `«${p.name}»`).join(', ');
      issues.push(
        issue({
          code: 'merge_candidate',
          severity: 'review',
          field: 'student',
          detail: `HEART name fits ${hits.length || 'none'} of the phone's children (${among}); not merged`,
        }),
      );
    }
  }
  return issues;
}
