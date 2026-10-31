import { joinNames, lessonWhenText, type BookingKind, type OutboundTemplate } from '@ab/shared';
import { ar } from '@/common/infra/i18n/server-text';
import type { PushTarget } from '../../../../common/push/push.service';
import { queuedRow, type QueuedMessage } from '../../../messaging/reminders/queued-row';
import { staffReachable, type StaffOnRecord } from '../../../messaging/reminders/plan/staff-reachable';
import { teacherAlertCrm } from './teacher-alert.crm';

// R-NOT-03 (owner 2026-10-12): after a booking, the teacher hears about the new student in the bell
// (always) and on WhatsApp (teacher_new_student, only while settings.teacher_whatsapp_new_student
// is ON and Meta approved it). Pure: TeacherAlert reads, this plans, the dedup keys make a repeat a
// no-op (rule 8). The WhatsApp row expires at the first lesson's start; a lesson retimed before it
// is sent drops it (send-stale.ts), so the old time never goes out.

export interface AlertTeacher extends StaffOnRecord {
  id: string;
  profile_id: string | null;
  phone_e164: string | null;
  tz: string;
  /** The CRM alert's {{1}} (teacher-alert.crm.ts). */
  display_name_ar?: string | null;
}

export interface AlertLesson {
  id: string;
  starts_at: string;
  /** The CRM alert's duration. */
  ends_at?: string | null;
  teacher: AlertTeacher | null;
}

interface AlertInput {
  lessons: readonly AlertLesson[];
  students: readonly { id: string; name: string; code?: string | null }[];
  kind: BookingKind;
  now: Date;
}

/** One teacher's alert: the bell row (a profile to show it to) and the WhatsApp row (a phone to send to). */
interface TeacherAlertPlan {
  push: PushTarget | null;
  message: QueuedMessage | null;
}

/** Each distinct teacher with their first lesson of the booking. */
function firstLessons(lessons: readonly AlertLesson[]): { teacher: AlertTeacher; lesson: AlertLesson }[] {
  const byTeacher = new Map<string, { teacher: AlertTeacher; lesson: AlertLesson }>();
  for (const lesson of [...lessons].sort((a, b) => Date.parse(a.starts_at) - Date.parse(b.starts_at))) {
    if (lesson.teacher && !byTeacher.has(lesson.teacher.id)) byTeacher.set(lesson.teacher.id, { teacher: lesson.teacher, lesson });
  }
  return [...byTeacher.values()];
}

/** teacher_new_student: {{1}} the students, {{2}} the first lesson in the teacher's tz, {{3}} «تجريبية» | «اشتراك». */
function teacherNewStudentMessage(input: { names: readonly string[]; startsAt: Date; tz: string; kind: BookingKind }): OutboundTemplate {
  const kinds = ar.templates.teacherNewStudentKind;
  return {
    key: 'teacher_new_student',
    params: {
      '1': joinNames(input.names),
      '2': lessonWhenText(input.startsAt, input.tz),
      '3': input.kind === 'trial' ? kinds.trial : kinds.subscription,
    },
  };
}

export function teacherAlerts(input: AlertInput): TeacherAlertPlan[] {
  const names = input.students.map((s) => s.name).filter((n) => n.trim() !== '');
  const studentId = input.students[0]?.id;
  return firstLessons(input.lessons).map(({ teacher, lesson }) => {
    const startsAt = new Date(lesson.starts_at);
    const push: PushTarget | null = teacher.profile_id
      ? {
          kind: 'new_student',
          subject: lesson.id,
          vars: { student: joinNames(names), when: lessonWhenText(startsAt, teacher.tz) },
          data: { lessonId: lesson.id, ...(studentId ? { studentId } : {}) },
          profileIds: [teacher.profile_id],
        }
      : null;
    const meta = teacherNewStudentMessage({ names, startsAt, tz: teacher.tz, kind: input.kind });
    const crm = teacherAlertCrm({ teacher, lesson, students: input.students });
    // Only the lesson's teacher's number on record, and only while they are still on staff.
    const message = teacher.phone_e164 && staffReachable(teacher)
      ? queuedRow({
          phone: teacher.phone_e164,
          lessonId: lesson.id,
          template: crm ? { ...meta, params: { ...meta.params, crm } } : meta,
          dedupKey: `teacher_new_student:${lesson.id}:${teacher.id}`,
          now: input.now,
          // About an upcoming lesson: never sent once it started (a send gate closed until then).
          expiresAt: startsAt,
        })
      : null;
    return { push, message };
  });
}
