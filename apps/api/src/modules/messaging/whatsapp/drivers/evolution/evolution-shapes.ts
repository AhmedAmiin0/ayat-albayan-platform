import { evolutionStateOf, QR_DATA_URL_RE, type EvolutionState } from '@ab/shared';
import { z } from 'zod';
import type { WaSent } from '@/modules/messaging/whatsapp/whatsapp.types';
import { evolutionShapeError } from './evolution-errors';

// Evolution API v2 answers the driver reads (docs/19 «Evolution driver»), each parsed with zod.

/** A send answers the stored message: {key: {id, remoteJid, fromMe}, status, …}. */
const sentSchema = z.object({ key: z.object({ id: z.string().min(1) }) });

/** The message id of a send, else `uncertain` (Evolution sent it, but it cannot be matched). */
export function sentOf(body: unknown): WaSent {
  const sent = sentSchema.safeParse(body);
  if (!sent.success) throw evolutionShapeError('a send', true);
  return { waMessageId: sent.data.key.id };
}

/** GET /instance/connectionState/{instance} → {instance: {instanceName, state}}. */
const stateSchema = z.object({ instance: z.object({ state: z.string().optional() }) });

export function stateOf(body: unknown): EvolutionState | null {
  const s = stateSchema.safeParse(body);
  if (!s.success) throw evolutionShapeError('connectionState', false);
  return evolutionStateOf(s.data.instance.state);
}

/**
 * GET /instance/connect/{instance}: a QR {pairingCode, code, base64, count} while it waits for a
 * scan, or the connectionState shape once open.
 */
const qrSchema = z.object({
  base64: z.string().nullish(),
  pairingCode: z.string().nullish(),
});

export interface EvolutionQr {
  state: EvolutionState | null;
  qr: string | null;
  pairingCode: string | null;
}

export function qrOf(body: unknown): EvolutionQr {
  const open = stateSchema.safeParse(body);
  if (open.success) return { state: evolutionStateOf(open.data.instance.state), qr: null, pairingCode: null };
  const q = qrSchema.safeParse(body);
  if (!q.success) throw evolutionShapeError('connect', false);
  const qr = q.data.base64 && QR_DATA_URL_RE.test(q.data.base64) ? q.data.base64 : null;
  return { state: 'connecting', qr, pairingCode: q.data.pairingCode ?? null };
}

/** POST /chat/getBase64FromMediaMessage/{instance} → {base64, mimetype, …}. */
export const mediaSchema = z.object({ base64: z.string().min(1), mimetype: z.string().nullish() });
