import { teacherReminderMessage, type OutboundTemplate } from '@ab/shared';
import { ownJoin, teacherReminderCrm, type TeacherLinks } from './teacher-lesson.crm';
import { teacherLessonV3 } from './teacher-lesson.v3';

// Which template the teacher's same-day reminder goes as (owner 2026-11-06): teacher_lesson_v3 once
// its row is approved and the lesson's signed links were made; else teacher_lesson_reminder(_meet)
// with the CRM's one-line {{2}} carrying the direct links (no short links).

interface TeacherTemplateInput {
  teacher: { display_name_ar: string; tz: string };
  /** As sentLinks gives it: meeting_link = the fixed link, our classroom (absolute) or null. */
  lesson: {
    id: string;
    starts_at: string;
    ends_at: string;
    meeting_link: string | null;
    students: { name: string; code?: string | null }[];
  };
  /** The web origin (firstWebOrigin); '' = no CRM values and no v3. */
  origin: string;
  links?: TeacherLinks;
  /** teacher_lesson_v3 is approved in the registry. */
  v3: boolean;
}

function v3Template(input: TeacherTemplateInput): OutboundTemplate | null {
  const { teacher, lesson, origin, links } = input;
  const ready = input.v3 && links !== undefined && origin !== '';
  if (!ready) return null;
  const room = ownJoin(lesson, origin);
  return teacherLessonV3({ teacher, lesson, students: lesson.students, room, links });
}

function olderTemplate(input: TeacherTemplateInput): OutboundTemplate {
  const { teacher, lesson, origin, links } = input;
  const meta = teacherReminderMessage({
    names: lesson.students.map((s) => s.name),
    startsAt: new Date(lesson.starts_at),
    tz: teacher.tz,
    meetingLink: lesson.meeting_link,
    teacherName: teacher.display_name_ar,
  });
  // The CRM's own teacher_lesson_reminder values beside Meta's (docs/19); null: Meta's only.
  const crm = teacherReminderCrm({ teacher, lesson, origin, links });
  return crm ? { ...meta, params: { ...meta.params, crm } } : meta;
}

/** teacher_lesson_v3 when approved and complete, else the older reminder (never nothing). */
export const teacherTemplate = (input: TeacherTemplateInput): OutboundTemplate =>
  v3Template(input) ?? olderTemplate(input);
