import type { CheckRun, Facts } from './facts.schemas.ts';

/** The workflow's own job (lane-automerge.yml) is still in progress while it decides. */
export const SELF = 'lane automerge';
/**
 * The title check runs again on the same commit when the title is edited and its old failure
 * stays on the head; decide.ts reads the live title itself, so its runs are not read here.
 */
const TITLE = 'pr title';
const UNREAD = new Set([SELF, TITLE]);
export const REQUIRED: readonly string[] = ['check', 'guards'];
const OK = new Set(['success', 'skipped', 'neutral']);

const pending = (r: CheckRun): boolean => r.status !== 'completed';
const passed = (runs: readonly CheckRun[], name: string): boolean =>
  runs.some((r) => r.name === name && r.conclusion === 'success');
/** A run cancelled by a newer one (a `concurrency` group) is moot once the same check passed. */
const superseded = (r: CheckRun, runs: readonly CheckRun[]): boolean =>
  r.conclusion === 'cancelled' && passed(runs, r.name);
const failed = (r: CheckRun, runs: readonly CheckRun[]): boolean =>
  !OK.has(r.conclusion ?? '') && !superseded(r, runs);
const names = (runs: readonly CheckRun[]): string => runs.map((r) => r.name).join(', ');
const failures = (runs: readonly CheckRun[]): string =>
  runs.map((r) => `${r.name} ${r.conclusion ?? ''}`).join(', ');

type Rule = (f: Pick<Facts, 'checks' | 'statuses'>) => string | null;

const RULES: readonly Rule[] = [
  ({ checks }) => {
    const hits = checks.filter(pending);
    return hits.length > 0 ? `pending: ${names(hits)}` : null;
  },
  ({ checks }) => {
    const hits = checks.filter((r) => failed(r, checks));
    return hits.length > 0 ? `not green: ${failures(hits)}` : null;
  },
  ({ statuses }) => {
    const hits = statuses.filter((s) => s.state !== 'success');
    return hits.length > 0 ? `status not green: ${hits.map((s) => s.context).join(', ')}` : null;
  },
  ({ checks }) => {
    const missing = REQUIRED.find((name) => !passed(checks, name));
    return missing === undefined ? null : `${missing} did not pass`;
  },
];

/** Why the head commit's checks are not all green, or null when they are. */
export function notGreen(facts: Pick<Facts, 'checks' | 'statuses'>): string | null {
  const checks = facts.checks.filter((r) => !UNREAD.has(r.name));
  for (const rule of RULES) {
    const reason = rule({ checks, statuses: facts.statuses });
    if (reason !== null) return reason;
  }
  return null;
}
