import { describe, expect, it } from 'vitest';
import { titleFor } from './nav-title';

const ITEMS = [
  { to: '/teacher', label: 'اليوم' },
  { to: '/teacher/students', label: 'الطلاب' },
  { to: '/teacher/payouts', label: 'كشوف الشهر' },
];

describe('titleFor', () => {
  it('the exact item', () => {
    expect(titleFor('/teacher/students', ITEMS, 'home')).toBe('الطلاب');
  });

  it('the longest prefix wins (a profile under a list)', () => {
    expect(titleFor('/teacher/students/abc', ITEMS, 'home')).toBe('الطلاب');
    expect(titleFor('/teacher', ITEMS, 'home')).toBe('اليوم');
  });

  it('a prefix must end at a path segment', () => {
    expect(titleFor('/teacher/payouts-old', ITEMS, 'home')).toBe('اليوم');
  });

  it('the section home when nothing matches or the path is unknown yet', () => {
    expect(titleFor('/admin', [{ to: '/admin/students', label: 'الطلاب' }], 'لوحة التحكم')).toBe('لوحة التحكم');
    expect(titleFor(undefined, ITEMS, 'home')).toBe('home');
  });
});
