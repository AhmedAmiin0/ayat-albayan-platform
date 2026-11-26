import type { Week } from '@/schedule/use-week';
import type { Face } from './WeekBody.types';

export function faceOf(week: Week): Face {
  if (week.failed) return 'failed';
  if (week.loading) return 'loading';
  return week.days.length === 0 ? 'empty' : 'days';
}
