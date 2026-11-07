import type { LineCheckView, WaLine, WaProvider } from '@ab/shared';

// Which wa_numbers rows keep one line check (#134 item 9, owner 2026-11-07). A Meta / Kapso /
// Evolution line is found by the phone id it checked (Evolution: its instance); a crm line has none
// (its check is the CRM's GET /me, the number is the CRM's), so it is kept on its role's crm rows:
// the number module mode routes the role to, or under legacy every crm row of that role. An
// unconfigured line keeps nothing.

/** The wa_numbers columns the write matches (no secret: ids, role and driver only). */
export type HealthTarget =
  | { phone_number_id: string }
  | { purpose: WaLine; provider: 'crm' }
  | { purpose: WaLine; provider: 'crm'; id: string };

type Targeter = (v: LineCheckView, active: string | undefined) => HealthTarget | null;

const byPhone: Targeter = (v) =>
  v.phone_number_id ? { phone_number_id: v.phone_number_id } : null;

const TARGETS: Partial<Record<WaProvider, Targeter>> = {
  crm: (v, active) => ({ purpose: v.line, provider: 'crm', ...(active ? { id: active } : {}) }),
};

/** The rows to write, or null; `active` = activeNumberId(line) (undefined under legacy). */
export function healthTarget(v: LineCheckView, active: string | undefined): HealthTarget | null {
  if (!v.configured) return null;
  return (TARGETS[v.provider] ?? byPhone)(v, active);
}
