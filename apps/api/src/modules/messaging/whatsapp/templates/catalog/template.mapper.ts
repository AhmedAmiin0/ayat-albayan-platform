import type { RenderableTemplate, TemplateNumberApproval, TemplateView } from '@ab/shared';
import { HttpException } from '@nestjs/common';
import { paramNames, templateButtons, templateDisplay } from '../../messages/wa-json';
import { CRM_AUTH, KAPSO_AUTH } from '../../sender/send-plan';
import type { ApprovalRow } from './templates.queries';
import type { TemplateRow, WaError } from '../../whatsapp.types';

/** audit_log.entity_id is a uuid; the template key goes in before/after (as settings do). */
export const REGISTRY_ENTITY_ID = '00000000-0000-0000-0000-000000000000';

/** `numbers` (its message_template_numbers rows) only where the caller read them: absent otherwise. */
export function toTemplateView(row: TemplateRow, numbers?: readonly ApprovalRow[]): TemplateView {
  return {
    key: row.key,
    meta_name: row.meta_name,
    language: row.language,
    category: row.category,
    header_format: row.header_format === 'document' ? 'document' : null,
    body_ar: row.body_ar,
    footer_ar: row.footer_ar,
    params: paramNames(row.params),
    buttons: templateButtons(row.buttons),
    display: templateDisplay(row.display),
    status: row.status,
    quality: row.quality,
    meta_id: row.meta_id,
    last_checked_at: row.last_checked_at,
    last_error: row.last_error,
    submitted_at: row.submitted_at,
    line: row.line,
    sales_starter: row.sales_starter,
    number_id: row.number_id,
    crm_name: row.crm_name,
    crm_language: row.crm_language,
    ...(numbers ? { numbers: numbers.map(toApproval) } : {}),
  };
}

function toApproval(a: ApprovalRow): TemplateNumberApproval {
  return { number_id: a.number_id, status: a.status, last_checked_at: a.last_checked_at, last_error: a.last_error };
}

/** Every row with its approvals per number (one read of message_template_numbers, docs/23c decision 9). */
export function withNumbers(rows: readonly TemplateRow[], approvals: readonly ApprovalRow[]): TemplateView[] {
  return rows.map((row) => toTemplateView(row, approvals.filter((a) => a.template_key === row.key)));
}

/** What renderTemplateBody / fallbackText need from a registry row. */
export function renderable(row: TemplateRow): RenderableTemplate {
  return { body_ar: row.body_ar, footer_ar: row.footer_ar, buttons: templateButtons(row.buttons) };
}

/** `{ code, message: code, …details }`, the API's error shape (docs/12 §1). */
export function waHttpError(code: string, status: number, details: Record<string, unknown> = {}): HttpException {
  return new HttpException({ code, message: code, ...details }, status);
}

/** The 409 of a template action on a crm line: its templates live in the CRM (docs/19). */
export const CRM_MANAGED = 'crm_managed';

/**
 * A driver failure → 502: kapso_auth / crm_auth when Kapso / the CRM refused its key (docs/19), else
 * meta_error with Meta's code and message; a call the crm driver does not support → 409 crm_managed.
 */
export function graphHttpError(e: WaError): HttpException {
  if (e.info.unsupported === 'crm') return waHttpError(CRM_MANAGED, 409);
  if (e.info.credential === 'kapso') return waHttpError(KAPSO_AUTH, 502);
  if (e.info.credential === 'crm') return waHttpError(CRM_AUTH, 502);
  return waHttpError('meta_error', 502, { meta_code: e.info.code, meta_message: e.info.details ?? e.message });
}
