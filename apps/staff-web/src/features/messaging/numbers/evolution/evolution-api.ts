import { EVOLUTION_STATES, QR_DATA_URL_RE, type EvolutionState } from '@ab/shared';
import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import { apiFetch } from '@/lib/http/api';
import { NUMBERS_QUERY_KEYS } from '@/lib/settings/query-keys';

// An Evolution number's live checks (numbers.manage, docs/19 «Evolution driver»): both answers
// are parsed, and any state word Evolution adds later reads as unknown (null).

const stateSchema = z.enum(EVOLUTION_STATES).nullable().catch(null);

export const evolutionStateSchema = z.object({ state: stateSchema, checked_at: z.string() });
export type EvolutionStateAnswer = z.infer<typeof evolutionStateSchema>;

export const evolutionQrSchema = z.object({
  state: stateSchema,
  qr: z.string().nullable(),
  pairing_code: z.string().nullable(),
});
export type EvolutionQrAnswer = z.infer<typeof evolutionQrSchema>;

const base = (id: string) => `/admin/numbers/${encodeURIComponent(id)}/evolution`;
const key = (id: string, what: 'state' | 'qr') => [...NUMBERS_QUERY_KEYS.numbers, id, 'evolution', what];

/** GET …/evolution/state («افحص الاتصال»): Evolution's connectionState now. */
export const evolutionStateQuery = (id: string) =>
  queryOptions({
    queryKey: key(id, 'state'),
    queryFn: async () => evolutionStateSchema.parse(await apiFetch(`${base(id)}/state`)),
  });

/** GET …/evolution/qr: a fresh QR each time (never cached once the dialog closes). */
export const evolutionQrQuery = (id: string) =>
  queryOptions({
    queryKey: key(id, 'qr'),
    queryFn: async () => evolutionQrSchema.parse(await apiFetch(`${base(id)}/qr`)),
    staleTime: 0,
    gcTime: 0,
  });

/** The QR as an image source only when it is a PNG data URL (never a link to another host). */
export const qrImageOf = (qr: string | null): string | null =>
  qr !== null && QR_DATA_URL_RE.test(qr) ? qr : null;

/** Never reported, or a word this page does not know. */
export type ShownState = EvolutionState | 'unknown';
export const shownState = (state: EvolutionState | null): ShownState => state ?? 'unknown';
