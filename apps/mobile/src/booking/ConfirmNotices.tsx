import { View } from 'react-native';
import { ErrorLine } from '@/inbox/ErrorLine';
import { t } from '@/core/lib/i18n/i18n';
import { AppText } from '@/core/ui/primitives/AppText';
import { Button } from '@/core/ui/primitives/Button';
import { type, useTheme } from '@/theme';
import type { BookFailure } from './booking-errors';
import { ConflictNotice } from './ConflictNotice';
import type { StudentChoice, TrialDraft } from './draft';
import { DuplicateNotice } from './DuplicateNotice';
import { packageDaysNote } from './package-choice';

export interface FailureNoticeProps {
  failure: BookFailure;
  busy: boolean;
  onSubmit: (choice?: StudentChoice) => void;
  onChangeSlot: () => void;
  onChangeInvoice: () => void;
}

/** What went wrong, with its way out: another slot or invoice, the child on file, or the message. */
export function FailureNotice({ failure, busy, onSubmit, ...go }: FailureNoticeProps) {
  if (failure.kind === 'conflict') {
    return <ConflictNotice lines={failure.lines} onChangeSlot={go.onChangeSlot} />;
  }
  if (failure.kind === 'error') return <ErrorLine message={failure.text} />;
  if (failure.kind === 'invoice') {
    return (
      <View style={{ gap: 6 }}>
        <ErrorLine message={failure.text} />
        <View style={{ alignSelf: 'flex-start' }}>
          <Button variant="secondary" label={t.booking.invoice.replace} onPress={go.onChangeInvoice} />
        </View>
      </View>
    );
  }
  return (
    <DuplicateNotice
      candidates={failure.candidates}
      busy={busy}
      onUse={(existingId) => onSubmit({ existingId })}
      onNew={() => onSubmit({ force: true })}
    />
  );
}

/** The package/days mismatch as a hamish line (double gold-soft rule), in act: the admin's to fix. */
export function PackageDaysNote({ pkg, days }: { pkg: TrialDraft['pkg']; days: number }) {
  const { color } = useTheme();
  const note = packageDaysNote(pkg, days);
  if (!note) return null;
  return (
    <View style={{ borderStartWidth: 3, borderStartColor: color.goldSoft, paddingStart: 10 }}>
      <AppText style={{ fontFamily: type.ui[600], fontSize: type.size.xs, lineHeight: type.lineHeight(type.size.xs), color: color.act }}>
        {note}
      </AppText>
    </View>
  );
}
