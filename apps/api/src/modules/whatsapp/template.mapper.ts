import type { RenderableTemplate, TemplateView } from '@ab/shared';
import { HttpException } from '@nestjs/common';
import { paramNames, templateButtons } from './wa-json';
import { KAPSO_AUTH } from './send-plan';
import type { TemplateRow, WaError } from './whatsapp.types';

/** audit_log.entity_id is a uuid; the template key goes in before/after (as settings do). */
export const REGISTRY_ENTITY_ID = '00000000-0000-0000-0000-000000000000';

export function toTemplateView(row: TemplateRow): TemplateView {
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
    status: row.status,
    quality: row.quality,
    meta_id: row.meta_id,
    last_checked_at: row.last_checked_at,
    last_error: row.last_error,
    submitted_at: row.submitted_at,
    line: row.line,
    sales_starter: row.sales_starter,
  };
}

/** What renderTemplateBody / fallbackText need from a registry row. */
export function renderable(row: TemplateRow): RenderableTemplate {
  return { body_ar: row.body_ar, footer_ar: row.footer_ar, buttons: templateButtons(row.buttons) };
}

/** `{ code, message: code, …details }`, the API's error shape (docs/12 §1). */
export function waHttpError(code: string, status: number, details: Record<string, unknown> = {}): HttpException {
  return new HttpException({ code, message: code, ...details }, status);
}

/** A Graph failure → 502: kapso_auth when Kapso refused its key (docs/19), else meta_error with Meta's code and message. */
export function graphHttpError(e: WaError): HttpException {
  if (e.info.credential === 'kapso') return waHttpError(KAPSO_AUTH, 502);
  return waHttpError('meta_error', 502, { meta_code: e.info.code, meta_message: e.info.details ?? e.message });
}
