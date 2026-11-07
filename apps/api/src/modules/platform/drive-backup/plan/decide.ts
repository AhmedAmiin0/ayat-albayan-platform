import type { ArchiveRow, RunPlan } from './archive.types';
import { dayLabel, isoWeekday, weekLabel } from './labels';

/** Fulls start on Friday (or the first night after it that has none yet), UTC. */
const FULL_WEEKDAY = 5;
const WEEK_MS = 7 * 86_400_000;

const done = (rows: readonly ArchiveRow[]) => rows.filter((r) => r.status === 'done');
const byStart = (a: ArchiveRow, b: ArchiveRow) => a.started_at.localeCompare(b.started_at);
const nextPart = (rows: readonly ArchiveRow[], plan: Pick<RunPlan, 'kind' | 'label'>): number =>
  Math.max(
    0,
    ...rows.filter((r) => r.kind === plan.kind && r.label === plan.label).map((r) => r.part),
  ) + 1;
const fullParts = (rows: readonly ArchiveRow[], label: string) =>
  done(rows).filter((r) => r.kind === 'full' && r.label === label);

/** The newest sealed full: the chain's base. */
function lastSealed(rows: readonly ArchiveRow[]): ArchiveRow | null {
  return (
    done(rows)
      .filter((r) => r.kind === 'full' && r.sealed)
      .sort(byStart)
      .at(-1) ?? null
  );
}

/** A full with parts uploaded but not sealed (a crash, the byte cap), newer than the base. */
function openFull(rows: readonly ArchiveRow[], sealed: ArchiveRow | null): string | null {
  const fulls = done(rows)
    .filter((r) => r.kind === 'full')
    .sort(byStart);
  const label = fulls.at(-1)?.label ?? null;
  const isOpen = label !== null && label !== sealed?.label;
  return isOpen ? label : null;
}

/** A new full: none yet, the last one is from before last week, or it is Friday or later. */
function fullDue(sealed: ArchiveRow | null, now: Date): boolean {
  const stale = (label: string) => label < weekLabel(new Date(now.getTime() - WEEK_MS));
  const weekly = (label: string) => label < weekLabel(now) && isoWeekday(now) >= FULL_WEEKDAY;
  return sealed === null || stale(sealed.label) || weekly(sealed.label);
}

/** The first part of the base full: incrementals after it build on it. */
const chainStart = (rows: readonly ArchiveRow[], label: string): string =>
  fullParts(rows, label).sort(byStart)[0]?.started_at ?? '';

/**
 * Tonight's archive (docs/45 §5): an open full continues; a due full starts; otherwise an
 * incremental of everything new or changed since the base full and the incrementals after it.
 */
export function decide(rows: readonly ArchiveRow[], now: Date): RunPlan {
  const sealed = lastSealed(rows);
  const open = openFull(rows, sealed);
  const fullLabel = open ?? (fullDue(sealed, now) ? weekLabel(now) : null);
  if (fullLabel !== null || sealed === null) {
    const label = fullLabel ?? weekLabel(now);
    const plan = { kind: 'full' as const, label };
    return { ...plan, base: fullParts(rows, label), firstPart: nextPart(rows, plan) };
  }
  const since = chainStart(rows, sealed.label);
  const incr = done(rows).filter((r) => r.kind === 'incr' && r.started_at > since);
  const plan = { kind: 'incr' as const, label: dayLabel(now) };
  const base = [...fullParts(rows, sealed.label), ...incr];
  return { ...plan, base, firstPart: nextPart(rows, plan) };
}
