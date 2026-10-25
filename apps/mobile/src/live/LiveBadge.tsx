import type { LessonView } from '@ab/shared';
import { useMinuteClock } from '@/classroom/use-minute-clock';
import { t } from '@/lib/i18n';
import { useJoinWindow } from '@/lib/public-config';
import { StatusChip } from '@/core/ui/feedback/StatusChip';
import { livePhase } from './live-filter';

/** «مباشر الآن» (filled dot + word) beside a row's time while the lesson is under way; else nothing. */
export function LiveBadge({ lesson }: { lesson: LessonView }) {
  const now = useMinuteClock();
  const win = useJoinWindow();
  if (livePhase(lesson, now, win) !== 'live') return null;
  return <StatusChip tone="ok" glyph="fill" label={t.live.now} size="sm" />;
}
