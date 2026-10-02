// findStudent + Latin skeletons on invented students.
import { describe, expect, it } from 'vitest';
import { keys } from '../../keys.ts';
import type { Desired } from '../../plan/resolve.ts';
import { findStudent, studentIndex } from './match.ts';
import { arabicSkeleton, latinMatchesArabic, latinSkeleton } from './translit.ts';

const s = (phone: string, name: string, teacher?: string): Desired => ({
  key: keys.student({ guardianPhone: phone, name }),
  record: {
    columns: { name },
    refs: {
      guardian_id: keys.guardian(phone),
      ...(teacher ? { teacher_id: keys.teacher(teacher) } : {}),
    },
  },
  hash: '',
  ref: { source: 'HUB', tab: 't', row: 2 },
});
const A = '+966551110001';
const B = '+966551110002';
const ix = studentIndex([
  s(A, 'ريم'),
  s(A, 'جنى'),
  s(B, 'هالة محمد', 'hend'),
  s('+966551110003', 'هالة', 'abrar'),
]);
const name = (r: ReturnType<typeof findStudent>) =>
  r.ok ? r.student.record.columns['name'] : r.reason;

describe('findStudent', () => {
  it('by phone: exact, then similar, else one child decides only for Latin or no name', () => {
    expect(name(findStudent(ix, { phone: A, name: 'ريم' }))).toBe('ريم');
    expect(name(findStudent(ix, { phone: B, name: 'هاله' }))).toBe('هالة محمد');
    expect(name(findStudent(ix, { phone: B, name: 'Hala' }))).toBe('هالة محمد');
    expect(name(findStudent(ix, { phone: B }))).toBe('هالة محمد');
    expect(name(findStudent(ix, { phone: B, name: 'سلمى' }))).toBe('not_found');
    expect(name(findStudent(ix, { phone: A }))).toBe('ambiguous');
    expect(name(findStudent(ix, { phone: '+966551119999', name: 'ريم' }))).toBe('not_found');
  });

  it('tells Latin-named siblings apart by consonant skeleton (HEART)', () => {
    expect(name(findStudent(ix, { phone: A, name: 'Reem' }))).toBe('ريم');
    expect(name(findStudent(ix, { phone: A, name: 'Jana' }))).toBe('جنى');
    expect(name(findStudent(ix, { phone: A, name: 'Salma' }))).toBe('ambiguous');
  });

  it('without a phone (A2 old reports): teacher first, then everyone; ties are ambiguous', () => {
    expect(name(findStudent(ix, { name: 'هالة', teacher: 'hend' }))).toBe('هالة محمد');
    expect(name(findStudent(ix, { name: 'هالة', teacher: 'abrar' }))).toBe('هالة');
    expect(name(findStudent(ix, { name: 'هالة' }))).toBe('هالة');
    expect(name(findStudent(ix, { name: 'هالة', teacher: 'rabia' }))).toBe('هالة');
    expect(
      name(findStudent(studentIndex([s(A, 'ريم أحمد'), s(B, 'ريم علي')]), { name: 'ريم' })),
    ).toBe('ambiguous');
    expect(name(findStudent(ix, {}))).toBe('not_found');
  });
});

describe('translit skeletons', () => {
  it.each([
    ['Reem', 'ريم'],
    ['Jana', 'جنى'],
    ['Tala', 'تالا'],
    ['Sabah', 'صباح'],
    ['Sarah', 'سارة'],
    ['Shahd', 'شهد'],
    ['Taha', 'طه'],
    ['Gamila', 'جميلة'],
  ])('%s ~ %s', (latin, arabic) => {
    expect(latinMatchesArabic(latin, arabic)).toBe(true);
  });

  it('keeps different names apart and ignores empty input', () => {
    expect(latinMatchesArabic('Reem', 'جنى')).toBe(false);
    expect(latinMatchesArabic('', 'جنى')).toBe(false);
    expect(latinSkeleton('Mohammed Ali')).toBe('mhmd');
    expect(arabicSkeleton('محمد سامي')).toBe('mhmd');
  });
});
