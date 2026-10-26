import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from 'vitest';
import { messageRow } from '../../whatsapp/sender/sender.fakes';
import { threadRow } from '../inbox.fakes';
import { inboxApp, TEACHER } from '../test-app';

type App = Awaited<ReturnType<typeof inboxApp>>;
type Status = 'trial' | 'active' | 'paused' | 'churned';
const OWN = '+201001234567';
const TRIAL = '+966500000001';
const MIXED = '+966500000002';
const ACTIVE = '+966500000003';
const ME = { id: 'tch-1', display_name_ar: 'أبرار', phone_e164: OWN };
const REQ = 'c0000000-0000-4000-8000-000000000003';
const FRESH = new Date(Date.now() - 3_600_000).toISOString();

// My students (teacher_student_ids) and their guardians' phones.
const MINE: { phone: string; status: Status }[] = [
  { phone: TRIAL, status: 'trial' },
  { phone: MIXED, status: 'trial' },
  { phone: MIXED, status: 'active' },
  { phone: ACTIVE, status: 'active' },
];
/** Migration 20261007000001 in miniature: guardians through non-trial students, plus my own number. */
const scopePhones = (): string[] => [...new Set([...MINE.filter((s) => s.status !== 'trial').map((s) => s.phone), OWN])];

const url = (phone: string) => `/threads/${encodeURIComponent(phone)}`;
const send = (phone: string) =>
  ({ method: 'POST' as const, url: `${url(phone)}/text`, token: 'teacher', body: { text: 'أهلًا', clientRequestId: REQ } });

describe('trial students: no direct chat between the teacher and the family (owner, 2026-10-11)', () => {
  let t: App;
  beforeAll(async () => {
    t = await inboxApp();
  });
  afterAll(() => t.app.close());
  beforeEach(() => {
    vi.resetAllMocks();
    t.teacher.teacher.mockImplementation(async (profileId: string) => (profileId === TEACHER.id ? ME : null));
    t.teacher.phones.mockResolvedValue(scopePhones());
    t.teacher.unread.mockResolvedValue(new Map());
    t.teacher.guardianStudents.mockResolvedValue([]);
    t.teacher.myStudentIds.mockResolvedValue(new Set());
    t.queries.list.mockResolvedValue({ items: [], total: 0 });
    t.queries.thread.mockImplementation(async (phone: string) => threadRow({ phone_e164: phone, last_inbound_at: FRESH, guardian_id: 'g1' }));
    t.queries.messages.mockResolvedValue([]);
    t.queries.lessons.mockResolvedValue([]);
    t.queries.enqueue.mockImplementation(async (row: object) => messageRow({ ...row, id: 'm9', status: 'queued' }));
    t.queries.get.mockResolvedValue({ ...messageRow({ id: 'm9', status: 'sent', template_key: null }), sent_by_teacher: { display_name_ar: 'أبرار' } });
  });

  it('the list pages only the active and mixed families and my own chat, never the trial family', async () => {
    await t.call({ method: 'GET', url: '/threads', token: 'teacher' });
    expect(t.queries.list).toHaveBeenCalledWith(expect.objectContaining({ phones: [MIXED, ACTIVE, OWN] }));
  });

  it('opening a trial family’s thread → 403 not_your_thread; nothing is read or stamped', async () => {
    const res = await t.call({ method: 'GET', url: url(TRIAL), token: 'teacher' });
    expect([res.statusCode, res.json().code]).toEqual([403, 'not_your_thread']);
    expect(t.queries.messages).not.toHaveBeenCalled();
    expect(t.teacher.stampRead).not.toHaveBeenCalled();
  });

  it('writing to a trial family → 403 not_your_thread; nothing is queued', async () => {
    const res = await t.call(send(TRIAL));
    expect([res.statusCode, res.json().code]).toEqual([403, 'not_your_thread']);
    expect(t.queries.enqueue).not.toHaveBeenCalled();
  });

  it.each([
    ['a mixed family (one trial child, one active)', MIXED],
    ['an active student’s family', ACTIVE],
  ])('%s stays readable and writable', async (_name, phone) => {
    expect((await t.call({ method: 'GET', url: url(phone), token: 'teacher' })).statusCode).toBe(200);
    expect((await t.call(send(phone))).statusCode).toBe(201);
  });

  it('my own chat with the academy stays readable', async () => {
    t.queries.thread.mockResolvedValue(threadRow({ phone_e164: OWN, lead_id: null, teacher_id: 'tch-1', teacher_name: 'أبرار' }));
    expect((await t.call({ method: 'GET', url: url(OWN), token: 'teacher' })).statusCode).toBe(200);
  });
});
