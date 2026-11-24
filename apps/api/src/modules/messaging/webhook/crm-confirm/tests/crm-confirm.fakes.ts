import { vi } from 'vitest';
import { CRM_ENV } from '@/modules/messaging/whatsapp/drivers/crm/crm.fakes';
import type { FetchLike } from '@/modules/messaging/whatsapp';
import type { ConfirmWrite, CrmConfirmRepo } from '@/modules/messaging/webhook/crm-confirm/crm-confirm.repo';
import { CrmConfirm } from '@/modules/messaging/webhook/crm-confirm/crm-confirm.service';
import type { UncertainRow } from '@/modules/messaging/webhook/crm-confirm/crm-match';
import type { CrmPlaces } from '@/modules/messaging/webhook/crm-confirm/crm-places';

// Test-only (excluded from the build): the crm confirm over rows in memory and a scripted CRM.

export const PHONE = '+201000000001';

/** A booking template sent on the crm notifications line at 20:27, timed out (uncertain). */
export const uncertainRow = (over: Partial<UncertainRow> = {}): UncertainRow => ({
  id: 'm1',
  phone_e164: PHONE,
  body: null,
  template_key: 'booking_confirmation',
  created_at: '2026-11-15T20:27:00.000Z',
  line: 'notifications',
  number_id: null,
  lead_id: null,
  dedup_key: null,
  ...over,
});

/** The notifications line on crm (legacy mode). */
export const CRM_PLACES: CrmPlaces = {
  env: CRM_ENV,
  lines: new Set(['notifications']),
  numbers: new Set(),
  known: new Set(),
};

/** CrmConfirmRepo in memory: an attached row is no longer uncertain and its wamid is held. */
function memoryRepo(rows: UncertainRow[]) {
  const attached: ConfirmWrite[] = [];
  const left = () => rows.filter((r) => !attached.some((a) => a.row.id === r.id));
  return {
    attached,
    uncertain: vi.fn(async () => left()),
    held: vi.fn(async (ids: readonly string[]) => {
      return new Set(attached.map((a) => a.waMessageId).filter((id) => ids.includes(id)));
    }),
    templateNames: vi.fn(async () => new Map([['booking_confirmation', ['booking_confirmation']]])),
    attach: vi.fn(async (w: ConfirmWrite) => attached.push(w) > 0),
  };
}

export function confirmOf(rows: UncertainRow[], fetch: FetchLike, places = CRM_PLACES) {
  const repo = memoryRepo(rows);
  const svc = new CrmConfirm(repo as unknown as CrmConfirmRepo, { places: () => places, fetch });
  return { repo, svc };
}
