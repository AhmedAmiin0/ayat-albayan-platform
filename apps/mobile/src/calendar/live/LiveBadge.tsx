import type { LessonView } from '@ab/shared';
import { useNow } from '@/core/lib/time/use-now';
import { t, StatusChip } from '@ab/mobile-kit';
import { useJoinWindow } from '@/core/lib/query/public-config';
import { livePhase } from './live-filter';

/** «مباشر الآن» (filled dot + word) beside a row's time while the lesson is under way; else nothing. */
export function LiveBadge({ lesson }: { lesson: LessonView }) {
  const now = useNow();
  const win = useJoinWindow();
  if (livePhase(lesson, now, win) !== 'live') return null;
  return <StatusChip tone="ok" glyph="fill" label={t.live.now} size="sm" />;
}
