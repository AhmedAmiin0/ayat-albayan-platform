import { View } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { type, useTheme } from '@/theme';
import type { BookFailure } from '../shared/booking-errors';
import { makeupSummary } from '../trial/lib/confirm-summary';
import { FailureNotice } from '../trial/components/ConfirmNotices';
import { SummaryList } from '../trial/components/ConfirmStep';
import type { MakeupDraft } from './makeup-draft';
import { useClockCycle } from '@/core/lib/clock';

interface MakeupConfirmProps {
  draft: MakeupDraft;
  busy: boolean;
  failure: BookFailure | null;
  onSubmit: () => void;
  onChangeSlot: () => void;
  onChangeInvoice: () => void;
}

/**
 * «المراجعة» of a makeup: type, student, the missed lesson, the new time and the invoice. No
 * package, no weekly days. A clash or a refused invoice shows its way out; «احجز» retries the same
 * request (rule 8), so an offline failure is safe to repeat.
 */
export function MakeupConfirm({ draft, busy, failure, onSubmit, ...go }: MakeupConfirmProps) {
  const cycle = useClockCycle();
  const { color } = useTheme();
  const note = { fontFamily: type.ui[500], fontSize: type.size.sm, color: color.ink2 };
  return (
    <View style={{ gap: 14 }}>
      <SummaryList rows={makeupSummary(draft, cycle)} />
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
