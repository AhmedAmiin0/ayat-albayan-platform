import { isWaLine, type WaLine } from '@ab/shared';
import { numberByPhoneId, overlayNumbers } from '@/common/configuration/integrations/numbers-overlay';
import { lineEnvs, loadEnv, type KapsoLineEnv, type LineEnvs, type WhatsappEnv } from '@/config/env/env';

// Which of our numbers run on the Kapso driver, with the Kapso key the senders already use (the
// integration config / Vault through loadEnv() or the numbers overlay; never a new env var). Holds
// the key: never log a result. Module mode reads the numbers overlay; legacy the two lines.

export interface KapsoNumber {
  env: KapsoLineEnv;
  line: WaLine;
  /** The wa_numbers row, module mode only (legacy resolves it from the database). */
  numberId?: string;
}

const isKapso = (env: WhatsappEnv | null): env is KapsoLineEnv => env?.provider === 'kapso';

/** Legacy: each line whose driver is Kapso. */
function legacyLines(lines: LineEnvs): KapsoNumber[] {
  const out: KapsoNumber[] = [];
  for (const line of ['chat', 'notifications'] as const) {
    const env = lines[line];
    if (isKapso(env)) out.push({ env, line });
  }
  return out;
}

/** The Kapso number Meta names by this phone_number_id; null = not ours or not on Kapso (ignored). */
export function kapsoNumberFor(phoneNumberId: string, read: () => LineEnvs = () => lineEnvs(loadEnv())): KapsoNumber | null {
  if (overlayNumbers()) {
    const n = numberByPhoneId(phoneNumberId);
    return n && isKapso(n.env) && isWaLine(n.purpose)
      ? { env: n.env, line: n.purpose, numberId: n.id }
      : null;
  }
  return legacyLines(read()).find((n) => n.env.phoneNumberId === phoneNumberId) ?? null;
}

/** Every enabled chat number on Kapso: the catch-up job's work list. */
export function kapsoChatNumbers(read: () => LineEnvs = () => lineEnvs(loadEnv())): KapsoNumber[] {
  const numbers = overlayNumbers();
  if (!numbers) return legacyLines(read()).filter((n) => n.line === 'chat');
  return numbers.flatMap((n) => (n.enabled && n.purpose === 'chat' && isKapso(n.env) ? [{ env: n.env, line: n.purpose, numberId: n.id }] : []));
}
