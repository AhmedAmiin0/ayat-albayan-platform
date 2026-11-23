import { WA_LINES, type WaLine } from '@ab/shared';
import {
  overlayNumbers,
  type OverlayNumber,
} from '@/common/configuration/integrations/numbers-overlay';
import { lineEnvs, loadEnv, type CrmLineEnv, type Env, type WhatsappEnv } from '@/config/env/env';
import { crmFetch, type FetchLike } from '@/modules/messaging/whatsapp';
import type { UncertainRow } from './crm-match';

// Where the crm driver sends from (docs/19 «crm driver»): legacy lines on crm and module mode's crm
// numbers. A row is confirmed only when it went out through the CRM; its CRM env (the same base and
// key as its sends) is the one the lookups use.

export interface CrmPlaces {
  /** null = no line or number on crm: nothing is ever looked up. */
  env: CrmLineEnv | null;
  lines: ReadonlySet<string>;
  numbers: ReadonlySet<string>;
  /** Every number module mode knows: its own provider decides, never its line's. */
  known: ReadonlySet<string>;
}

const asCrm = (env: WhatsappEnv | null | undefined): CrmLineEnv | null =>
  env?.provider === 'crm' ? env : null;

/** The crm lines and numbers of this env and numbers overlay. */
export function crmPlaces(env: Env, numbers: readonly OverlayNumber[] | null): CrmPlaces {
  const lines = lineEnvs(env);
  const crmLines = WA_LINES.filter((l: WaLine) => asCrm(lines[l]) !== null);
  const crmNumbers = (numbers ?? []).filter((n) => asCrm(n.env) !== null);
  const envs = [...crmLines.map((l) => lines[l]), ...crmNumbers.map((n) => n.env)];
  return {
    env: envs.map(asCrm).find((e) => e !== null) ?? null,
    lines: new Set(crmLines),
    numbers: new Set(crmNumbers.map((n) => n.id)),
    known: new Set((numbers ?? []).map((n) => n.id)),
  };
}

/** The row left through the CRM: its number's driver when module mode knows it, else its line's. */
export const sentViaCrm =
  (p: CrmPlaces) =>
  (row: Pick<UncertainRow, 'line' | 'number_id'>): boolean => {
    const id = row.number_id ?? '';
    return p.known.has(id) ? p.numbers.has(id) : p.lines.has(row.line ?? '');
  };

/** Places are read per call from env and integrations; the fetch is faked in tests. */
export interface CrmConfirmSource {
  places: () => CrmPlaces;
  fetch: FetchLike;
}

export const CRM_CONFIRM_SOURCE = Symbol('CRM_CONFIRM_SOURCE');

/** The live source: loadEnv() and the numbers overlay per call, crmFetch (H-1). */
export const liveCrmConfirmSource = (): CrmConfirmSource => ({
  places: () => crmPlaces(loadEnv(), overlayNumbers()),
  fetch: crmFetch,
});
