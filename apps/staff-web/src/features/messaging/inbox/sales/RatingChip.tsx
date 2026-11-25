import { ratingOfInteractive, type LessonRating, type MessageView } from '@ab/shared';
import type { Tone } from '@ab/money';
import { StatusChip, t } from '@ab/web-kit';

const TONE: Record<LessonRating, Tone> = { excellent: 'ok', good: 'neutral', needs_work: 'act' };

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
