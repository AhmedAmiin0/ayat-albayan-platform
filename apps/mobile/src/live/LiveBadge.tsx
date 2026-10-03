import type { LessonView } from '@ab/shared';
import { useMinuteClock } from '@/classroom/use-minute-clock';
import { t } from '@/lib/i18n';
import { StatusChip } from '@/ui/StatusChip';
import { livePhase } from './live-filter';

/** «مباشر الآن» (filled dot + word) beside a row's time while the lesson is under way; else nothing. */
export function LiveBadge({ lesson }: { lesson: LessonView }) {
  const now = useMinuteClock();
  if (livePhase(lesson, now) !== 'live') return null;
  return <StatusChip tone="ok" glyph="fill" label={t.live.now} size="sm" />;
}
