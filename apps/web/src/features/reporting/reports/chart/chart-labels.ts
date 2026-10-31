import { dayMonthLabel, zonedParts } from '@/features/teaching/schedule';
import { t } from '@/lib/i18n/i18n';
import { gradeOfScore, type SeriesKey } from './chart';

/** «التقدير العام» or the rubric's form wording. */
export const seriesLabel = (key: SeriesKey): string => (key === 'overall' ? t.reports.overall : t.reports.rubric[key]);

/** ممتاز … يحتاج إلى مراجعة, or «من غير تقييم» for an ungraded report. */
export function gradeWord(score: number | null): string {
  const grade = score === null ? undefined : gradeOfScore(score);
  return grade ? t.enums.grade[grade] : t.reports.chart.noGrade;
}

/** «4 أكتوبر» in the viewer's zone. */
export const shortDate = (at: string, tz: string): string => dayMonthLabel(zonedParts(new Date(at), tz).date);
