import type { TemplateView } from '@ab/shared';
import { queryOptions } from '@tanstack/react-query';
import { errorCode } from '@/features/schedule/api';
import { ApiError, apiFetch, apiSend } from '@/lib/api';
import { t } from '@/lib/i18n';

// Template registry routes (docs/12 §4: T1–T3). Submitting to Meta is only ever this explicit
// admin action (owner's messaging-safety rule), never automatic.

export const templatesQuery = queryOptions({
  queryKey: ['templates'],
  queryFn: () => apiFetch<TemplateView[]>('/messaging/templates'),
});

/** T2: Meta's list → status, quality, last checked (and Meta's exact text) per row. */
export const checkTemplateHealth = () => apiSend<TemplateView[]>('POST', '/messaging/templates/health');

/** T3: not_submitted / rejected / missing → pending, with Meta's id. */
export const submitTemplate = (key: string) =>
  apiSend<TemplateView>('POST', `/messaging/templates/${encodeURIComponent(key)}/submit`);

/** A submittable row: never sent, refused, or gone from Meta (docs/12 §3.4). */
export const canSubmit = (tpl: Pick<TemplateView, 'status'>): boolean =>
  tpl.status === 'not_submitted' || tpl.status === 'rejected' || tpl.status === 'missing';

const ERRORS: Record<string, string | undefined> = t.templates.error;

/** templates.error.<code> in words; Meta's own message (502 meta_error) when it sent one. */
export function templateErrorText(error: unknown): string {
  const code = errorCode(error);
  const text = code ? ERRORS[code] : undefined;
  if (!text) return t.common.error;
  if (code !== 'meta_error') return text;
  const body = error instanceof ApiError ? (error.body as Record<string, unknown> | null) : null;
  const detail = body?.['meta_message'] ?? body?.['meta_code'];
  return text.replace('{message}', typeof detail === 'string' || typeof detail === 'number' ? String(detail) : '—');
}
