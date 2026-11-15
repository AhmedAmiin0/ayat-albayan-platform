import { ratingOfInteractive, type LessonRating, type MessageView, type Tone } from '@ab/shared';
import { StatusChip } from '@/components/ui/display/status-chip';
import { t } from '@/lib/i18n/i18n';

const TONE: Record<LessonRating, Tone> = { excellent: 'ok', good: 'neutral', needs_work: 'act' };

/** «التقييم: جيدة» on a guardian's lesson_rating tap (migration 195); nothing on other messages. */
export function RatingChip({ message: m }: { message: Pick<MessageView, 'direction' | 'interactive_payload'> }) {
  const rating = m.direction === 'inbound' ? ratingOfInteractive(m.interactive_payload) : null;
  if (!rating) return null;
  const label = t.inbox.rating.chip.replace('{rating}', t.feedback.quickRating[rating]);
  return (
    <p className="mt-1" data-testid="rating-chip">
      <StatusChip size="sm" tone={TONE[rating]} glyph="fill" label={label} />
    </p>
  );
}
