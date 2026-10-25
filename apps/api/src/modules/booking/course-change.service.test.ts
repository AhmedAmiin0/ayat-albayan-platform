import { courseChangeCheckSchema, courseChangeSchema } from '@ab/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { errorCode } from '../../common/http/errors';
import { ADMIN, BODY, CLASH, REQUEST_ID, RULE_A, SALES, setup, SUB, SUB_ID } from './course-change.fakes';

const body = (o: object = {}) => courseChangeSchema.parse({ ...BODY, ...o });
const failed = (p: Promise<unknown>) => p.then(() => undefined, (e: unknown) => errorCode(e));

describe('CourseChange — «تغيير أيام الحلقات» (owner 2026-10-18)', () => {
  beforeEach(() => vi.useFakeTimers({ now: new Date('2026-10-18T08:00:00Z'), toFake: ['Date'] }));
  afterEach(() => vi.useRealTimers());

  it('check: the remaining lessons and the new end, the moved lessons and old rules excluded from the clash check', async () => {
    const { service, deps } = setup();
    const res = await service.check(courseChangeCheckSchema.parse(BODY), SALES);
    expect(res).toEqual({ conflicts: [], remaining: 8, endsOn: '2026-11-17' });
    expect(deps.checker.check).toHaveBeenCalledWith(
      expect.objectContaining({ studentIds: [SUB.student_id], excludeIds: ['l9'], excludeRuleIds: ['ra', 'rb'], teacherId: 't1' }),
    );
  });

  it('change: one change_course write naming the course, then its result', async () => {
    const { service, writer } = setup();
    expect(await service.change(body(), SALES)).toEqual({ subscriptionId: SUB_ID, ruleIds: ['n1', 'n2'], endsOn: '2026-11-17' });
    expect(writer.apply).toHaveBeenCalledWith(expect.objectContaining({ subscriptionId: SUB_ID, moved: ['l9'] }));
  });

  it('a clash blocks the assistant (409 conflict), even with a reason (403 override_not_allowed)', async () => {
    const { service, deps, writer } = setup();
    deps.checker.check.mockResolvedValue([CLASH]);
    expect(await failed(service.change(body(), SALES))).toBe('conflict');
    expect(await failed(service.change(body({ override: { reason: 'موافقة' } }), SALES))).toBe('override_not_allowed');
    expect(writer.apply).not.toHaveBeenCalled();
  });

  it('the admin books over a clash only with a reason, which is written on the clashing lesson', async () => {
    const { service, deps, writer } = setup();
    deps.checker.check.mockResolvedValue([CLASH]);
    expect(await failed(service.change(body(), ADMIN))).toBe('conflict');
    await service.change(body({ override: { reason: 'بطلب ولي الأمر' } }), ADMIN);
    const payload = writer.apply.mock.calls[0]?.[0].payload as { new_rules: { lessons: { starts_at: string; override_reason: string | null }[] }[]; audit: { after: { by: string; override_reason: string } } };
    const clashing = payload.new_rules.flatMap((r) => r.lessons).find((l) => l.starts_at === CLASH.startsAt);
    expect(clashing?.override_reason).toBe('بطلب ولي الأمر');
    expect(payload.audit.after).toEqual(expect.objectContaining({ by: 'admin', override_reason: 'بطلب ولي الأمر' }));
  });

  it('another assistant’s student → 403 not_your_student before anything is read or written', async () => {
    const { service, queries, writer } = setup({ owned: [] });
    expect(await failed(service.change(body(), SALES))).toBe('not_your_student');
    expect(await failed(service.check(courseChangeCheckSchema.parse(BODY), SALES))).toBe('not_your_student');
    expect(queries.rules).not.toHaveBeenCalled();
    expect(writer.apply).not.toHaveBeenCalled();
    // The admin is never scoped.
    expect((await service.check(courseChangeCheckSchema.parse(BODY), ADMIN)).remaining).toBe(8);
  });

  it('course_finished: no active rule, or nothing left at the change point', async () => {
    expect(await failed(setup({ rules: [{ ...RULE_A, status: 'ended' }] }).service.change(body(), SALES))).toBe('course_finished');
    const used = setup();
    used.lessons.ofCourse.mockResolvedValue(Array.from({ length: 8 }, (_, i) => ({ id: `u${i}`, status: 'completed', chargeable: true, makeup: false, instant: false })));
    expect(await failed(used.service.change(body(), SALES))).toBe('course_finished');
  });

  it('no course → 404 course_not_found; a trial is not a course → 400 trial_not_course', async () => {
    expect(await failed(setup({ rules: [] }).service.change(body(), SALES))).toBe('course_not_found');
    const trial = setup();
    trial.queries.subscription.mockResolvedValue({ ...SUB, package: 'trial' });
    expect(await failed(trial.service.change(body(), SALES))).toBe('trial_not_course');
  });

  it('a retry with the same clientRequestId returns the first change, nothing planned or written', async () => {
    const { service, writer, queries } = setup();
    writer.replay.mockResolvedValue({ subscriptionId: SUB_ID, ruleIds: ['n1'], endsOn: '2026-11-17' });
    expect((await service.change(body(), SALES)).ruleIds).toEqual(['n1']);
    expect(writer.replay).toHaveBeenCalledWith(REQUEST_ID, SUB_ID);
    expect(queries.rules).not.toHaveBeenCalled();
    expect(writer.apply).not.toHaveBeenCalled();
  });

  it('400: the first new lesson already passed; startsAt on another day than startsOn', async () => {
    const { service } = setup();
    expect(await failed(service.change(body({ startsOn: '2026-10-18', startsAt: '2026-10-18T05:00:00.000Z' }), SALES))).toBe('date_in_past');
    expect(await failed(service.change(body({ startsAt: '2026-10-26T14:00:00.000Z' }), SALES))).toBe('starts_at_mismatch');
  });
});
