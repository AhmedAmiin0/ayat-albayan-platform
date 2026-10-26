import type { TrialHistory } from '@ab/shared';
import { View } from 'react-native';
import { conflictLine, type BookFailure } from '@/booking/shared/booking-errors';
import { t } from '@/core/lib/i18n/i18n';
import { type, useTheme } from '@/theme';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { PickedLines } from './PickedLines';
import { useTrialDateCheck } from '../lib/queries';
import { ReviewNotices } from './ReviewNotices';
import type { TrialDateBody, TrialDateDraft } from '../lib/trial-date-body';
import { effectLine } from '../lib/trial-date-text';
import { TrialDateWarn } from './TrialDateWarn';

interface TrialDateReviewProps {
  draft: TrialDateDraft;
  history: TrialHistory;
  /** The body «احجز» sends (null until a teacher and a time are picked). */
  body: TrialDateBody | null;
  submit: { busy: boolean; failure: BookFailure | null; onSubmit: () => void };
  /** «اختر موعدًا آخر»: back to the free slots, fetched afresh. */
  onChangeSlot: () => void;
}

/**
 * «المراجعة»: the new time and the teacher, what it does (moves the upcoming trial, or books a new
 * one), the warning from the 3rd date on, and the clashes POST …/trial-date/check finds (as the
 * booking shows them; the way out is another slot, mobile has no override).
 */
export function TrialDateReview({ draft, history, body, submit, onChangeSlot }: TrialDateReviewProps) {
  const { color } = useTheme();
  const check = useTrialDateCheck(body);
  const clashes = (check.data?.conflicts ?? []).map(conflictLine);
  const blocked = clashes.length > 0 || submit.failure?.kind === 'conflict';
  const note = { fontFamily: type.ui[500], fontSize: type.size.sm, lineHeight: type.lineHeight(type.size.sm), color: color.ink2 };
  return (
    <View style={{ gap: 14 }}>
      <PickedLines draft={draft} />
      <AppText style={note}>{effectLine(history)}</AppText>
      <TrialDateWarn count={history.count} />
      {check.isFetching ? <AppText style={note}>{t.common.loading}</AppText> : null}
      <ReviewNotices clashes={clashes} failure={submit.failure} onChangeSlot={onChangeSlot} />
      {blocked ? null : (
        <Button
          label={submit.busy ? t.trialDate.submitting : t.trialDate.submit}
          busy={submit.busy}
          disabled={body === null || check.isFetching}
          onPress={submit.onSubmit}
        />
      )}
    </View>
  );
}
