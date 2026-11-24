import type { AssistantCommissionStatus } from '@ab/money';
import { t, StatusChip } from '@ab/mobile-kit';

/** Voided commissions are struck through, as the web's CommissionChip. */
export function CommissionChip({ status }: { status: AssistantCommissionStatus }) {
  return status === 'earned' ? (
    <StatusChip size="sm" tone="ok" glyph="fill" label={t.assistantPortal.commission.earned} />
  ) : (
    <StatusChip size="sm" tone="neutral" glyph="struck" label={t.assistantPortal.commission.voided} />
  );
}
