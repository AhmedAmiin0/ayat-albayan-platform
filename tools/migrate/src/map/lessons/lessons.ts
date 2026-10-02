// lessons + lesson_students ← reports (collectReports): one past lesson per reported student and
// day. rule_id stays null (handbook gotcha 6), so the generator's (rule_id, starts_at) and
// (rule_id, local_date) indexes never see imported rows. «رقم الحلقة» is not imported (A5):
// the number is derived from completed lessons (v_lesson_sequence). Issues are raised once, by
// the lesson_reports module.
import type { EntityModule, SourceBundle, WriteContext } from '../../entities/contract.ts';
import { keys } from '../../keys.ts';
import { accepted } from '../../sources/sheets/issues.ts';
import type { Mapped } from '../../types.ts';
import { LESSON_STATUS } from '../reports/fields.ts';
import { collectReports } from '../reports/collect.ts';

export function mapLessons(bundle: SourceBundle): Mapped[] {
  return collectReports(bundle).reports.map((r) =>
    accepted({
      key: r.lessonKey,
      ref: r.ref,
      columns: {
        starts_at: r.startsAt,
        ends_at: r.endsAt,
        status: LESSON_STATUS[r.attendance],
        meeting_link: r.meetingLink,
      },
      refs: { teacher_id: keys.teacher(r.teacher) },
    }),
  );
}

export function mapLessonStudents(bundle: SourceBundle): Mapped[] {
  return collectReports(bundle).reports.map((r) =>
    accepted({
      key: keys.lessonStudent({ lesson: r.lessonKey.key, student: r.student.key }),
      ref: r.ref,
      // A free trial never consumes a package unit (v_package_lessons reads chargeable).
      columns: { attendance: r.attendance, chargeable: !r.trial },
      refs: { lesson_id: r.lessonKey, student_id: r.student },
    }),
  );
}

/** Composite primary key: insert-or-nothing on create, update by (lesson_id, student_id). */
export async function writeLessonStudent(ctx: WriteContext) {
  const c = ctx.columns;
  if (ctx.item.action === 'create') {
    await ctx.tx.insert({ table: 'lesson_students', columns: c, returning: null });
  } else {
    await ctx.tx.exec({
      text: `update public.lesson_students set attendance = $3::public.attendance, chargeable = $4
             where lesson_id = $1 and student_id = $2`,
      params: [
        String(c['lesson_id']),
        String(c['student_id']),
        String(c['attendance']),
        c['chargeable'] === true,
      ],
    });
  }
  return { targetId: null };
}

export const lessonsModule: EntityModule = {
  entity: 'lessons',
  table: 'lessons',
  map: mapLessons,
};

export const lessonStudentsModule: EntityModule = {
  entity: 'lesson_students',
  table: 'lesson_students',
  map: mapLessonStudents,
  write: writeLessonStudent,
};
