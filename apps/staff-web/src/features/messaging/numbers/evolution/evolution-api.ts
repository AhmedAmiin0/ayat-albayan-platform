import { evolutionCalls } from '@ab/client-core';
import { QR_DATA_URL_RE, type EvolutionState } from '@ab/shared';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/web-kit';
import { NUMBERS_QUERY_KEYS } from '@/lib/settings/query-keys';

// An Evolution number's live checks (numbers.manage, docs/19 «Evolution driver»); the server
// turns any state word Evolution adds later into null.

const evolution = evolutionCalls({ apiFetch, apiSend });

const key = (id: string, what: 'state' | 'qr') => [
  ...NUMBERS_QUERY_KEYS.numbers, id, 'evolution', what,
];

export const evolutionStateQuery = (id: string) =>
  queryOptions({ queryKey: key(id, 'state'), queryFn: () => evolution.state(id) });

/** A fresh QR each time (never cached once the dialog closes). */
export const evolutionQrQuery = (id: string) =>
  queryOptions({
    queryKey: key(id, 'qr'),
    queryFn: () => evolution.qr(id),
    staleTime: 0,
    gcTime: 0,
  });

/** The QR as an image source only when it is a PNG data URL (never a link to another host). */
export const qrImageOf = (qr: string | null): string | null =>
  qr !== null && QR_DATA_URL_RE.test(qr) ? qr : null;

/** Never reported, or a word this page does not know. */
export type ShownState = EvolutionState | 'unknown';
export const shownState = (state: EvolutionState | null): ShownState => state ?? 'unknown';
