import { describe, expect, it } from 'vitest';
import { callsOf, chainDb } from './chain-db.fake';
import { queueMessages, RemindersQueries } from './reminders.queries';

describe('RemindersQueries', () => {
  it('upcoming: open lessons in (now, until], students flattened from lesson_students', async () => {
    const lesson = {
      id: 'l1',
      starts_at: '2026-10-04T14:00:00Z',
      status: 'scheduled',
      meeting_link: null,
      teacher: null,
      lesson_students: [{ student: { name: 'سهيلة', guardian: null } }, { student: null }],
    };
    const { db, log } = chainDb({ lessons: [{ data: [lesson] }] });
    const rows = await new RemindersQueries(db).upcoming({ now: new Date('2026-10-04T13:00:00Z'), until: new Date('2026-10-05T14:00:00Z') });
    expect(rows).toEqual([
      { id: 'l1', starts_at: lesson.starts_at, status: 'scheduled', meeting_link: null, teacher: null, students: [{ name: 'سهيلة', guardian: null }] },
    ]);
    expect(callsOf(log, 'lessons')).toEqual(
      expect.arrayContaining([
        ['in', ['status', ['scheduled', 'confirmed']]],
        ['gt', ['starts_at', '2026-10-04T13:00:00.000Z']],
        ['lte', ['starts_at', '2026-10-05T14:00:00.000Z']],
      ]),
    );
  });

  it('dropCancelled deletes still-queued reminders whose lesson is no longer open', async () => {
    const { db, log } = chainDb({
      messages: [
        {
          data: [
            { id: 'm1', lesson: { status: 'cancelled_by_admin' } },
            { id: 'm2', lesson: { status: 'confirmed' } },
            { id: 'm3', lesson: { status: 'rescheduled' } },
          ],
        },
        { data: [{ id: 'm1' }, { id: 'm3' }] },
      ],
    });
    expect(await new RemindersQueries(db).dropCancelled(new Date('2026-10-04T13:00:00Z'))).toBe(2);
    expect(callsOf(log, 'messages', 0)).toContainEqual(['gt', ['expires_at', '2026-10-04T13:00:00.000Z']]);
    expect(callsOf(log, 'messages', 1)).toEqual([
      ['delete', []],
      ['in', ['id', ['m1', 'm3']]],
      ['eq', ['status', 'queued']],
      ['select', ['id']],
    ]);
  });

  it('dropCancelled with nothing to drop writes nothing', async () => {
    const { db, log } = chainDb({ messages: [{ data: [{ id: 'm2', lesson: { status: 'scheduled' } }] }] });
    expect(await new RemindersQueries(db).dropCancelled(new Date())).toBe(0);
    expect(log).toHaveLength(1);
  });

  it('pushedSubjects reads the subject back out of {kind}:{subject}:{profile}', async () => {
    const { db } = chainDb({
      push_notifications: [
        {
          data: [
            { dedup_key: 'lesson_needs_confirmation:lesson-1:admin-1', profile_id: 'admin-1' },
            { dedup_key: 'lesson_needs_confirmation:renewal:sub-1:admin-22', profile_id: 'admin-22' },
          ],
        },
      ],
    });
    const subjects = await new RemindersQueries(db).pushedSubjects('lesson_needs_confirmation', new Date());
    expect([...subjects]).toEqual(['lesson-1', 'renewal:sub-1']);
  });

  it('queueMessages: insert … on conflict (dedup_key) do nothing; nothing to queue → no request', async () => {
    const { db, log } = chainDb({ messages: [{ data: [{ id: 'x' }] }] });
    expect(await queueMessages(db, [])).toBe(0);
    expect(log).toHaveLength(0);
    const row = { dedup_key: 'k' } as unknown as Parameters<typeof queueMessages>[1][number];
    expect(await queueMessages(db, [row])).toBe(1);
    expect(callsOf(log, 'messages')[0]).toEqual(['upsert', [[row], { onConflict: 'dedup_key', ignoreDuplicates: true }]]);
  });

  it('a database error is thrown (the job logs it)', async () => {
    const { db } = chainDb({ message_templates: [{ data: null, error: { message: 'boom' } }] });
    await expect(new RemindersQueries(db).approved(['lesson_reminder_24h'])).rejects.toBeTruthy();
  });
});
