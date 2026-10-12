import { describe, expect, it } from 'vitest';
import type { StudentStatus } from './enums/index.js';
import { countByKind, CURRENT_STUDENT_STATUSES, isCurrentStudent, kindOfStatusParam, safeHttpUrl, splitByStatus, statusParamOfKind, STUDENT_LIST_KINDS } from './student-lists.js';

const list = [
  { id: 'a', status: 'active' as const },
  { id: 'b', status: 'trial' as const },
  { id: 'c', status: 'paused' as const },
  { id: 'd', status: 'active' as const },
  { id: 'e', status: 'pending_renewal' as const },
];

describe('student lists: «مشترك / تجريبي / الكل»', () => {
  it('counts each kind; «الكل» is every student given (paused included)', () => {
    expect(countByKind(list)).toEqual({ active: 2, trial: 1, all: 5 });
    expect(countByKind([])).toEqual({ active: 0, trial: 0, all: 0 });
  });

  it('splits by kind and keeps the order', () => {
    expect(splitByStatus(list, 'active').map((s) => s.id)).toEqual(['a', 'd']);
    expect(splitByStatus(list, 'trial').map((s) => s.id)).toEqual(['b']);
    expect(splitByStatus(list, 'all').map((s) => s.id)).toEqual(['a', 'b', 'c', 'd', 'e']);
    expect(splitByStatus(list, 'all')).not.toBe(list);
  });

  it('pending_renewal is not «مشترك» nor «تجريبي»: only under «الكل»', () => {
    expect(splitByStatus(list, 'active').some((s) => s.status === 'pending_renewal')).toBe(false);
    expect(splitByStatus(list, 'trial').some((s) => s.status === 'pending_renewal')).toBe(false);
    expect(splitByStatus(list, 'all').map((s) => s.id)).toContain('e');
    expect(kindOfStatusParam('pending_renewal')).toBeNull();
  });

  it('current students: trial, active and pending_renewal; never paused / churned', () => {
    expect(CURRENT_STUDENT_STATUSES).toEqual(['trial', 'active', 'pending_renewal']);
    const given: (StudentStatus | null | undefined)[] = ['trial', 'active', 'pending_renewal', 'paused', 'churned', null, undefined];
    expect(given.map(isCurrentStudent)).toEqual([
      true, true, true, false, false, false, false,
    ]);
  });

  it('reads the status URL param: none = all, one of active / trial = it, else none selected', () => {
    expect([undefined, '', 'active', 'trial', 'trial,active', 'paused', 'nonsense'].map(kindOfStatusParam)).toEqual([
      'all', 'all', 'active', 'trial', null, null, 'all',
    ]);
  });

  it('writes the status URL param back, round trip for every kind', () => {
    expect(STUDENT_LIST_KINDS.map(statusParamOfKind)).toEqual(['active', 'trial', undefined]);
    for (const kind of STUDENT_LIST_KINDS) expect(kindOfStatusParam(statusParamOfKind(kind))).toBe(kind);
  });

  it('safeHttpUrl keeps http(s) only', () => {
    expect(safeHttpUrl(' https://meet.example.org/abc ')).toBe('https://meet.example.org/abc');
    expect(safeHttpUrl('http://example.org')).toBe('http://example.org');
    expect(['javascript:alert(1)', 'ftp://x.org', 'https:// x', 'meet', '', null, undefined].map(safeHttpUrl)).toEqual([null, null, null, null, null, null, null]);
  });
});
