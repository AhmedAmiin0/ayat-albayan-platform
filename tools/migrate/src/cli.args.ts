// CLI argument parsing (pure). Usage in README.md §CLI.
import { parseArgs } from 'node:util';
import { parseOnly } from './delta/only.ts';

const COMMANDS = [
  'extract-sheets',
  'extract-crm',
  'dry-run',
  'apply',
  'validate',
  'review',
] as const;
export type Command = (typeof COMMANDS)[number];

export interface CliArgs {
  command: Command;
  target?: string;
  zip?: string;
  since?: string;
  confirmProduction: boolean;
  /** dry-run/apply: new records only, every update skipped (src/plan/creates-only.ts). */
  createsOnly: boolean;
  /** dry-run/apply: first local day (Asia/Riyadh) bookings create lessons on; default today. */
  from?: string;
  /** dry-run/apply: the app's subscription_expiry_days (imported student status); default 7. */
  expiryDays?: number;
  /** dry-run/apply: entities to write (comma list); others untouched (src/delta/only.ts). */
  only?: string;
}

export const USAGE = `usage: pnpm --filter @ab/migrate cli <command> [options]
  extract-sheets [--zip <path>]             Drive zip → cache/sheets/*.json
  extract-crm [--since <ISO>|last]          CRM (read-only) → cache/crm/*.json
  dry-run --target local|staging [--creates-only] [--from YYYY-MM-DD] [--only a,b] [--expiry-days N]
                                            plan only → out/plan.json, out/report.md, out/review.xlsx
  apply --target local|staging [--creates-only] [--from YYYY-MM-DD] [--only a,b] [--expiry-days N] [--confirm-production]
  validate --target local|staging           docs/06 checks → out/validate.md
  review                                    out/plan.json → out/review.xlsx`;

const validDay = (s: string): boolean =>
  /^\d{4}-\d{2}-\d{2}$/.test(s) &&
  !Number.isNaN(Date.parse(`${s}T00:00:00Z`)) &&
  new Date(`${s}T00:00:00Z`).toISOString().startsWith(s);

/** --only names entities; --from is a real calendar day; --expiry-days is the setting's 1..90. */
function checkScope(v: {
  from?: string;
  only?: string;
  'expiry-days'?: string;
}): number | undefined {
  if (v.only !== undefined) parseOnly(v.only);
  if (v.from !== undefined && !validDay(v.from))
    throw new Error(`--from must be a date YYYY-MM-DD (got ${v.from})`);
  const days = v['expiry-days'];
  if (days === undefined) return undefined;
  if (!/^\d+$/.test(days) || Number(days) < 1 || Number(days) > 90)
    throw new Error(`--expiry-days must be a whole number 1..90 (got ${days})`);
  return Number(days);
}

const NEEDS_TARGET: readonly Command[] = ['dry-run', 'apply', 'validate'];

export function parseCli(argv: readonly string[]): CliArgs {
  const { values, positionals } = parseArgs({
    args: [...argv],
    allowPositionals: true,
    strict: true,
    options: {
      target: { type: 'string' },
      zip: { type: 'string' },
      since: { type: 'string' },
      'confirm-production': { type: 'boolean', default: false },
      'creates-only': { type: 'boolean', default: false },
      from: { type: 'string' },
      only: { type: 'string' },
      'expiry-days': { type: 'string' },
    },
  });
  const command = positionals[0];
  if (!command || !(COMMANDS as readonly string[]).includes(command)) throw new Error(USAGE);
  const cmd = command as Command;
  if (NEEDS_TARGET.includes(cmd) && !values.target)
    throw new Error(`${cmd} needs --target\n${USAGE}`);
  if (values.since && values.since !== 'last' && Number.isNaN(Date.parse(values.since))) {
    throw new Error(`--since must be an ISO date-time or 'last' (got ${values.since})`);
  }
  const expiryDays = checkScope(values);
  return {
    command: cmd,
    target: values.target,
    zip: values.zip,
    since: values.since,
    confirmProduction: values['confirm-production'] === true,
    createsOnly: values['creates-only'] === true,
    from: values.from,
    only: values.only,
    expiryDays,
  };
}
