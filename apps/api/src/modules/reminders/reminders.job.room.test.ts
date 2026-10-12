import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { queuedRow } from './queued-row';
import { at, fakeJob, sampleLesson } from './reminders.fakes';

// settings.meeting_link_auto in the reminders job (owner 2026-10-12): the link is picked when the
// reminders are queued. LiveKit and the origin come from the env, read every tick.

const NOW = at('2026-10-04T13:10:00Z');
const ROOM = 'https://app.example/classroom/lesson-1';
const familyLink = queuedRow({
  phone: '+966500000101',
  template: { key: 'lesson_join_link', params: { '1': 'سهيلة', button: 'token' } },
  dedupKey: 'lesson_reminder:lesson-1:s-1:room',
  now: NOW,
  expiresAt: at('2026-10-04T16:45:00Z'),
});

function livekit(): void {
  vi.stubEnv('LIVEKIT_URL', 'wss://livekit.example');
  vi.stubEnv('LIVEKIT_API_KEY', 'key');
  vi.stubEnv('LIVEKIT_API_SECRET', 'secret');
}

describe('RemindersJob — meeting link mode', () => {
  beforeEach(() => {
    vi.stubEnv('WEB_ORIGIN', 'https://app.example/, http://localhost:5173');
    vi.stubEnv('LIVEKIT_URL', '');
  });
  afterEach(() => vi.unstubAllEnvs());

  it('auto: plain reminders, the teacher gets the classroom page, each family its own link', async () => {
    livekit();
    const { job, queries, queued } = fakeJob({ settings: { meeting_link_auto: true }, approved: ['lesson_join_link'], room: [familyLink] });
    await job.runOnce(NOW);
    expect(queries.approved).toHaveBeenCalledWith(['lesson_join_link']);
    expect(queued.map((r) => r.template_key)).toEqual(['lesson_reminder_plain', 'lesson_reminder_plain', 'teacher_lesson_reminder', 'lesson_join_link']);
    expect(queued[0]?.template_params.button).toBeUndefined();
    expect(queued[2]?.template_params['2']).toContain(ROOM);
    expect(queries.roomLinks).toHaveBeenCalledWith(expect.any(Array), NOW);
    expect(queries.roomLinks.mock.calls[0]?.[0].map((c) => c.studentId)).toEqual(['s-1', 's-2', 's-3']);
  });

  it('auto, template not approved: the teacher still gets the classroom page, no family link', async () => {
    livekit();
    const { job, queries, queued } = fakeJob({ settings: { meeting_link_auto: true } });
    await job.runOnce(NOW);
    expect(queued.map((r) => r.template_key)).toEqual(['lesson_reminder_plain', 'lesson_reminder_plain', 'teacher_lesson_reminder']);
    expect(queued[2]?.template_params['2']).toContain(ROOM);
    expect(queries.roomLinks).toHaveBeenCalledWith([], NOW);
  });

  it('auto without LiveKit: never the fixed link, and no template lookup', async () => {
    const { job, queries, queued } = fakeJob({ settings: { meeting_link_auto: true } });
    await job.runOnce(NOW);
    expect(queries.approved).not.toHaveBeenCalled();
    expect(queued.map((r) => r.template_key)).toEqual(['lesson_reminder_plain', 'lesson_reminder_plain', 'teacher_lesson_reminder']);
    expect(queued.some((r) => JSON.stringify(r.template_params).includes('meet.jit.si'))).toBe(false);
  });

  it('static: the fixed link as before; a lesson without one gets the classroom once its template is approved', async () => {
    livekit();
    const fixed = fakeJob({ approved: ['lesson_join_link'] });
    await fixed.job.runOnce(NOW);
    expect(fixed.queued.map((r) => r.template_key)).toEqual(['lesson_reminder', 'lesson_reminder', 'teacher_lesson_reminder']);
    expect(fixed.queries.roomLinks).toHaveBeenCalledWith([], NOW);

    const none = fakeJob({ lessons: [sampleLesson({ meeting_link: null })], approved: ['lesson_join_link'], room: [familyLink] });
    await none.job.runOnce(NOW);
    expect(none.queued.map((r) => r.template_key)).toEqual(['lesson_reminder_plain', 'lesson_reminder_plain', 'teacher_lesson_reminder', 'lesson_join_link']);
    expect(none.queued[2]?.template_params['2']).toContain(ROOM);
  });

  it('a failing family link never blocks the reminders nor the confirmation push', async () => {
    livekit();
    const { job, queries, queued, push } = fakeJob({ settings: { meeting_link_auto: true }, approved: ['lesson_join_link'] });
    queries.roomLinks.mockRejectedValueOnce(new Error('lesson_join_links write failed'));
    expect(await job.runOnce(NOW)).toMatchObject({ queued: 3, pushed: 1 });
    expect(queued.map((r) => r.template_key)).toEqual(['lesson_reminder_plain', 'lesson_reminder_plain', 'teacher_lesson_reminder']);
    expect(push.notifyAdmins).toHaveBeenCalledTimes(1);
  });

  it('one template lookup for the day-before reminder and the family link', async () => {
    livekit();
    const { job, queries } = fakeJob({ settings: { reminder_24h_enabled: true } });
    await job.runOnce(NOW);
    expect(queries.approved).toHaveBeenCalledTimes(1);
    expect(queries.approved).toHaveBeenCalledWith(['lesson_reminder_24h', 'lesson_join_link']);
  });
});
