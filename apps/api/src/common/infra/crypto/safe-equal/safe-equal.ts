import { createHash, timingSafeEqual } from 'node:crypto';

const bytes = (value: string | Buffer): Buffer =>
  typeof value === 'string' ? Buffer.from(value, 'utf8') : value;

/** Constant-time compare; different lengths are a plain false because timingSafeEqual throws. */
export function safeEqual(a: string | Buffer, b: string | Buffer): boolean {
  const x = bytes(a);
  const y = bytes(b);
  return x.length === y.length && timingSafeEqual(x, y);
}

const digest = (value: string): Buffer => createHash('sha256').update(value, 'utf8').digest();

/** Constant-time compare over both SHA-256 digests, so neither the length nor a prefix leaks. */
export function digestEqual(a: string, b: string): boolean {
  return timingSafeEqual(digest(a), digest(b));
}
