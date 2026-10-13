import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { messageRow } from '../whatsapp/sender.fakes';
import { templateRow } from '../whatsapp/whatsapp.fakes';
import { PHONE, threadRow } from './inbox.fakes';
import { inboxApp } from './test-app';

// Owner 2026-10-13 («just don't list them, don't disable them»): a booking confirmation or a lesson
// reminder (isLessonTimed) is refused to every restricted role even when an admin flagged it
// «متاح للمعلمين والمبيعات»; roles with templates.manage / templates.send_all still send it.

type App = Awaited<ReturnType<typeof inboxApp>>;
const URL = `/threads/${encodeURIComponent(PHONE)}/template`;
const REQ = 'c0000000-0000-4000-8000-000000000003';
const LESSON = '00000000-0000-4000-8000-0000000000d1';
const PARAMS = { '1': 'ياسمين', '2': 'الأحد 16:00', button: 'ayat-room' };
const send = (token: string, key: string) =>
  ({ method: 'POST' as const, url: URL, token, body: { key, params: PARAMS, lessonId: LESSON, clientRequestId: REQ } });

describe('POST /threads/:phone/template: a flagged lesson-timed template', () => {
  let t: App;
  beforeAll(async () => {
    t = await inboxApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    t.queries.thread.mockResolvedValue(threadRow({ guardian_id: 'g1' }));
    t.queries.enqueue.mockImplementation(async (row: object) => messageRow({ ...row, id: 'm9', status: 'queued' }));
    t.queries.get.mockImplementation(async () => ({ ...messageRow({ id: 'm9', status: 'queued' }), sent_by_teacher: null }));
  });

  it.each(['lesson_reminder', 'booking_confirmation_plain', 'lesson_reminder_24h'])(
    'sales sends a flagged, approved %s: 403 template_not_allowed, nothing queued',
    async (key) => {
      t.templates.get.mockResolvedValue(templateRow({ key, sales_starter: true }));
      const res = await t.call(send('sales', key));
      expect([res.statusCode, res.json().code]).toEqual([403, 'template_not_allowed']);
      expect(t.queries.enqueue).not.toHaveBeenCalled();
    },
  );

  it('the admin still sends a flagged lesson_reminder for the lesson', async () => {
    t.templates.get.mockResolvedValue(templateRow({ key: 'lesson_reminder', sales_starter: true }));
    const res = await t.call(send('admin', 'lesson_reminder'));
    expect(res.statusCode).toBe(201);
    expect(t.queries.enqueue).toHaveBeenCalledWith(expect.objectContaining({ template_key: 'lesson_reminder', lesson_id: LESSON }));
  });

  it('a flagged free_trial_invite still goes out for sales', async () => {
    t.templates.get.mockResolvedValue(templateRow({ key: 'free_trial_invite', meta_name: 'free_trial_invite', line: 'chat', sales_starter: true }));
    const res = await t.call(send('sales', 'free_trial_invite'));
    expect(res.statusCode).toBe(201);
    expect(t.queries.enqueue).toHaveBeenCalledWith(expect.objectContaining({ template_key: 'free_trial_invite', created_by: 's1' }));
  });
});
