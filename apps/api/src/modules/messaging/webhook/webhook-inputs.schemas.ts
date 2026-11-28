import { z } from 'zod';

// The webhook routes read their request through @Req (the signature is checked on the raw bytes),
// so the few header and query values they use are parsed here. Never a 400: an unreadable value
// reads as absent, which the route answers as it always did (401 / 403).

const text = z.string().optional().catch(undefined);
const headerValue = z
  .union([z.string(), z.array(z.string())])
  .optional()
  .catch(undefined);

/** Meta's subscribe handshake (GET /webhooks/whatsapp). */
export const hubQuerySchema = z.object({
  'hub.mode': text,
  'hub.verify_token': text,
  'hub.challenge': text,
});

export const metaHeadersSchema = z.object({ 'x-hub-signature-256': text });

/** Only the two signature headers Kapso may send are read. */
export const kapsoHeadersSchema = z.object({
  'x-webhook-signature': headerValue,
  'x-hub-signature-256': headerValue,
});

export const wacrmHeadersSchema = z.object({ 'x-wacrm-signature': text });
