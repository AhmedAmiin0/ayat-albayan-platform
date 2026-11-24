import type { PortalSlots, PortalSlotsQuery } from '@ab/shared';
import { lessonDuration, type SlotView } from '@ab/schedule';
import { Inject, Injectable } from '@nestjs/common';
import { conflict } from '@/common/http/errors';
import { SlotsService } from '@/modules/teaching/booking';
import type { PortalLessonRow } from '@/modules/people/portal/lessons/portal-lessons.repo';
import { PortalLessonActions, type ActionCall } from './portal-actions.service';

const MIN_MS = 60_000;

/** Free, still ahead, and not the lesson's own time; no clash reason leaves (other families). */
export function freeStarts(slots: readonly SlotView[], row: PortalLessonRow, now: Date) {
  const own = Date.parse(row.starts_at);
  return slots
    .filter((s) => s.conflicts.length === 0)
    .filter((s) => Date.parse(s.starts_at) > now.getTime() && Date.parse(s.starts_at) !== own)
    .map((s) => ({ starts_at: s.starts_at, ends_at: s.ends_at }));
}

/** The academy's slot grid with every clash, on the student's clock; max 14 days. */
@Injectable()
export class PortalSlotsService {
  constructor(
    @Inject(PortalLessonActions) private readonly actions: PortalLessonActions,
    @Inject(SlotsService) private readonly slots: SlotsService,
  ) {}

  async free(call: ActionCall, q: PortalSlotsQuery): Promise<PortalSlots> {
    const { student, row } = await this.actions.ahead(call);
    const length = (Date.parse(row.ends_at) - Date.parse(row.starts_at)) / MIN_MS;
    const durationMin = lessonDuration.safeParse(length);
    if (!durationMin.success || !row.teacher_id) throw conflict('unsupported_duration');
    const res = await this.slots.slots({
      teacherId: row.teacher_id,
      from: q.from,
      to: q.to,
      durationMin: durationMin.data,
      studentIds: row.lesson_students.map((s) => s.student_id),
      // The lesson that moves never clashes with itself.
      excludeLessonId: row.id,
    });
    const slots = freeStarts(res.slots, row, new Date());
    return { tz: student.tz, step_min: res.step_min, slots };
  }
}
