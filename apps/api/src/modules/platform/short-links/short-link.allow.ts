import { z } from 'zod';

// No open redirect (docs/19 «Short links»): only the server writes a target, and it must be https
// on
// one of our own origins (the web app, the API) or Google Meet. Anything else is refused at write
// time.

/** The meeting host the reminders may carry as is (a teacher's fixed Meet link). */
const MEET_HOST = 'meet.google.com';

const httpsUrl = z.url({ protocol: /^https$/ });

/** The hosts of these origins (blank or unparsable ones are skipped), plus Google Meet. */
export function allowedHosts(origins: readonly string[]): Set<string> {
  const hosts = origins.flatMap((o) => {
    const parsed = z.url().safeParse(o.trim());
    return parsed.success ? [new URL(parsed.data).host] : [];
  });
  return new Set([...hosts, MEET_HOST]);
}

/** https, no user:password, on an allowed host (exact, port included). */
export function isAllowedTarget(url: string, hosts: ReadonlySet<string>): boolean {
  const parsed = httpsUrl.safeParse(url);
  if (!parsed.success) return false;
  const u = new URL(parsed.data);
  const plain = u.username === '' && u.password === '';
  return plain && hosts.has(u.host);
}
