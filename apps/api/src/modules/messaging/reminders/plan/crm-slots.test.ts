import { CRM_DEFAULT_NAMES, type CrmValues } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { teacherLessonCrm, teacherReminderCrm } from './teacher-lesson.crm';

// Guard (2026-11-07): a producer's crm.body has exactly the body slots of the CRM template it goes
// as. teacher_lesson_v2 got five values for its four slots, so the CRM showed a code as the time.

/** The CRM templates' body slots ({{1}}…{{n}}), as approved on the CRM's account (docs/19). */
const CRM_SLOTS: Readonly<Record<string, number>> = {
  teacher_lesson_v2: 4,
  teacher_lesson_reminder: 2,
};

const TEACHER = { display_name_ar: 'أ. خالد', tz: 'Africa/Cairo' };
const LESSON = { id: 'L1', starts_at: '2026-10-04T14:00:00Z', ends_at: '2026-10-04T14:45:00Z' };
const STUDENTS = [{ name: 'سهيلة', code: 'AB-0101' }, { name: 'مريم', code: 'AB-0102' }];

const alert = (): CrmValues | null =>
  teacherLessonCrm({ teacher: TEACHER, lesson: LESSON, students: STUDENTS });
const reminder = (): CrmValues | null =>
  teacherReminderCrm({
    teacher: TEACHER,
    lesson: { ...LESSON, meeting_link: null, students: STUDENTS },
    origin: 'https://app.example',
  });

/** Each CRM_DEFAULT_NAMES key's crm values, as its producer builds them. */
const PRODUCERS: Readonly<Record<string, () => CrmValues | null>> = {
  teacher_new_student: alert,
  teacher_lesson_reminder: reminder,
  teacher_lesson_reminder_meet: reminder,
};

describe('crm.body length = the CRM template\'s slot count', () => {
  it.each(Object.entries(CRM_DEFAULT_NAMES))('%s → %s', (key, crmName) => {
    expect(CRM_SLOTS[crmName], `slot count of ${crmName}`).toBeDefined();
    const produce = PRODUCERS[key];
    expect(produce, `producer of ${key}`).toBeDefined();
    expect(produce?.()?.body).toHaveLength(CRM_SLOTS[crmName] ?? -1);
  });
});
