import type { CommsSource, CommsSourceView, ImportResult, NumberCreate, NumberSecretName, NumberUpdate, NumberView, ParityView, TemplateNumberSyncView } from '@ab/shared';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@/lib/http/api';
import { NUMBERS_QUERY_KEYS } from '@/lib/settings/query-keys';

/** GET /admin/numbers (settings.read): every number; secrets as «set / not set» only. */
export const numbersQuery = queryOptions({
  queryKey: NUMBERS_QUERY_KEYS.numbers,
  queryFn: () => apiFetch<NumberView[]>('/admin/numbers'),
});

/** GET /admin/communications/parity (settings.read): legacy vs module, role by role. */
export const parityQuery = queryOptions({
  queryKey: NUMBERS_QUERY_KEYS.parity,
  queryFn: () => apiFetch<ParityView>('/admin/communications/parity'),
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

/** POST /admin/communications/source: 409 parity_not_empty while a difference remains (to module). */
export const setCommsSource = (source: CommsSource) => apiSend<CommsSourceView>('POST', '/admin/communications/source', { source });

/** POST /admin/numbers/:id/templates/sync (templates.manage): that number's WABA list → its approvals. */
export const syncNumberTemplates = (id: string) =>
  apiSend<TemplateNumberSyncView>('POST', `/admin/numbers/${encodeURIComponent(id)}/templates/sync`);
