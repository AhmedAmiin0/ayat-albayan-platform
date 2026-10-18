import type { TemplateHealthView, TemplateLineSync, TemplateLineView, TemplateMoveView, TemplateView, WaLine } from '@ab/shared';
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

/** Both numbers as the server's env knows them (ids, driver, last sync): no Meta call, safe on mount. */
export const templateLinesQuery = queryOptions({
  queryKey: ['templates', 'lines'],
  queryFn: () => apiFetch<TemplateLineView[]>('/messaging/templates/lines'),
});

/** T2 per number (owner 2026-10-18): one line's rows against its own WABA, or both when no line is given. */
export const checkTemplateHealth = (line?: WaLine) =>
  line
    ? apiSend<TemplateHealthView>('POST', '/messaging/templates/health', { line })
    : apiSend<TemplateHealthView>('POST', '/messaging/templates/health');

/** T3: not_submitted / rejected / missing → pending, on the WABA of the row's own line. */
export const submitTemplate = (key: string) =>
  apiSend<TemplateView>('POST', `/messaging/templates/${encodeURIComponent(key)}/submit`);

/** The row now goes out from the other number; the API re-reads its status on that number's WABA. */
export const moveTemplateLine = ({ key, line }: { key: string; line: WaLine }) =>
  apiSend<TemplateMoveView>('PATCH', `/messaging/templates/${encodeURIComponent(key)}/line`, { line });

/**
 * «متاح للمعلمين والمبيعات» (the restricted allow-list, owner 2026-10-12, docs/16): the admin offers a
 * template to teachers, sales and the other limited roles, or stops.
 */
export const setStarter = ({ key, on }: { key: string; on: boolean }) =>
  apiSend<TemplateView>('PATCH', `/messaging/templates/${encodeURIComponent(key)}/starter`, { sales_starter: on });

/** A submittable row: never sent, refused, or gone from Meta (docs/12 §3.4), on either number. */
export const canSubmit = (tpl: Pick<TemplateView, 'status'>): boolean =>
  tpl.status === 'not_submitted' || tpl.status === 'rejected' || tpl.status === 'missing';

/** The number a row would move to. */
export const otherLine = (line: WaLine): WaLine => (line === 'chat' ? 'notifications' : 'chat');

const ERRORS: Record<string, string | undefined> = t.templates.error;

/** templates.error.<code> in words; meta_error carries Meta's own detail (or «—»). */
function codeText(code: string | undefined, detail: unknown): string {
  const text = code ? ERRORS[code] : undefined;
  if (!text) return t.common.error;
  if (code !== 'meta_error') return text;
  return text.replace('{message}', typeof detail === 'string' || typeof detail === 'number' ? String(detail) : '—');
}

/** templates.error.<code> in words; Meta's own message (502 meta_error) when it sent one. */
export function templateErrorText(error: unknown): string {
  const body = error instanceof ApiError ? (error.body as Record<string, unknown> | null) : null;
  return codeText(errorCode(error) ?? undefined, body?.['meta_message'] ?? body?.['meta_code']);
}

/** One number's failed sync in words (its code, Meta's message for meta_error). */
export const lineSyncErrorText = (sync: Pick<TemplateLineSync, 'error' | 'message'>): string => codeText(sync.error, sync.message);
