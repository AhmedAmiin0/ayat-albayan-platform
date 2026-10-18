import type { TemplateLineFacts, WaLine } from '@ab/shared';
import { lineEnvs, lineProvider, loadEnv } from '../../env';
import { graphHttpError, waHttpError } from './template.mapper';
import { WaError, type WhatsappClient } from './whatsapp.types';

// What every registry action checks first (docs/12 §3.4, §13.9), out of template.registry.ts (150-line cap).

/** Read per call, so tests can vi.stubEnv it. */
export const syncOn = (): boolean => loadEnv().WA_TEMPLATE_SYNC !== false;

/** WA_TEMPLATE_SYNC=false (docs/12 §13.9): staging on Meta TEST credentials must not touch the registry. */
export function requireSync(): void {
  if (!syncOn()) throw waHttpError('template_sync_off', 409);
}

/** 503 not_configured naming the line: the action needs that line's WABA. */
export function requireLine(client: WhatsappClient, line: WaLine): void {
  if (!client.configured()) throw waHttpError('not_configured', 503, { line });
}

/** One line as env names it: ids only, no Graph call; `configured` is its client's. */
export function lineFacts(line: WaLine, client: Pick<WhatsappClient, 'configured'>): TemplateLineFacts {
  const env = loadEnv();
  const ids = lineEnvs(env)[line];
  return {
    line,
    configured: client.configured(),
    provider: lineProvider(env, line),
    waba_id: ids?.wabaId ?? null,
    phone_number_id: ids?.phoneNumberId ?? null,
  };
}

/** A Graph failure → 502 meta_error with Meta's code and message, or kapso_auth (docs/19). */
export async function fromMeta<T>(call: () => Promise<T>): Promise<T> {
  try {
    return await call();
  } catch (e) {
    if (!(e instanceof WaError)) throw e;
    throw graphHttpError(e);
  }
}

/** A failed list read as a line's error: the same code (and Meta's message) the 502 would carry. */
export function readError(e: WaError): { error: string; message?: string } {
  const body = graphHttpError(e).getResponse() as { code: string; meta_message?: unknown };
  return typeof body.meta_message === 'string' ? { error: body.code, message: body.meta_message } : { error: body.code };
}
