import type { PortalHome, PortalStudent } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { familyPick, picksChild } from './family-pick';

const kid = (id: string): PortalStudent => ({
  id, code: `AB-${id}`, name: id, tz: 'Asia/Riyadh', contact_is_self: false,
});
const a = kid('a');
const b = kid('b');
const me = (kind: PortalHome['kind'], students: PortalStudent[]): PortalHome => ({
  kind, students, renew_url: null,
});

describe('familyPick', () => {
  it('waits for /portal/me; no students is the empty note', () => {
    expect(familyPick(undefined, 'a', true)).toEqual({ state: 'loading' });
    expect(familyPick(me('guardian', []), null, true)).toEqual({ state: 'empty' });
    expect(familyPick(me('student', []), null, false)).toEqual({ state: 'empty' });
  });

  it('a student is always their own, never a picker, whatever is saved', () => {
    expect(familyPick(me('student', [a]), 'b', false)).toEqual({ state: 'one', student: a });
  });

  it('a guardian of one child is that child, without waiting on the phone', () => {
    expect(familyPick(me('guardian', [a]), null, false)).toEqual({ state: 'one', student: a });
  });

  it('two or more children: loading until the saved pick is read, then it or the picker', () => {
    const two = me('guardian', [a, b]);
    expect(familyPick(two, 'b', false)).toEqual({ state: 'loading' });
    expect(familyPick(two, 'b', true)).toEqual({ state: 'one', student: b });
    expect(familyPick(two, null, true)).toEqual({ state: 'choose' });
    // A child no longer linked to the login is no pick.
    expect(familyPick(two, 'gone', true)).toEqual({ state: 'choose' });
  });
});

describe('picksChild', () => {
  it('only a guardian of two or more children picks', () => {
    expect(picksChild(me('guardian', [a, b]))).toBe(true);
    expect(picksChild(me('guardian', [a]))).toBe(false);
    expect(picksChild(me('student', [a, b]))).toBe(false);
  });
});
