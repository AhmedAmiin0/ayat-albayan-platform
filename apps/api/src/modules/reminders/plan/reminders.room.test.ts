import { describe, expect, it } from 'vitest';
import { hashLinkToken, looksLikeLinkToken } from '../../classroom/join/join-link.token';
import { callsOf, chainDb } from '../chain-db.fake';
import type { RoomCandidate } from './reminders.links';
import { roomLinkRows } from './reminders.room';

// The family's classroom link minted by the reminders job (settings.meeting_link_auto). Invented data.

const NOW = new Date('2026-10-04T13:10:00Z');
const candidate = (studentId: string): RoomCandidate => ({
  lessonId: 'lesson-1',
  studentId,
  name: 'سهيلة',
  phone: '+966500000101',
  guardianId: 'g-riyadh',
  dedupKey: `lesson_reminder:lesson-1:${studentId}:room`,
  expiresAt: '2026-10-04T16:45:00.000Z',
});
const L = 'lesson_join_links';

describe('roomLinkRows', () => {
  it('nothing to send: no database call', async () => {
    const { db, log } = chainDb();
    expect(await roomLinkRows(db, [], NOW)).toEqual([]);
    expect(log).toEqual([]);
  });

  it('a key already in messages mints nothing (no rows pile up across the 5-minute ticks)', async () => {
    const queued = { data: [{ dedup_key: candidate('s-1').dedupKey }] };
    const { db, log } = chainDb({ messages: [queued], [L]: [{ data: { id: 'link-9' } }, { data: null }] });
    const rows = await roomLinkRows(db, [candidate('s-1'), candidate('s-2')], NOW);
    expect(rows.map((r) => r.dedup_key)).toEqual(['lesson_reminder:lesson-1:s-2:room']);
    expect(callsOf(log, 'messages')).toEqual([
      ['select', ['dedup_key']],
      ['in', ['dedup_key', ['lesson_reminder:lesson-1:s-1:room', 'lesson_reminder:lesson-1:s-2:room']]],
    ]);
    expect(log.filter((l) => l.table === L)).toHaveLength(2);
  });

  it('the (lesson, student) row is updated, not duplicated, and holds the hash of the button token', async () => {
    const { db, log } = chainDb({ [L]: [{ data: { id: 'link-9' } }, { data: null }] });
    const [row] = await roomLinkRows(db, [candidate('s-1')], NOW);
    const token = row?.template_params.button ?? '';
    expect(looksLikeLinkToken(token)).toBe(true);
    expect(callsOf(log, L, 0)).toContainEqual(['match', [{ lesson_id: 'lesson-1', student_id: 's-1' }]]);
    expect(callsOf(log, L, 1)).toEqual([
      ['update', [{ token_hash: hashLinkToken(token), expires_at: '2026-10-04T16:45:00.000Z' }]],
      ['eq', ['id', 'link-9']],
    ]);
    expect(row).toMatchObject({
      template_key: 'lesson_join_link',
      template_params: { '1': 'سهيلة', button: token },
      phone_e164: '+966500000101',
      guardian_id: 'g-riyadh',
      lesson_id: 'lesson-1',
      scheduled_for: NOW.toISOString(),
      expires_at: '2026-10-04T16:45:00.000Z',
    });
  });

  it('no row yet: one is created for the student', async () => {
    const { db, log } = chainDb({ [L]: [{ data: null }, { data: null }] });
    const [row] = await roomLinkRows(db, [candidate('s-2')], NOW);
    const insert = callsOf(log, L, 1)[0];
    expect(insert).toEqual([
      'insert',
      [{ token_hash: hashLinkToken(row?.template_params.button ?? ''), expires_at: '2026-10-04T16:45:00.000Z', lesson_id: 'lesson-1', student_id: 's-2' }],
    ]);
  });

  it('a student-link join created the row meanwhile: that row takes the token', async () => {
    const duplicate = { message: 'duplicate key', code: '23505' };
    const { db, log } = chainDb({ [L]: [{ data: null }, { data: null, error: duplicate }, { data: { id: 'link-7' } }, { data: null }] });
    expect(await roomLinkRows(db, [candidate('s-3')], NOW)).toHaveLength(1);
    expect(callsOf(log, L, 3)).toContainEqual(['eq', ['id', 'link-7']]);
  });

  it('any other write error is thrown (the job logs it, the next tick tries again)', async () => {
    const { db } = chainDb({ [L]: [{ data: null }, { data: null, error: { message: 'boom' } }] });
    await expect(roomLinkRows(db, [candidate('s-1')], NOW)).rejects.toBeTruthy();
  });
});
