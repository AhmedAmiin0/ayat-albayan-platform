// collectPeople merge rules on invented rows: AB code identity, visible conflicts, HEART, phone-only.
import { describe, expect, it } from 'vitest';
import { bundleOf, row, studentRow } from '../../sources/sheets/fixtures.ts';
import { collectPeople } from './collect.ts';
import { mapGuardians } from './guardians.ts';

const reg = (fields: Record<string, string | number | null>) =>
  row(
    { student_name: 'ليان', phone: '966551110001', legacy_code: null, ...fields },
    { tab: 'ردود التسجيل' },
  );
const heart = (fields: Record<string, string | number | null>) =>
  row(
    { phone: '966551110001', teacher: 'Abrar', ...fields },
    { source: 'HEART', tab: 'subscription' },
  );

describe('collectPeople: the AB code is the identity', () => {
  it('merges a registration typed with another spelling into the «الطلاب» child with its code', () => {
    const p = collectPeople(
      bundleOf({
        hub_students: [studentRow({ student_name: 'ليان', legacy_code: 'AB-0042' })],
        hub_registrations: [
          reg({ student_name: 'Layan', legacy_code: 'AB-0042', age: 8 }),
          reg({ student_name: 'Layan' }), // a later row with the same other spelling joins too
        ],
      }),
    );
    expect(p.people.map((x) => [x.name, x.legacy, x.merged, x.fields.age, x.aliases])).toEqual([
      ['ليان', 42, 2, 8, ['Layan']],
    ]);
  });

  it('never merges by code across phones, and keeps a sibling with its own row', () => {
    const p = collectPeople(
      bundleOf({
        hub_students: [
          studentRow({ legacy_code: 'AB-0042' }),
          studentRow({ student_name: 'ريم', legacy_code: 'AB-0042' }),
        ],
        hub_registrations: [
          reg({ student_name: 'ريم', legacy_code: 'AB-0042' }),
          reg({ student_name: 'سلمى', phone: '966551110002', legacy_code: 'AB-0042' }),
        ],
      }),
    );
    expect(p.people.map((x) => [x.name, x.merged])).toEqual([
      ['ليان', 0],
      ['ريم', 1],
      ['سلمى', 0],
    ]);
    expect(p.issues.map((i) => [i.code, i.field])).toEqual([
      ['merge_candidate', 'legacy_code'],
      ['merge_candidate', 'legacy_code'],
    ]);
  });

  it('flags a code merge whose names are not spellings of each other', () => {
    const p = collectPeople(
      bundleOf({
        hub_students: [studentRow({ legacy_code: 'AB-0042' })],
        hub_registrations: [reg({ student_name: 'سلمى', legacy_code: 'AB-0042' })],
      }),
    );
    expect(p.people).toHaveLength(1);
    expect(p.issues).toMatchObject([{ code: 'merge_candidate', severity: 'review' }]);
    expect(p.issues[0]?.detail).toContain('by AB code although the names differ');
  });
});

describe('collectPeople: no value is dropped silently', () => {
  it('reports a different teacher for review and other fields as warnings, naming the winner', () => {
    const p = collectPeople(
      bundleOf({
        hub_students: [studentRow({ teacher: 'abrar', age: 9 }, { row: 5 })],
        hub_registrations: [reg({ teacher: 'hend', age: 10, source: 'واتساب' })],
      }),
    );
    expect(p.people[0]?.fields).toMatchObject({ teacherText: 'abrar', age: 9, source: 'واتساب' });
    expect(p.issues.map((i) => [i.code, i.severity, i.field])).toEqual([
      ['conflict', 'warn', 'age'],
      ['conflict', 'review', 'teacherText'],
    ]);
    expect(p.issues[0]?.detail).toBe('kept HUB:الطلاب:5');
  });

  it('treats spellings of one teacher or source as the same value', () => {
    const p = collectPeople(
      bundleOf({
        hub_students: [studentRow({ teacher: 'abrar', source: 'إعلان فيسبوك,' })],
        hub_registrations: [reg({ teacher: 'Abrar', source: 'اعلان فيسبوك' })],
      }),
    );
    expect(p.issues).toEqual([]);
  });
});

describe('collectPeople: HEART «subscription» is a student source', () => {
  it('marks the matching child active, by skeleton among siblings', () => {
    const p = collectPeople(
      bundleOf({
        hub_students: [studentRow({ student_name: 'هالة' }), studentRow({ student_name: 'تالا' })],
        heart_subscriptions: [heart({ name: 'Tala' })],
      }),
    );
    expect(p.people.map((x) => [x.name, x.active])).toEqual([
      ['هالة', false],
      ['تالا', true],
    ]);
  });

  it('creates a paying child the registry lacks, and sends unclear siblings to review', () => {
    const p = collectPeople(
      bundleOf({
        hub_students: [studentRow({ student_name: 'هالة' }), studentRow({ student_name: 'تالا' })],
        heart_subscriptions: [
          heart({ name: 'Dana', phone: '966551110007' }),
          heart({ name: 'Lama' }),
        ],
      }),
    );
    expect(p.people.map((x) => [x.name, x.kind])).toContainEqual(['Dana', 'heart']);
    expect(p.issues.map((i) => [i.code, i.severity])).toEqual([
      ['missing_ref', 'review'],
      ['merge_candidate', 'review'],
    ]);
  });
});

describe('families without a child name', () => {
  it('keep their guardian; the nameless row is a review, not a reject', () => {
    const b = bundleOf({
      hub_registrations: [reg({ student_name: null, guardian_name: 'أم ليان' })],
    });
    const p = collectPeople(b);
    expect(p.people).toEqual([]);
    expect(p.issues).toMatchObject([{ code: 'missing_field', severity: 'review' }]);
    const [g] = mapGuardians(b);
    expect(g?.ok && g.value.columns).toMatchObject({
      name: 'أم ليان',
      phone_e164: '+966551110001',
    });
  });
});
