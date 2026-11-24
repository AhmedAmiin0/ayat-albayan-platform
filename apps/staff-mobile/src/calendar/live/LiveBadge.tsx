import type { LessonView } from '@ab/schedule';
import { t, StatusChip, useNow } from '@ab/mobile-kit';
import { useJoinWindow } from '@/core/lib/query/public-config';
import { livePhase } from './live-filter';

export function LiveBadge({ lesson }: { lesson: LessonView }) {
  const now = useNow();
  const win = useJoinWindow();
  if (livePhase(lesson, now, win) !== 'live') return null;
  return <StatusChip tone="ok" glyph="fill" label={t.live.now} size="sm" />;
}
