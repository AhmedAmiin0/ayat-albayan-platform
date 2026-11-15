import type { AssistantCommissionStatus } from '@ab/shared';
import { t, StatusChip } from '@ab/mobile-kit';

/** «مستحقة» is settled money (ok); «ملغاة» was taken back (neutral, struck), as the web's CommissionChip. */
export function CommissionChip({ status }: { status: AssistantCommissionStatus }) {
  return status === 'earned' ? (
    <StatusChip size="sm" tone="ok" glyph="fill" label={t.assistantPortal.commission.earned} />
  ) : (
    <StatusChip size="sm" tone="neutral" glyph="struck" label={t.assistantPortal.commission.voided} />
  );
}
