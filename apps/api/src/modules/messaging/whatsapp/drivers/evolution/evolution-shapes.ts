import { evolutionStateOf, QR_DATA_URL_RE, type EvolutionState } from '@ab/shared';
import { z } from 'zod';

// Evolution API v2 answers the driver reads (docs/19 «Evolution driver»), each a zod schema the
// runtime client parses (a 2xx in another shape is the profile's `shape` error).

/** A send answers the stored message: {key: {id, remoteJid, fromMe}, status, …}. */
export const sentSchema = z.looseObject({ key: z.looseObject({ id: z.string().min(1) }) });

/** GET /instance/connectionState/{instance} → {instance: {instanceName, state}}. */
export const stateSchema = z.looseObject({
  instance: z.looseObject({ state: z.string().optional() }),
});

/**
 * GET /instance/connect/{instance}: a QR {pairingCode, code, base64, count} while it waits for a
 * scan, or the connectionState shape once open.
 */
const qrSchema = z.looseObject({ base64: z.string().nullish(), pairingCode: z.string().nullish() });
export const connectSchema = z.union([stateSchema, qrSchema]);

export interface EvolutionQr {
  state: EvolutionState | null;
  qr: string | null;
  pairingCode: string | null;
}

/** The QR view: only a PNG data URL is ever passed on as the image (never a link elsewhere). */
export function qrOf(body: z.infer<typeof connectSchema>): EvolutionQr {
  const open = stateSchema.safeParse(body);
  if (open.success) {
    return { state: evolutionStateOf(open.data.instance.state), qr: null, pairingCode: null };
  }
  const q = qrSchema.parse(body);
  const qr = q.base64 && QR_DATA_URL_RE.test(q.base64) ? q.base64 : null;
  return { state: 'connecting', qr, pairingCode: q.pairingCode ?? null };
}

/** POST /chat/getBase64FromMediaMessage/{instance} → {base64, mimetype, …}. */
export const mediaSchema = z.looseObject({
  base64: z.string().min(1),
  mimetype: z.string().nullish(),
});
