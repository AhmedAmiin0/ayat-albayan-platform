import { zonedPartsIn } from '@ab/time';
import { dayMonthLabel } from '@/features/teaching/schedule';
import { t } from '@ab/web-kit';
import { gradeOfScore, type SeriesKey } from './chart';

export const seriesLabel = (key: SeriesKey): string => (key === 'overall' ? t.reports.overall : t.reports.rubric[key]);

export function gradeWord(score: number | null): string {
  const grade = score === null ? undefined : gradeOfScore(score);
  return grade ? t.enums.grade[grade] : t.reports.chart.noGrade;
}

export const shortDate = (at: string, tz: string): string =>
  dayMonthLabel(zonedPartsIn(new Date(at), tz).date);
