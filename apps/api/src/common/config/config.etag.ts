import { createHash } from 'node:crypto';

/** A weak ETag of the JSON the visitor would get; the same content always gives the same tag. */
export function etagOf(body: unknown): string {
  return `W/"${createHash('sha1').update(JSON.stringify(body)).digest('hex').slice(0, 20)}"`;
}
