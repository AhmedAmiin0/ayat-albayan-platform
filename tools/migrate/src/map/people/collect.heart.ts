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

interface HeartRow {
  row: SourceRow;
  name: string;
  phone: string;
}

function heartRow(row: SourceRow): HeartRow | null {
  const name = text(row.fields.name);
  const phone = phoneCell(row.fields.phone);
  // Test rows, bad phones and empty names are reported by the subscriptions module (heart.ts).
  if (!name || !phone.ok || testReason({ names: [name], phone: phone.e164 })) return null;
  return { row, name, phone: phone.e164 };
}

function heartMatch(h: HeartRow, people: readonly Person[]) {
  const cands = people.filter((p) => p.phone === h.phone);
  const hits = cands.filter(
    (p) => personName(p.name) === personName(h.name) || latinMatchesArabic(h.name, p.name),
  );
  const [only] = hits.length ? hits : cands;
  const single = hits.length === 1 || cands.length === 1;
  return { cands, hits, child: single ? only : undefined };
}

function createdIssue(h: HeartRow): RowIssue {
  return issuesFor(
    'students',
    h.row.ref,
  )({
    code: 'missing_ref',
    severity: 'review',
    field: 'student',
    detail: 'paying child not in the registry: student created from HEART (Latin name)',
  });
}

function unclearIssue(h: HeartRow, m: { cands: Person[]; hits: Person[] }): RowIssue {
  const among = (m.hits.length ? m.hits : m.cands).map((p) => `«${p.name}»`).join(', ');
  return issuesFor(
    'students',
    h.row.ref,
  )({
    code: 'merge_candidate',
    severity: 'review',
    field: 'student',
    detail: `HEART name fits ${m.hits.length || 'none'} of the phone's children (${among}); not merged`,
  });
}

function placeHeartRow(h: HeartRow, people: Person[]): RowIssue[] {
  const m = heartMatch(h, people);
  if (m.child) return mergeInto(m.child, personOf(h.row, { name: m.child.name, phone: h.phone }));
  if (m.cands.length > 0) return [unclearIssue(h, m)];
  people.push(personOf(h.row, h));
  return [createdIssue(h)];
}

/** Mutates `people`: merges HEART rows into their children or appends new ones. */
export function addHeartPeople(rows: readonly SourceRow[], people: Person[]): RowIssue[] {
  const issues: RowIssue[] = [];
  for (const row of rows) {
    const h = heartRow(row);
    if (h) issues.push(...placeHeartRow(h, people));
  }
  return issues;
}
