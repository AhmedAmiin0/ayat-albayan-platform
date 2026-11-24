import { type BookFailure, ConflictNotice } from '@/booking';
import { ErrorLine } from '@ab/mobile-kit';

interface ReviewNoticesProps {
  /** The check's clashes, one line each (booking.conflict.<kind>). */
  clashes: readonly string[];
  failure: BookFailure | null;
  onChangeSlot: () => void;
}

/** Clashes come from the check or the booking's own 409. */
export function ReviewNotices({ clashes, failure, onChangeSlot }: ReviewNoticesProps) {
  if (clashes.length > 0) return <ConflictNotice lines={clashes} onChangeSlot={onChangeSlot} />;
  if (!failure) return null;
  if (failure.kind === 'conflict') return <ConflictNotice lines={failure.lines} onChangeSlot={onChangeSlot} />;
  return 'text' in failure ? <ErrorLine message={failure.text} /> : null;
}
