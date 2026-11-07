import type { TemplateNumberSyncView } from '@ab/shared';
import { z } from 'zod';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';

// «مزامنة القوالب مع هذا الرقم» in words (docs/23c decision 9, owner 2026-11-07): every code the
// endpoint answers, as a refused call or as a sync that failed, through one lookup map. Pure.

const s = t.numbers.templateSync;
const ERRORS: Record<string, string | undefined> = s.errors;

/** A refused call's body: its code (ours) or Nest's message, and the detail some codes carry. */
const bodySchema = z
  .object({
    code: z.string(),
    message: z.string(),
    scope: z.string(),
    meta_message: z.string(),
  })
  .partial();

/** The refused call's body as parsed; {} for a non-API failure or another shape. */
const bodyOf = (error: unknown) =>
  (error instanceof ApiError ? bodySchema.safeParse(error.body).data : undefined) ?? {};

type SyncResult = Pick<
  TemplateNumberSyncView,
  'ok' | 'error' | 'message' | 'meta_count' | 'synced' | 'line'
>;

/**
 * One code in words (Meta's message or the missing CRM scope in {{message}}); unknown → «حدث خطأ».
 */
export function syncCodeText(code: string | undefined, detail?: string): string {
  const text = ERRORS[code ?? ''] ?? t.numbers.errors.generic;
  return s.failed.replace('{{error}}', text.replace('{{message}}', detail ?? '—'));
}

/** A refused sync call (403 guard, 404, 409, 502…) in words. */
export function syncErrorText(error: unknown): string {
  const body = bodyOf(error);
  return syncCodeText(body.code ?? body.message, body.scope ?? body.meta_message);
}

/** A sync's answer: what it found (naming the line when the line's sync ran), or why it failed. */
export function syncResultText(sync: SyncResult): string {
  if (!sync.ok) return syncCodeText(sync.error, sync.message);
  const done = sync.line ? s.doneLine.replace('{{line}}', t.enums.waLine[sync.line]) : s.done;
  return done
    .replace('{{meta}}', String(sync.meta_count))
    .replace('{{synced}}', String(sync.synced));
}
