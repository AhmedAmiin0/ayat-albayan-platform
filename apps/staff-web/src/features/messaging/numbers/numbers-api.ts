import { communicationsCalls } from '@ab/client-core';
import type {
  ImportResult,
  NumberCreate,
  NumberSecretName,
  NumberUpdate,
  NumberView,
  OwnTrafficView,
  TemplateNumberSyncView,
} from '@ab/shared';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/web-kit';
import { NUMBERS_QUERY_KEYS } from '@/lib/settings/query-keys';

const communications = communicationsCalls({ apiFetch, apiSend });

/** GET /admin/numbers (settings.read): every number; secrets as «set / not set» only. */
export const numbersQuery = queryOptions({
  queryKey: NUMBERS_QUERY_KEYS.numbers,
  queryFn: () => apiFetch<NumberView[]>('/admin/numbers'),
});

/** GET /admin/numbers/own-traffic (settings.read): inbound rows from our own numbers, last 7 days. */
export const ownTrafficQuery = queryOptions({
  queryKey: NUMBERS_QUERY_KEYS.ownTraffic,
  queryFn: () => apiFetch<OwnTrafficView>('/admin/numbers/own-traffic'),
});

/** Legacy vs module, role by role. */
export const parityQuery = queryOptions({
  queryKey: NUMBERS_QUERY_KEYS.parity,
  queryFn: communications.parity,
});

export const createNumber = (body: NumberCreate) => apiSend<NumberView>('POST', '/admin/numbers', body);

export const updateNumber = (input: { id: string; body: NumberUpdate }) =>
  apiSend<NumberView>('PATCH', `/admin/numbers/${encodeURIComponent(input.id)}`, input.body);

export const deleteNumber = (id: string) => apiSend('DELETE', `/admin/numbers/${encodeURIComponent(id)}`);

const secretPath = (id: string, name: NumberSecretName) => `/admin/numbers/${encodeURIComponent(id)}/secrets/${name}`;

/** PUT …/secrets/:name: write-only (Vault); the answer never carries the value. */
export const putNumberSecret = (input: { id: string; name: NumberSecretName; value: string }) =>
  apiSend<NumberView>('PUT', secretPath(input.id, input.name), { value: input.value });

export const clearNumberSecret = (input: { id: string; name: NumberSecretName }) =>
  apiSend<NumberView>('DELETE', secretPath(input.id, input.name));

/** POST /admin/numbers/import: dryRun true previews, false applies (idempotent). */
export const importNumbers = (dryRun: boolean) => apiSend<ImportResult>('POST', '/admin/numbers/import', { dryRun });

/** 409 parity_not_empty while a difference remains (to module). */
export const setCommsSource = communications.setSource;

/** POST /admin/numbers/:id/templates/sync (templates.manage): that number's WABA list → its approvals. */
export const syncNumberTemplates = (id: string) =>
  apiSend<TemplateNumberSyncView>('POST', `/admin/numbers/${encodeURIComponent(id)}/templates/sync`);
