import { addDays } from '@ab/time';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { useViewerTz } from '@ab/web-kit/lib/viewer-tz';
import { dayMonthLabel } from '@ab/web-kit/schedule/tz';
import type { WeekSlotsFrameProps } from './WeekSlotsFrame.types';
import { zoneLegend } from './week-slots-frame.helpers';

type Input = Pick<WeekSlotsFrameProps, 'week' | 'first' | 'onWeek' | 'studentTz'>;

export function useWeekSlotsFrame({ week, first, onWeek, studentTz }: Input) {
  const legend = zoneLegend(studentTz, useViewerTz());
  const weekLabel = t.schedule.weekOf.replace('{date}', dayMonthLabel(week));
  const prev = () => onWeek(addDays(week, -7));
  const next = () => onWeek(addDays(week, 7));
  return { legend, weekLabel, atFirst: week <= first, prev, next };
}
