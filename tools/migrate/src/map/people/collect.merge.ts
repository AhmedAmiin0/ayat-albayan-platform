// How people rows merge (pure): field fill with visible conflicts, legacy codes, look-alikes.
// Nothing is dropped silently: a value that loses to another row's value is a `conflict` issue
// naming the row that won (review for the teacher — it becomes students.teacher_id — else warn).
import { arabicNameSimilar, normalizeArabic } from '@ab/shared';
import { personName } from '../../keys.ts';
import { issuesFor } from '../../sources/sheets/issues.ts';
import { leadSource, teacherFromText } from '../../sources/values.ts';
import type { RowIssue } from '../../types.ts';
import type { PersonFields, PersonRow } from './rows.ts';
import { latinMatchesArabic } from './translit.ts';

export interface Person extends PersonRow {
  /** Rows merged into this person after the first (registration copies of a «الطلاب» row). */
  merged: number;
  /** Other spellings of the name from rows merged by AB code (reports may use them). */
  aliases: string[];
}

type Field = keyof PersonFields;

/** Same meaning? Teachers by slug, sources by enum, the rest by normalized text. */
function same(field: Field, a: unknown, b: unknown): boolean {
  const s = (v: unknown) => normalizeArabic(String(v)).replace(/[\s,،]+$/, '');
  if (field === 'teacherText')
    return (teacherFromText(s(a)) ?? s(a)) === (teacherFromText(s(b)) ?? s(b));
  if (field === 'source') return (leadSource(s(a)) ?? s(a)) === (leadSource(s(b)) ?? s(b));
  return s(a) === s(b);
}

const ref = (p: { ref: PersonRow['ref'] }) => `${p.ref.source}:${p.ref.tab}:${p.ref.row}`;

/** Merges `row` into `into` (first non-null wins); every disagreement becomes an issue. */
export function mergeInto(into: Person, row: PersonRow): RowIssue[] {
  const issues: RowIssue[] = [];
  const fields = { ...into.fields };
  for (const k of Object.keys(fields) as Field[]) {
    const mine = fields[k];
    const theirs = row.fields[k];
    if (mine === null) (fields as Record<string, unknown>)[k] = theirs;
    else if (theirs !== null && !same(k, mine, theirs))
      issues.push(
        issuesFor(
          'students',
          row.ref,
        )({
          code: 'conflict',
          severity: k === 'teacherText' ? 'review' : 'warn',
          field: k,
          detail: `kept ${ref(into)}`,
        }),
      );
  }
  into.fields = fields;
  const spelling = personName(row.name);
  if (spelling !== personName(into.name) && !into.aliases.some((a) => personName(a) === spelling))
    into.aliases.push(row.name);
  into.active ||= row.active;
  into.legacy ??= row.legacy;
  into.merged++;
  return issues;
}

/** A row joined to a «الطلاب» child by AB code alone, under a name that is not a spelling of it. */
export function codeMergeIssues(master: Person, row: PersonRow): RowIssue[] {
  const [a, b] = [personName(master.name), personName(row.name)];
  if (a === b || arabicNameSimilar(a, b) || latinMatchesArabic(row.name, master.name)) return [];
  return [
    issuesFor(
      'students',
      row.ref,
    )({
      code: 'merge_candidate',
      severity: 'review',
      field: 'legacy_code',
      detail: `merged into ${ref(master)} by AB code although the names differ; split in the app if wrong`,
    }),
  ];
}

/** A legacy code the first holder keeps; any later holder is a likely duplicate for the owner. */
export function claimLegacyCodes(people: Person[]): RowIssue[] {
  const owner = new Map<number, Person>();
  const issues: RowIssue[] = [];
  for (const p of people) {
    if (p.legacy === null) continue;
    const first = owner.get(p.legacy);
    if (!first) {
      owner.set(p.legacy, p);
      continue;
    }
    issues.push(
      issuesFor(
        'students',
        p.ref,
      )({
        code: 'merge_candidate',
        severity: 'review',
        field: 'legacy_code',
        detail: `same AB code as ${ref(first)}; code kept there, both imported`,
      }),
    );
    p.legacy = null;
  }
  return issues;
}

/** Similar names under one phone (A1): flagged, both kept. */
export function mergeCandidates(people: readonly Person[]): RowIssue[] {
  const issues: RowIssue[] = [];
  const byPhone = new Map<string, Person[]>();
  for (const p of people) byPhone.set(p.phone, [...(byPhone.get(p.phone) ?? []), p]);
  for (const group of byPhone.values()) {
    group.forEach((p, i) => {
      const twin = group
        .slice(0, i)
        .find((q) => arabicNameSimilar(personName(q.name), personName(p.name)));
      if (twin)
        issues.push(
          issuesFor(
            'students',
            p.ref,
          )({
            code: 'merge_candidate',
            severity: 'review',
            detail: `similar_to=${twin.ref.source}:${twin.ref.row}`,
          }),
        );
    });
  }
  return issues;
}
