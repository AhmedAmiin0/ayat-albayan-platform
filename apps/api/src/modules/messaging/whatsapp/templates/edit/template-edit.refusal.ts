import type { HttpException } from '@nestjs/common';
import { z } from 'zod';
import { ar } from '@/common/infra/i18n/server-text';
import { waHttpError } from '@/modules/messaging/whatsapp/templates/catalog/template.mapper';

// A refused edit or new template (owner 2026-11-14): the code the clients map, and the same
// reason in clear Modern Standard Arabic (`message_ar`, ar.json templates.error) for any reader.

/** Everything else is 409 (the template's state or content). */
const STATUS: Readonly<Record<string, number>> = {
  not_author_editable: 403,
  author_daily_limit: 429,
};

const placeholder = z.union([z.string(), z.number()]);

/** `{max}` and other placeholders filled from the details (a string or a number). */
const filled = (text: string, details: Record<string, unknown>): string =>
  text.replace(/\{(\w+)\}/g, (all, name: string) => {
    const value = placeholder.safeParse(details[name]);
    return value.success ? String(value.data) : all;
  });

export function refusalHttp(code: string, details: Record<string, unknown> = {}): HttpException {
  // Read per call: TranslationsService merges the admins' wording into `ar` in place.
  const texts: Readonly<Record<string, string | undefined>> = ar.templates.error;
  const text = texts[code];
  const message_ar = text ? { message_ar: filled(text, details) } : {};
  return waHttpError(code, STATUS[code] ?? 409, { ...details, ...message_ar });
}
