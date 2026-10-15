import { describe, expect, it } from 'vitest';
import type { StudentStatus } from './enums/index.js';
import { countByKind, CURRENT_STUDENT_STATUSES, isCurrentStudent, kindOfStatusParam, safeHttpUrl, splitByStatus, statusesOfKind, statusParamOfKind, STUDENT_LIST_KINDS } from './student-lists.js';

const list = [
  { id: 'a', status: 'active' as const },
  { id: 'b', status: 'trial' as const },
  { id: 'c', status: 'paused' as const },
  { id: 'd', status: 'active' as const },
  { id: 'e', status: 'pending_renewal' as const },
  { id: 'f', status: 'new' as const },
  { id: 'g', status: 'pending_subscription' as const },
  { id: 'h', status: 'expired' as const },
];

describe('student lists: «مشترك / تجريبي / الكل»', () => {
  it('counts each kind; «الكل» is every student given (paused included)', () => {
    expect(countByKind(list)).toEqual({ active: 2, trial: 3, all: 8 });
    expect(countByKind([])).toEqual({ active: 0, trial: 0, all: 0 });
  });

  it('splits by kind and keeps the order', () => {
    expect(splitByStatus(list, 'active').map((s) => s.id)).toEqual(['a', 'd']);
    expect(splitByStatus(list, 'trial').map((s) => s.id)).toEqual(['b', 'f', 'g']);
    expect(splitByStatus(list, 'all').map((s) => s.id)).toEqual(['a', 'b', 'c', 'd', 'e', 'f', 'g', 'h']);
    expect(splitByStatus(list, 'all')).not.toBe(list);
  });

  it('pending_renewal / expired are not «مشترك» nor «تجريبي»: only under «الكل»', () => {
    const ended = (s: { status: StudentStatus }) => s.status === 'pending_renewal' || s.status === 'expired';
    expect(splitByStatus(list, 'active').some(ended)).toBe(false);
    expect(splitByStatus(list, 'trial').some(ended)).toBe(false);
    expect(splitByStatus(list, 'all').map((s) => s.id)).toEqual(expect.arrayContaining(['e', 'h']));
    expect(kindOfStatusParam('pending_renewal')).toBeNull();
    expect(kindOfStatusParam('expired')).toBeNull();
  });

  it('current students: not subscribed, active and package ended; never paused / churned', () => {
    expect(CURRENT_STUDENT_STATUSES).toEqual(['new', 'trial', 'pending_subscription', 'active', 'pending_renewal', 'expired']);
    const given: (StudentStatus | null | undefined)[] = ['new', 'expired', 'active', 'pending_renewal', 'paused', 'churned', null, undefined];
    expect(given.map(isCurrentStudent)).toEqual([
      true, true, true, true, false, false, false, false,
    ]);
  });

  it('reads the status URL param: none = all, active = it, the three not-subscribed = trial, else none', () => {
    const params = [undefined, '', 'active', 'new,trial,pending_subscription', 'pending_subscription,new,trial', 'trial', 'trial,active', 'paused', 'nonsense'];
    expect(params.map(kindOfStatusParam)).toEqual(['all', 'all', 'active', 'trial', 'trial', null, null, null, 'all']);
  });

  it('statusesOfKind: the API filter of a segment', () => {
    expect(statusesOfKind('trial')).toEqual(['new', 'trial', 'pending_subscription']);
    expect(statusesOfKind('active')).toEqual(['active']);
  });

  it('writes the status URL param back, round trip for every kind', () => {
    expect(STUDENT_LIST_KINDS.map(statusParamOfKind)).toEqual(['active', 'new,trial,pending_subscription', undefined]);
    for (const kind of STUDENT_LIST_KINDS) expect(kindOfStatusParam(statusParamOfKind(kind))).toBe(kind);
  });

  it('safeHttpUrl keeps http(s) only', () => {
    expect(safeHttpUrl(' https://meet.example.org/abc ')).toBe('https://meet.example.org/abc');
    expect(safeHttpUrl('http://example.org')).toBe('http://example.org');
    expect(['javascript:alert(1)', 'ftp://x.org', 'https:// x', 'meet', '', null, undefined].map(safeHttpUrl)).toEqual([null, null, null, null, null, null, null]);
  });
});
