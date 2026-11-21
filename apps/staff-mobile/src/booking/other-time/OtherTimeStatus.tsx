import { AppText, ErrorState, t, type, useTheme } from '@ab/mobile-kit';
import type { OtherTimeStatusProps } from './OtherTimeStatus.types';

/** Loading, a failed read (retry) or an empty fortnight. */
export function OtherTimeStatus({ read }: OtherTimeStatusProps) {
  const { color } = useTheme();
  const note = { fontFamily: type.ui[500], fontSize: type.size.sm, color: color.ink2 };
  if (read.isError)
    return <ErrorState message={t.booking.slotsError} onRetry={() => void read.refetch()} />;
  return (
    <AppText style={note}>{read.isPending ? t.common.loading : t.booking.otherTimeEmpty}</AppText>
  );
}
