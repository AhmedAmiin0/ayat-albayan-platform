import type { OutboundTemplate } from '@ab/shared';
import type { TeacherLessonTokens } from '@/modules/teaching/lesson-links';
import { lessonValues, oneLine, type TeacherLessonInput } from './teacher-lesson.crm';

// teacher_lesson_v3 (owner 2026-11-06): the teacher's lesson notice with the «ادخل الحلقة» and
// «تقرير الحلقة» link buttons on our own domains. Sent by the same-day reminder and the new-student
// alert once its registry row is approved; until then they keep their own templates.

interface TeacherLessonV3Input extends TeacherLessonInput {
  /** {{6}}: the lesson's own meeting link, written in the text as well (Meet, fixed, classroom). */
  room: string;
  /** The two button suffixes: the /join token and the lesson id (its report page). */
  links: TeacherLessonTokens;
}

/**
 * {{1}} the teacher, {{2}} the students, {{3}} their codes, {{4}} the time in the teacher's tz,
 * {{5}} the duration, {{6}} the meeting link; buttons [join token, lesson id]. The report button
 * opens /teacher-report/<lesson id>, which redirects to the signed-in portal page. null when a
 * value is missing: the caller keeps the older template.
 */
export function teacherLessonV3(input: TeacherLessonV3Input): OutboundTemplate | null {
  const v = lessonValues(input);
  const room = oneLine(input.room);
  if (!v || !room) return null;
  return {
    key: 'teacher_lesson_v3',
    params: {
      '1': oneLine(v.teacher),
      '2': oneLine(v.names),
      '3': v.codes,
      '4': v.when,
      '5': v.duration,
      '6': room,
      buttons: [input.links.join, input.links.report.suffix],
    },
  };
}
