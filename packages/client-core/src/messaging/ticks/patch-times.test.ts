import type { MessageStatus } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import {
  createPatchTimes,
  foldListRows,
  foldMessages,
  foldStatus,
  type ReadFold,
} from './patch-times.js';

const PHONE = '+966500000001';
const foldOf = (
  times: ReturnType<typeof createPatchTimes>,
  since: number,
  held: Record<string, MessageStatus>,
): ReadFold => ({ times, since, held: (id) => held[id] });

describe('createPatchTimes: the patch-time rule (docs/44 K1)', () => {
  it('a read that started before the patch sees it as patched after; a later read does not', () => {
    const times = createPatchTimes();
    const before = times.start();
    times.mark(['a']);
    const after = times.start();
    expect(times.patchedAfter('a', before)).toBe(true);
    expect(times.patchedAfter('a', after)).toBe(false);
    expect(times.patchedAfter('b', before)).toBe(false);
  });

  it('takes a one-shot iterator (a Map of the event rows) whole', () => {
    const times = createPatchTimes();
    times.mark(
      new Map([
        ['a', 1],
        ['b', 2],
      ]).keys(),
    );
    expect([times.patchedAfter('a', 0), times.patchedAfter('b', 0)]).toEqual([true, true]);
  });

  it('a second patch of the same id moves its time on', () => {
    const times = createPatchTimes();
    times.mark(['a']);
    const between = times.start();
    times.mark(['a']);
    expect(times.patchedAfter('a', between)).toBe(true);
  });

  it('keeps only the newest ids past the cap', () => {
    const times = createPatchTimes(2);
    times.mark(['a', 'b']);
    times.mark(['c']);
    expect(['a', 'b', 'c'].map((id) => times.patchedAfter(id, 0))).toEqual([false, true, true]);
  });
});

describe('foldStatus: the held (patched) status re-applied over an older read', () => {
  it.each<[MessageStatus, MessageStatus, MessageStatus]>([
    ['sent', 'delivered', 'delivered'],
    ['read', 'delivered', 'read'],
    ['sent', 'failed', 'failed'],
    ['failed', 'queued', 'queued'],
    ['failed', 'sent_manually', 'sent_manually'],
  ])('read %s, patched %s before it landed → %s', (read, held, shown) => {
    const times = createPatchTimes();
    const since = times.start();
    times.mark(['a']);
    expect(foldStatus(foldOf(times, since, { a: held }), 'a', read)).toBe(shown);
  });

  it('a read started after the patch wins, even a re-queue under ✓✓', () => {
    const times = createPatchTimes();
    times.mark(['a']);
    const since = times.start();
    expect(foldStatus(foldOf(times, since, { a: 'delivered' }), 'a', 'queued')).toBe('queued');
  });

  it('nothing held: the read', () => {
    const times = createPatchTimes();
    const since = times.start();
    times.mark(['a']);
    expect(foldStatus(foldOf(times, since, {}), 'a', 'sent')).toBe('sent');
  });
});

describe('foldMessages / foldListRows', () => {
  it('move only patched ids, keep the read fields, same array when nothing moves', () => {
    const times = createPatchTimes();
    const since = times.start();
    times.mark(['a']);
    const fold = foldOf(times, since, { a: 'read', b: 'read' });
    const rows = [
      { id: 'a', status: 'sent' as const, wa: 'w1' },
      { id: 'b', status: 'sent' as const, wa: 'w2' },
    ];
    expect(foldMessages(fold, rows)).toEqual([{ id: 'a', status: 'read', wa: 'w1' }, rows[1]]);
    const later = foldOf(times, times.start(), { a: 'read' });
    expect(foldMessages(later, rows)).toBe(rows);
    const list = [{ phone_e164: PHONE, last_message_id: 'a', last_status: 'sent' as const }];
    expect(foldListRows(fold, list)[0]?.last_status).toBe('read');
    expect(foldListRows(later, list)).toBe(list);
  });
});
