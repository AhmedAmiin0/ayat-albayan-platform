import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { PHONE } from '../inbox.fakes';
import { inboxApp } from '../test-app';

type App = Awaited<ReturnType<typeof inboxApp>>;
const URL = `/threads/${encodeURIComponent(PHONE)}`;
const WHO = { guardian_id: 'g1', guardian_name: 'أم سهيلة', guardian_tz: 'Asia/Riyadh', lead_id: null, lead_status: null, teacher_id: null };
const LESSON = { id: 'l1', starts_at: '2026-10-14T15:00:00.000Z', meeting_link: 'https://meet.google.com/abc-defg-hij', student_names: ['سهيلة'], tz: 'Asia/Riyadh' };

// Owner report 2026-10-12 («it is not able to start the conversation»): a booked family with no message yet.
describe('H2 a number with no message yet (admin and sales: the first template names the lesson)', () => {
  let t: App;
  beforeAll(async () => {
    t = await inboxApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    t.queries.thread.mockResolvedValue(null);
    t.queries.messages.mockResolvedValue([]);
    t.queries.markInboundRead.mockResolvedValue([]);
    t.queries.known.mockResolvedValue(WHO);
    t.queries.lessons.mockResolvedValue([LESSON]);
    t.queries.people.mockResolvedValue({ guardian: { id: 'g1', name: 'أم سهيلة' }, lead: null, students: [] });
  });

  it('sales: no thread, but the family’s next lessons (no meeting link) and people', async () => {
    const res = await t.call({ method: 'GET', url: URL, token: 'sales' });
    expect(res.statusCode).toBe(200);
    expect(res.json()).toMatchObject({ thread: null, messages: [], lessons: [{ id: 'l1', meeting_link: null }], people: { guardian: { id: 'g1' } } });
    expect(t.queries.known).toHaveBeenCalledWith(PHONE);
    expect(t.queries.lessons).toHaveBeenCalledWith(WHO, expect.any(Date));
  });

  it('the admin gets the same lessons (with the link, as for any thread)', async () => {
    const res = await t.call({ method: 'GET', url: URL });
    expect(res.json()).toMatchObject({ thread: null, lessons: [{ id: 'l1', meeting_link: LESSON.meeting_link }] });
  });

  it('a number nobody knows: no lessons, nothing looked up; an older page never looks the number up', async () => {
    t.queries.known.mockResolvedValue(null);
    const res = await t.call({ method: 'GET', url: URL, token: 'sales' });
    expect(res.json()).toMatchObject({ thread: null, lessons: [] });
    expect(t.queries.lessons).not.toHaveBeenCalled();
    t.queries.known.mockClear();
    await t.call({ method: 'GET', url: `${URL}?before=2026-10-01T00:00:00.000Z`, token: 'sales' });
    expect(t.queries.known).not.toHaveBeenCalled();
  });
});
