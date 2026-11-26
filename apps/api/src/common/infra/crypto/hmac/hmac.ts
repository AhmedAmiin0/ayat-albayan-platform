import { createHmac } from 'node:crypto';

/** Lower-case hex HMAC-SHA256 of the chunks read as one message. */
export function hmacSha256Hex(secret: string, chunks: readonly (string | Buffer)[]): string {
  const mac = createHmac('sha256', secret);
  for (const chunk of chunks) mac.update(chunk);
  return mac.digest('hex');
}
