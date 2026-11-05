import { WA_LINES, WA_PROVIDERS, type WaLine, type WaProvider } from '@ab/shared';
import { Logger } from '@nestjs/common';
import { z } from 'zod';

// «حفظ خط على ميتا» (docs/19 «CRM → Meta»): an admin who saves a line's provider (WA_PROVIDER /
// WA_CHAT_PROVIDER in «التكاملات», or a role's default number in «الأرقام») tells the listeners,
// so a line saved as meta syncs its templates once (TemplateVerifier). In-process, like the
// overlay.

export interface LineSaved {
  line: WaLine;
  provider: WaProvider;
}

type Listener = (saved: LineSaved) => Promise<void>;

const listeners = new Set<Listener>();
const log = new Logger('LineSaved');

/** Returns the unsubscribe. */
export function onLineSaved(listener: Listener): () => void {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** Never throws, never waits: the save is done, the follow-up runs in the background. */
export function lineSaved(saved: LineSaved): void {
  for (const listener of listeners) {
    listener(saved).catch((e: unknown) => {
      log.warn(`after ${saved.line} saved as ${saved.provider}: ${e instanceof Error ? e.message : String(e)}`);
    });
  }
}

const PROVIDER_KEYS: Readonly<Record<string, WaLine>> = { WA_PROVIDER: 'notifications', WA_CHAT_PROVIDER: 'chat' };
const provider = z.enum(WA_PROVIDERS);

type Values = Readonly<Record<string, string | null | undefined>>;

/** The lines a PUT /settings/integrations saved a provider for (a cleared key is not a save). */
export function savedLines(values: Values): LineSaved[] {
  return Object.entries(PROVIDER_KEYS).flatMap(([key, line]) => {
    const parsed = provider.safeParse(values[key]);
    return parsed.success ? [{ line, provider: parsed.data }] : [];
  });
}

/** A numbers write leaving a role's default, enabled number (the one module mode sends from). */
const defaultNumber = z.object({
  purpose: z.enum(WA_LINES),
  provider,
  enabled: z.literal(true),
  is_default: z.literal(true),
});

const WRITES: readonly string[] = ['create', 'update'];

/** The line a numbers write saved (its audited `after`); null for any other write or number. */
export function savedNumber(entry: { action: string; after?: unknown }): LineSaved | null {
  const row = defaultNumber.safeParse(entry.after);
  if (!WRITES.includes(entry.action) || !row.success) return null;
  return { line: row.data.purpose, provider: row.data.provider };
}
