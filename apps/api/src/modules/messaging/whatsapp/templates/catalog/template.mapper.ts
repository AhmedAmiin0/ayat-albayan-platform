import type { RenderableTemplate, TemplateNumberApproval, TemplateView } from '@ab/shared';
import { HttpException } from '@nestjs/common';
import { paramNames, templateButtons, templateDisplay } from '@/modules/messaging/whatsapp/messages/wa-json';
import { CRM_AUTH, EVOLUTION_AUTH, KAPSO_AUTH } from '@/modules/messaging/whatsapp/sender/send-plan';
import type { ApprovalRow } from './templates.repo';
import type { TemplateRow, WaError } from '@/modules/messaging/whatsapp/whatsapp.types';

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
    created_by: row.created_by,
    approved_edits: row.approved_edits,
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

/** Evolution has no template list or submit of ours (docs/19 «Evolution driver»). */
export const EVOLUTION_NO_TEMPLATES = 'evolution_no_templates';

const UNSUPPORTED_CODE: Record<NonNullable<WaError['info']['unsupported']>, string> = {
  crm: CRM_MANAGED,
  evolution: EVOLUTION_NO_TEMPLATES,
};

const CREDENTIAL_CODE: Record<NonNullable<WaError['info']['credential']>, string> = {
  kapso: KAPSO_AUTH,
  crm: CRM_AUTH,
  evolution: EVOLUTION_AUTH,
};

/** The CRM's 403 naming a scope its key lacks (templates:read on «مزامنة», docs/39). */
const CRM_SCOPE_MISSING = 'crm_scope_missing';

type ToHttp = (e: WaError) => HttpException | undefined;

const unsupportedHttp: ToHttp = (e) => {
  const code = e.info.unsupported ? UNSUPPORTED_CODE[e.info.unsupported] : undefined;
  return code ? waHttpError(code, 409) : undefined;
};

const scopeHttp: ToHttp = (e) =>
  (e.info.missingScope ? waHttpError(CRM_SCOPE_MISSING, 502, { scope: e.info.missingScope }) : undefined);

const credentialHttp: ToHttp = (e) => {
  const code = e.info.credential ? CREDENTIAL_CODE[e.info.credential] : undefined;
  return code ? waHttpError(code, 502) : undefined;
};

/**
 * A driver failure → 502: crm_scope_missing (with `scope`) when the CRM key lacks a scope, kapso_auth
 * / crm_auth when Kapso / the CRM refused its key (docs/19), else meta_error with Meta's code and
 * message; a call the crm driver does not support → 409 crm_managed.
 */
export function graphHttpError(e: WaError): HttpException {
  return unsupportedHttp(e) ?? scopeHttp(e) ?? credentialHttp(e)
    ?? waHttpError('meta_error', 502, { meta_code: e.info.code, meta_message: e.info.details ?? e.message });
}
