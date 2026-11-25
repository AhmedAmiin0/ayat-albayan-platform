import { z } from 'zod';
import type { Dsn } from './error-report.types';

/** https://<public key>@<host>[:port]/[prefix/]<numeric project id> */
const DSN =
  /^(?<scheme>https?):\/\/(?<key>[\w-]+)@(?<host>[\w.-]+(?::\d+)?)(?<prefix>(?:\/[\w.-]+)*)\/(?<project>\d+)$/;

const groups = z.object({
  scheme: z.string(),
  key: z.string(),
  host: z.string(),
  prefix: z.string(),
  project: z.string(),
});

const dsnParts = z
  .string()
  .trim()
  .regex(DSN)
  .transform((raw) => ({ raw, ...groups.parse(DSN.exec(raw)?.groups) }));

/** A Sentry or GlitchTip DSN's envelope endpoint; null (reporting off) when unset or invalid. */
export function parseDsn(raw: string | undefined): Dsn | null {
  const parsed = dsnParts.safeParse(raw);
  if (!parsed.success) return null;
  const { scheme, key, host, prefix, project } = parsed.data;
  const endpoint = `${scheme}://${host}${prefix}/api/${project}/envelope/`;
  return { endpoint, key, dsn: parsed.data.raw };
}
