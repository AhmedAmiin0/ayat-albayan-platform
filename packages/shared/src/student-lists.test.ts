import { describe, expect, it } from 'vitest';
import { countByKind, kindOfStatusParam, safeHttpUrl, splitByStatus, statusParamOfKind, STUDENT_LIST_KINDS } from './student-lists.js';

const list = [
  { id: 'a', status: 'active' as const },
  { id: 'b', status: 'trial' as const },
  { id: 'c', status: 'paused' as const },
  { id: 'd', status: 'active' as const },
];

describe('student lists: «مشترك / تجريبي / الكل»', () => {
  it('counts each kind; «الكل» is every student given (paused included)', () => {
    expect(countByKind(list)).toEqual({ active: 2, trial: 1, all: 4 });
    expect(countByKind([])).toEqual({ active: 0, trial: 0, all: 0 });
  });

  it('splits by kind and keeps the order', () => {
    expect(splitByStatus(list, 'active').map((s) => s.id)).toEqual(['a', 'd']);
    expect(splitByStatus(list, 'trial').map((s) => s.id)).toEqual(['b']);
    expect(splitByStatus(list, 'all').map((s) => s.id)).toEqual(['a', 'b', 'c', 'd']);
    expect(splitByStatus(list, 'all')).not.toBe(list);
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
