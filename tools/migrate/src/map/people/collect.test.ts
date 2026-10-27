// collectPeople on invented rows: A1 merges, A4 splits, A6/A8 rejects, A9 fills, legacy codes.
import { describe, expect, it } from 'vitest';
import { bundleOf, row, studentRow } from '../../sources/sheets/fixtures.ts';
import { collectPeople } from './collect.ts';

const reg = (fields: Record<string, string | number | null>) =>
  row(
    { student_name: 'ليان', phone: '966551110001', legacy_code: null, ...fields },
    { tab: 'ردود التسجيل' },
  );

describe('collectPeople', () => {
  it('merges a registration into its «الطلاب» row and fills empty fields (A9)', () => {
    const p = collectPeople(
      bundleOf({
        hub_students: [studentRow({ legacy_code: 'AB-0007', age: null })],
        hub_registrations: [
          reg({ student_name: 'ليان ', age: 9, source: null, source_v2: 'واتساب' }),
        ],
      }),
    );
    expect(p.people).toHaveLength(1);
    expect(p.people[0]).toMatchObject({
      legacy: 7,
      merged: 1,
      fields: { age: 9, source: 'واتساب' },
    });
    expect(p.issues).toEqual([]);
  });

  it('merges exact normalized spellings silently, flags similar names (A1)', () => {
    const p = collectPeople(
      bundleOf({
        hub_students: [
          studentRow({ student_name: 'هالة' }),
          studentRow({ student_name: 'هاله' }),
          studentRow({ student_name: 'الأستاذة : هالة' }),
          studentRow({ student_name: 'هالة محمد' }),
        ],
      }),
    );
    expect(p.people.map((x) => x.name)).toEqual(['هالة', 'هالة محمد']);
    expect(p.issues).toMatchObject([{ code: 'merge_candidate', severity: 'review' }]);
  });

  it('splits siblings into students; the legacy code stays with the first (A4)', () => {
    const p = collectPeople(
      bundleOf({
        hub_students: [studentRow({ student_name: 'ريم وجنى', legacy_code: 'AB-0004' })],
      }),
    );
    expect(p.people.map((x) => [x.name, x.legacy])).toEqual([
      ['ريم', 4],
      ['جنى', null],
    ]);
    expect(p.issues).toMatchObject([
      { code: 'sibling_split', severity: 'review', detail: 'children=2' },
    ]);
  });

  it('keeps a shared legacy code on the first student and asks the owner (A1)', () => {
    const p = collectPeople(
      bundleOf({
        hub_students: [
          studentRow({ student_name: 'ريم', legacy_code: 'AB-0009' }),
          studentRow({ student_name: 'سلمى', legacy_code: 'AB-0009' }),
        ],
      }),
    );
    expect(p.people.map((x) => x.legacy)).toEqual([9, null]);
    expect(p.issues).toMatchObject([
      { code: 'merge_candidate', severity: 'review', field: 'legacy_code' },
    ]);
  });

  it('rejects test rows, dummy phones, bad phones and empty names (A6, A8)', () => {
    const p = collectPeople(
      bundleOf({
        hub_students: [
          studentRow({ student_name: 'Minus ipsum est rep' }),
          studentRow({ student_name: 'نمنم' }),
          studentRow({ phone: '966500000000' }),
          studentRow({ gender: 'Sit quam veniam ips' }),
          studentRow({ phone: '@SomeHandle1' }),
          studentRow({ phone: '1311110001' }),
          studentRow({ student_name: null }),
        ],
      }),
    );
    expect(p.people).toEqual([]);
    expect(p.issues.map((i) => [i.code, i.detail ?? i.field])).toEqual([
      ['test_row', 'lorem'],
      ['test_row', 'test_name'],
      ['test_row', 'dummy_phone'],
      ['test_row', 'lorem'],
      ['bad_phone', 'not_a_number'],
      ['bad_phone', 'missing_country_code'],
      ['missing_field', 'child name missing: guardian imported, add the child'],
    ]);
  });

  it('takes people from confirmed/subscribed bookings only, code from the notes', () => {
    const b = (status: string, name: string) =>
      row({
        name,
        phone: '966551110009',
        status,
        notes: 'منتظمة · AB-0031 · 45 دقيقة',
        teacher: 'Hend',
      });
    const p = collectPeople(
      bundleOf({
        book_bookings: [b('مشترك', 'دانة'), b('يحتاج تأكيد', 'سلمى'), b('مبدئي', 'منى')],
      }),
    );
    expect(p.people).toMatchObject([{ name: 'دانة', legacy: 31, claims: ['subscribed_booking'] }]);
  });

  it('warns on teacher text that is no teacher (A3)', () => {
    const p = collectPeople(bundleOf({ hub_students: [studentRow({ teacher: 'Qui ratione' })] }));
    // Lorem in the teacher cell makes it a test row; a plain unknown name is a warning.
    expect(p.issues[0]?.code).toBe('test_row');
    const q = collectPeople(bundleOf({ hub_students: [studentRow({ teacher: 'الفيوم' })] }));
    expect(q.issues).toMatchObject([{ code: 'unknown_teacher', detail: 'not_a_teacher' }]);
    const r = collectPeople(bundleOf({ hub_students: [studentRow({ teacher: 'Ahmed' })] }));
    expect(r.issues).toMatchObject([
      { code: 'unknown_teacher', severity: 'warn', detail: 'unknown_text' },
    ]);
  });
});
