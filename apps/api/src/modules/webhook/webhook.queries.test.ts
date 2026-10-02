import { describe, expect, it } from 'vitest';
import { callsOf, chainDb } from '../reminders/chain-db.fake';
import { WebhookQueries } from './webhook.queries';

const SINCE = new Date('2026-10-01T13:00:00Z');

describe('WebhookQueries: which lesson a reply is about (docs/12 §3.5)', () => {
  it('the 48 h fallback reads only messages that went out to this phone, with an open lesson', async () => {
    const { db, log } = chainDb({ messages: [{ data: [{ lesson_id: 'l1' }] }] });
    await expect(new WebhookQueries(db).recentLessonOutbound({ phone: '+966501234567', since: SINCE })).resolves.toBe('l1');
    expect(callsOf(log, 'messages')).toEqual(
      expect.arrayContaining([
        ['eq', ['direction', 'outbound']],
        ['eq', ['phone_e164', '+966501234567']],
        ['in', ['status', ['sent', 'delivered', 'read', 'sent_manually']]],
        ['gt', ['created_at', SINCE.toISOString()]],
        ['in', ['lesson.status', ['scheduled', 'confirmed']]],
      ]),
    );
  });

  it('nothing found → null; a payload lesson counts only for the guardian’s own child', async () => {
    const { db, log } = chainDb({ messages: [{ data: [] }], lesson_students: [{ data: [] }] });
    const q = new WebhookQueries(db);
    await expect(q.recentLessonOutbound({ phone: '+966501234567', since: SINCE })).resolves.toBeNull();
    await expect(q.guardianLesson({ lessonId: 'l1', guardianId: 'g1' })).resolves.toBe(false);
    expect(callsOf(log, 'lesson_students')).toEqual(
      expect.arrayContaining([
        ['eq', ['lesson_id', 'l1']],
        ['eq', ['student.guardian_id', 'g1']],
      ]),
    );
  });

  it('deleteInbound removes only the inbound row of that wamid', async () => {
    const { db, log } = chainDb();
    await new WebhookQueries(db).deleteInbound('wamid.IN1');
    expect(callsOf(log, 'messages')).toEqual([
      ['delete', []],
      ['eq', ['wa_message_id', 'wamid.IN1']],
      ['eq', ['direction', 'inbound']],
    ]);
  });
});
