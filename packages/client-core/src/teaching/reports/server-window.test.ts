import { reportView } from '@ab/shared/testing';
import { describe, expect, it } from 'vitest';
import { AFTER_CLOSE_MS, CLOSE_RETRY_MS, closeRefetchIn, withServerWindow } from './server-window.js';

const NOW = new Date('2026-11-11T10:20:00Z');
const UNTIL = '2026-11-11T10:30:00.000Z';

describe('withServerWindow (review 11-11: the refetch reaches the open form)', () => {
  it('same version: the server window fields win, the local fields stay', () => {
    const local = reportView({ version: 2, can_edit: true, notes: 'محلي' });
    const server = reportView({ version: 2, can_edit: false, sent_at: UNTIL, pdf_status: 'ready' });
    expect(withServerWindow(local, server)).toMatchObject({
      can_edit: false, sent_at: UNTIL, pdf_status: 'ready', notes: 'محلي',
    });
  });

  it('a newer local version (the refetch not back yet): the local copy as is', () => {
    const local = reportView({ version: 3, can_edit: true });
    expect(withServerWindow(local, reportView({ version: 2, can_edit: false }))).toBe(local);
  });
});

describe('closeRefetchIn', () => {
  const open = { can_edit: true, edit_until: UNTIL };
  it('round 0: a second after the close; nothing for a draft or a closed window', () => {
    expect(closeRefetchIn(open, { now: NOW, round: 0 })).toBe(10 * 60_000 + AFTER_CLOSE_MS);
    expect(closeRefetchIn({ can_edit: true, edit_until: null }, { now: NOW, round: 0 })).toBeNull();
    const after = new Date('2026-11-11T10:31:00Z');
    expect(closeRefetchIn(open, { now: after, round: 0 })).toBeNull();
  });

  it('round 1: once more while can_edit outlived the close; then never', () => {
    const after = new Date('2026-11-11T10:30:01Z');
    expect(closeRefetchIn(open, { now: after, round: 1 })).toBe(CLOSE_RETRY_MS);
    expect(closeRefetchIn({ ...open, can_edit: false }, { now: after, round: 1 })).toBeNull();
    expect(closeRefetchIn(open, { now: after, round: 2 })).toBeNull();
  });
});
