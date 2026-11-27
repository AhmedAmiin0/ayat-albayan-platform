import { t } from '@ab/mobile-kit';
import { openReport } from '@/nav';
import { useFamilyClock } from '@/portal';
import { dateLine } from '@/lessons/lesson-text';
import type { FromReportProps } from './FromReport.types';

export function useFromReport({ student, reportId, at }: FromReportProps) {
  const clock = { ...useFamilyClock(), tz: student.tz };
  return {
    text: t.portal.app.lesson.fromReport.replace('{date}', dateLine(new Date(at), clock)),
    onOpen: () => openReport({ studentId: student.id, reportId }),
  };
}
