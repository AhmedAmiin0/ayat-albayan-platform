import type { WeekSummary } from '@ab/client-core';
import { t, teacherLabel } from '@ab/web-kit';

export const S = t.portal.app.schedule;

/** The week's teachers in one line, empty when there are none. */
export const teachersLine = (teachers: WeekSummary['teachers']): string =>
  teachers.map((x) => teacherLabel(x)).join(' · ');
