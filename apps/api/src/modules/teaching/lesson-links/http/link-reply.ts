import { ar } from '@/common/infra/i18n/server-text';
import type { LinkReply } from './link-reply.types';

const PRIVATE_HEADERS: readonly (readonly [string, string])[] = [
  ['Cache-Control', 'no-store'],
  ['Referrer-Policy', 'no-referrer'],
  ['X-Content-Type-Options', 'nosniff'],
];

/** 302 to the target, else 404 with the short Arabic «invalid link» text (as GET /r/:code). */
export function answerLink(res: LinkReply, target: string | null): string {
  for (const [name, value] of PRIVATE_HEADERS) res.header(name, value);
  res.status(target ? 302 : 404);
  res.header(target ? 'Location' : 'Content-Type', target ?? 'text/plain; charset=utf-8');
  return target ? '' : ar.shortLinks.notFound;
}
