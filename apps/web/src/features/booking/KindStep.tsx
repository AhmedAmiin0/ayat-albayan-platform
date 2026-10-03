import { RadioChips } from '@/components/ui/radio-chips';
import { t } from '@/lib/i18n';
import { BOOKING_KINDS } from './contract';
import type { BookingDraft } from './draft';
import { kindPatch } from './draft.kind';

export interface KindStepProps {
  draft: Pick<BookingDraft, 'kind' | 'students'>;
  /** A lead not yet registered: a makeup needs an existing student. */
  leadPath: boolean;
  onChange: (patch: Partial<BookingDraft>) => void;
}

/**
 * «نوع الحجز» at the top of step 1 (R-SCH-10): trial, subscription or makeup. The steps that
 * follow depend on it (a trial has no invoice, a makeup picks the missed lesson).
 */
export function KindStep({ draft, leadPath, onChange }: KindStepProps) {
  return (
    <div className="grid gap-1.5">
      <RadioChips
        name="booking-kind"
        legend={t.booking.kind.label}
        required
        options={BOOKING_KINDS.map((k) => ({ value: k, label: t.booking.kind[k], disabled: k === 'makeup' && leadPath }))}
        value={draft.kind}
        onChange={(kind) => onChange(kindPatch(draft, kind))}
      />
      {leadPath && <p className="text-xs text-ink-3">{t.booking.kind.makeupNeedsStudent}</p>}
    </div>
  );
}
