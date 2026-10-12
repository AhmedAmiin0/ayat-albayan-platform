import type { RenderableTemplate, TemplateView } from '@ab/shared';
import { HttpException } from '@nestjs/common';
import { paramNames, templateButtons } from './wa-json';
import type { TemplateRow } from './whatsapp.types';

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
