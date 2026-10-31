import type { CRM_TEMPLATE_STATUSES, TemplateCreateInput, TemplateHealthView, TemplateLineSync, TemplateLineView, TemplateMoveView, TemplateNumberSetView, TemplateView, WaLine } from '@ab/shared';
import { queryOptions } from '@tanstack/react-query';
import { errorCode } from '@/features/teaching/schedule';
import { ApiError, apiFetch, apiSend } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';

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

/** «قالب جديد» (owner 2026-10-31): a new row, not submitted; 409 template_exists. */
export const createTemplate = (input: TemplateCreateInput) => apiSend<TemplateView>('POST', '/messaging/templates', input);

/** T3: not_submitted / rejected / missing → pending, on the WABA of the row's own line. */
export const submitTemplate = (key: string) =>
  apiSend<TemplateView>('POST', `/messaging/templates/${encodeURIComponent(key)}/submit`);

/** The row now goes out from the other number; the API re-reads its status on that number's WABA. */
export const moveTemplateLine = ({ key, line }: { key: string; line: WaLine }) =>
  apiSend<TemplateMoveView>('PATCH', `/messaging/templates/${encodeURIComponent(key)}/line`, { line });

/** docs/23c decision 9: the template's own number; null = its role's default (404 unknown_number). */
export const setTemplateNumber = ({ key, number_id }: { key: string; number_id: string | null }) =>
  apiSend<TemplateNumberSetView>('PUT', `/messaging/templates/${encodeURIComponent(key)}/number`, { number_id });

/**
 * «متاح للمعلمين والمبيعات» (the restricted allow-list, owner 2026-10-12, docs/16): the admin offers a
 * template to teachers, sales and the other limited roles, or stops.
 */
export const setStarter = ({ key, on }: { key: string; on: boolean }) =>
  apiSend<TemplateView>('PATCH', `/messaging/templates/${encodeURIComponent(key)}/starter`, { sales_starter: on });

/** A crm line's template status by hand (docs/19): «معتمد في نظام CRM» / «غير متاح في نظام CRM»; audited. */
export const setCrmStatus = ({ key, status }: { key: string; status: CrmTemplateStatus }) =>
  apiSend<TemplateView>('PUT', `/messaging/templates/${encodeURIComponent(key)}/crm-status`, { status });

/** A crm line's template name / language in the CRM (docs/19); null = the default; audited. */
export const setCrmName = ({ key, ...body }: { key: string; crm_name: string | null; crm_language: string | null }) =>
  apiSend<TemplateView>('PUT', `/messaging/templates/${encodeURIComponent(key)}/crm-name`, body);

/** A submittable row: never sent, refused, or gone from Meta (docs/12 §3.4), on either number. */
export const canSubmit = (tpl: Pick<TemplateView, 'status'>): boolean =>
  tpl.status === 'not_submitted' || tpl.status === 'rejected' || tpl.status === 'missing';

/** The number a row would move to. */
export const otherLine = (line: WaLine): WaLine => (line === 'chat' ? 'notifications' : 'chat');

export type CrmTemplateStatus = (typeof CRM_TEMPLATE_STATUSES)[number];

const ERRORS: Record<string, string | undefined> = t.templates.error;
/** The app id a line's sample upload needs (409 needs_app_id). */
const APP_ID_KEY: Record<WaLine, string> = { notifications: 'WA_APP_ID', chat: 'WA_CHAT_APP_ID' };

interface CodeInput {
  code: string | undefined;
  /** Meta's own message or code (meta_error). */
  detail: unknown;
  /** The line the API named (not_configured, needs_app_id, needs_meta_driver); notifications when none. */
  line: unknown;
}

/** templates.error.<code> in words: meta_error carries Meta's detail (or «—»), the rest name their line. */
function codeText({ code, detail, line }: CodeInput): string {
  const text = code ? ERRORS[code] : undefined;
  if (!text) return t.common.error;
  if (code === 'meta_error') return text.replace('{message}', typeof detail === 'string' || typeof detail === 'number' ? String(detail) : '—');
  const named: WaLine = line === 'chat' ? 'chat' : 'notifications';
  return text.replace('{line}', t.enums.waLine[named]).replace('{key}', APP_ID_KEY[named]);
}

/** templates.error.<code> in words; Meta's own message (502 meta_error) when it sent one. */
export function templateErrorText(error: unknown): string {
  const body = error instanceof ApiError ? (error.body as Record<string, unknown> | null) : null;
  return codeText({ code: errorCode(error) ?? undefined, detail: body?.['meta_message'] ?? body?.['meta_code'], line: body?.['line'] });
}

type FailedSync = Pick<TemplateLineSync, 'line' | 'error' | 'message'>;

/** One number's failed sync in words (its code, Meta's message for meta_error, its line). */
export const lineSyncErrorText = (sync: FailedSync): string => codeText({ code: sync.error, detail: sync.message, line: sync.line });

/** «تعذّرت مزامنة {line}: {error}» for one number's failed sync. */
export const syncFailedText = (sync: FailedSync): string =>
  t.templates.perNumber.syncFailed.replace('{line}', t.enums.waLine[sync.line]).replace('{error}', lineSyncErrorText(sync));
