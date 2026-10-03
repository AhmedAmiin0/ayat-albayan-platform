import type { StatusStyle, TeacherEarningStatus } from '@ab/shared';

/** Session earning → chip shape: unpaid is the admin's to-do, partly paid is underway, paid is settled. */
export const teacherEarningStatusStyle: Record<TeacherEarningStatus, StatusStyle> = {
  earned: { tone: 'act', glyph: 'hollow' },
  partially_paid: { tone: 'act', glyph: 'half' },
  paid: { tone: 'ok', glyph: 'fill' },
};
