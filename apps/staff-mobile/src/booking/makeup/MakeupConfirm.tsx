import { View } from 'react-native';
import { t, AppText, Button, type, useTheme } from '@ab/mobile-kit';
import type { BookFailure } from '@/booking/shared/booking-errors';
import { makeupSummary } from '@/booking/trial/lib/confirm-summary';
import { FailureNotice } from '@/booking/trial/components/ConfirmNotices';
import { SummaryList } from '@/booking/trial/components/ConfirmStep';
import type { MakeupDraft } from './makeup-draft';
import { useClockCycle, useViewerTz } from '@/core/lib/clock';

interface MakeupConfirmProps {
  draft: MakeupDraft;
  busy: boolean;
  failure: BookFailure | null;
  onSubmit: () => void;
  onChangeSlot: () => void;
  onChangeInvoice: () => void;
}

/** Retry sends the same request (rule 8), so an offline failure is safe to repeat. */
export function MakeupConfirm({ draft, busy, failure, onSubmit, ...go }: MakeupConfirmProps) {
  const cycle = useClockCycle();
  const tz = useViewerTz();
  const viewer = { tz, cycle };
  const { color } = useTheme();
  const note = { fontFamily: type.ui[500], fontSize: type.size.sm, color: color.ink2 };
  return (
    <View style={{ gap: 14 }}>
      <SummaryList rows={makeupSummary(draft, viewer)} />
      <AppText style={note}>{t.booking.confirmationNote}</AppText>
      {failure ? (
        <FailureNotice failure={failure} busy={busy} onSubmit={onSubmit} {...go} />
      ) : null}
      {failure?.kind === 'conflict' ? null : (
        <Button label={busy ? t.booking.submitting : t.booking.submit} busy={busy} onPress={onSubmit} />
      )}
    </View>
  );
}
