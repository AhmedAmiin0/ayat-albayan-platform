import { communicationsCalls, numbersCalls } from '@ab/client-core';
import type { TemplateNumberSyncView } from '@ab/shared';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/web-kit';
import { NUMBERS_QUERY_KEYS } from '@/lib/settings/query-keys';

const communications = communicationsCalls({ apiFetch, apiSend });
const numbers = numbersCalls({ apiFetch, apiSend });

/** Every number; secrets as «set / not set» only. */
export const numbersQuery = queryOptions({
  queryKey: NUMBERS_QUERY_KEYS.numbers,
  queryFn: numbers.list,
});

/** Inbound rows from our own numbers, last 7 days. */
export const ownTrafficQuery = queryOptions({
  queryKey: NUMBERS_QUERY_KEYS.ownTraffic,
  queryFn: numbers.ownTraffic,
});

/** Legacy vs module, role by role. */
export const parityQuery = queryOptions({
  queryKey: NUMBERS_QUERY_KEYS.parity,
  queryFn: communications.parity,
});

export const createNumber = numbers.create;
export const updateNumber = numbers.update;
export const deleteNumber = numbers.remove;

/** Write-only (Vault); the answer never carries the value. */
export const putNumberSecret = numbers.putSecret;
export const clearNumberSecret = numbers.clearSecret;

/** dryRun true previews, false applies (idempotent). */
export const importNumbers = numbers.import;

/** 409 parity_not_empty while a difference remains (to module). */
export const setCommsSource = communications.setSource;

/** POST /admin/numbers/:id/templates/sync (templates.manage): that number's WABA list → its approvals. */
export const syncNumberTemplates = (id: string) =>
  apiSend<TemplateNumberSyncView>('POST', `/admin/numbers/${encodeURIComponent(id)}/templates/sync`);
