import { describe, expect, it, vi } from 'vitest';
import { isReadOnlyMode, reportFormMode, sendChecked, sentMoment, singleFlight } from './form-mode.js';

const draft = { status: 'draft' as const, can_edit: true };
const sent = { status: 'submitted' as const, can_edit: true };
const closed = { status: 'submitted' as const, can_edit: false };

describe('reportFormMode', () => {
  it('a draft is filled in, whatever «editing» says', () => {
    expect(reportFormMode(draft, false)).toBe('draft');
    expect(reportFormMode(draft, true)).toBe('draft');
  });

  it('a sent report is read-only until «تعديل التقرير», then an edit of the same report', () => {
    expect(reportFormMode(sent, false)).toBe('sent');
    expect(reportFormMode(sent, true)).toBe('editing');
  });

  it('after the edit window it stays closed, even mid-edit', () => {
    expect(reportFormMode(closed, false)).toBe('closed');
    expect(reportFormMode(closed, true)).toBe('closed');
    expect(reportFormMode({ status: 'draft', can_edit: false }, false)).toBe('closed');
  });

  it('read-only after a send and after the window; editable as a draft or an edit', () => {
    expect(isReadOnlyMode('sent')).toBe(true);
    expect(isReadOnlyMode('closed')).toBe(true);
    expect(isReadOnlyMode('draft')).toBe(false);
    expect(isReadOnlyMode('editing')).toBe(false);
  });
});

describe('sentMoment', () => {
  const at = '2026-11-06T10:00:00Z';
  it('null while a draft', () => {
    expect(sentMoment({ status: 'draft', submitted_at: null, edited_at: null })).toBeNull();
  });
  it('the first send, then the last edit', () => {
    expect(sentMoment({ status: 'submitted', submitted_at: at, edited_at: null })).toEqual({ kind: 'sent', at });
    const edited = '2026-11-06T11:00:00Z';
    expect(sentMoment({ status: 'submitted', submitted_at: at, edited_at: edited })).toEqual({
      kind: 'edited',
      at: edited,
    });
  });
});

describe('singleFlight', () => {
  it('a double tap runs the send once; after it settles the next tap runs again', () => {
    let settle: () => void = () => undefined;
    const run = vi.fn((done: () => void) => {
      settle = done;
    });
    const guard = singleFlight();
    expect(guard(run)).toBe(true);
    expect(guard(run)).toBe(false);
    expect(run).toHaveBeenCalledTimes(1);
    settle();
    expect(guard(run)).toBe(true);
    expect(run).toHaveBeenCalledTimes(2);
  });
});

describe('singleFlight: a send that throws', () => {
  it('frees the guard, so the teacher can send again', () => {
    const guard = singleFlight();
    expect(() => guard(() => { throw new Error('boom'); })).toThrow('boom');
    expect(guard(() => undefined)).toBe(true);
  });
});

describe('sendChecked', () => {
  it('a refused check shows the problem, sends nothing and frees the guard', () => {
    const guard = singleFlight();
    const show = vi.fn();
    const request = vi.fn();
    sendChecked(guard, { check: () => 'missing_attendance', show, request });
    expect(show).toHaveBeenCalledWith('missing_attendance');
    expect(request).not.toHaveBeenCalled();
    expect(sendChecked(guard, { check: () => null, show, request })).toBe(true);
    expect(request).toHaveBeenCalledTimes(1);
  });

  it('a passed check clears the problem; a second send waits for the first to settle', () => {
    const guard = singleFlight();
    const show = vi.fn();
    const request = vi.fn();
    const send = { check: () => null, show, request };
    expect(sendChecked(guard, send)).toBe(true);
    expect(sendChecked(guard, send)).toBe(false);
    expect(show).toHaveBeenLastCalledWith(null);
    expect(request).toHaveBeenCalledTimes(1);
  });
});
