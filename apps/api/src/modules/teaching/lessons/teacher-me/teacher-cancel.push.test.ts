import { describe, expect, it, vi } from 'vitest';
import type { PushService } from '@/common/push/push.service';
import { lessonRow } from '@/modules/teaching/lessons/lessons.fakes';
import type { TeacherCancelRepo } from './teacher-cancel.repo';
import { TeacherCancelPush, teacherCancelEvent } from './teacher-cancel.push';

const lesson = lessonRow();

function setup(owners: () => Promise<string[]>) {
  const push = { notifyAdmins: vi.fn(), notifySales: vi.fn() };
  const repo = { ownerIds: vi.fn(owners) };
  const notifier = new TeacherCancelPush(
    push as unknown as PushService,
    repo as unknown as TeacherCancelRepo,
  );
  return { push, repo, notifier };
}

describe('teacherCancelEvent (docs/46 D3)', () => {
  it('names the teacher, the student, the Riyadh time and the reason; its own dedup subject', () => {
    const event = teacherCancelEvent(lesson, 'سفر');
    expect(event.subject).toBe(`teacher_cancel:${lesson.id}`);
    expect(event.title).toContain(lesson.teacher?.display_name_ar ?? '');
    expect(String(event.vars.when)).toContain('سفر');
    expect(event.vars.student).toBe(lesson.lesson_students[0]?.student?.name);
    expect(event.data).toEqual({ lessonId: lesson.id });
  });
});

describe('TeacherCancelPush', () => {
  it('the admins, then the students\' own assistants', async () => {
    const { push, repo, notifier } = setup(async () => ['s-1']);
    await notifier.notify(lesson, 'سفر');
    expect(push.notifyAdmins).toHaveBeenCalledWith('lesson_cancelled', expect.any(Object));
    expect(repo.ownerIds).toHaveBeenCalledWith(lesson.lesson_students.map((s) => s.student_id));
    expect(push.notifySales).toHaveBeenCalledWith('lesson_cancelled', expect.any(Object), ['s-1']);
  });

  it('no owner: never every assistant', async () => {
    const { push, notifier } = setup(async () => []);
    await notifier.notify(lesson, 'سفر');
    expect(push.notifySales).not.toHaveBeenCalled();
  });

  it('an owners lookup failure is logged, never thrown (the cancel is saved)', async () => {
    const { push, notifier } = setup(async () => {
      throw new Error('db down');
    });
    await expect(notifier.notify(lesson, 'سفر')).resolves.toBeUndefined();
    expect(push.notifyAdmins).toHaveBeenCalled();
    expect(push.notifySales).not.toHaveBeenCalled();
  });
});
