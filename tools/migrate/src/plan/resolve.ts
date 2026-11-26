// resolve: collapse mapped rows that share a natural key (A1/A7/B1). Pure.
// Same key + compatible content (no column or ref where both rows hold different non-null
// values) → one merged record, `duplicate` warn. Same key + a real disagreement → `conflict`
// (review, `prefer` decides which survives). Similar-but-different names: plan/similar.ts.
import { recordHash, stableJson } from '../hash.ts';
import { keyId } from '../keys.ts';
import type { Mapped, NaturalKey, RowIssue, SourceRef, TargetRecord } from '../types.ts';

export interface Desired {
  key: NaturalKey;
  record: TargetRecord;
  hash: string;
  ref: SourceRef;
}

interface ResolveResult {
  kept: Desired[];
  issues: RowIssue[];
}

const isBlank = (v: unknown): boolean => v === null || v === undefined || v === '';

/** Name spellings of both records (matching only; see TargetRecord.aliases). */
function aliasesOf(a: TargetRecord, b: TargetRecord): Pick<TargetRecord, 'aliases'> {
  const aliases = [...new Set([...(a.aliases ?? []), ...(b.aliases ?? [])])];
  return aliases.length ? { aliases } : {};
}

/** Union of two records when no field disagrees (blank never disagrees); undefined otherwise. */
export function mergeRecords(a: TargetRecord, b: TargetRecord): TargetRecord | undefined {
  const columns = mergeColumns(a.columns, b.columns);
  const refs = mergeRefs(a.refs, b.refs);
  if (!columns || !refs) return undefined;
  return { columns, refs, ...aliasesOf(a, b) };
}

const disagrees = (mine: unknown, v: unknown): boolean =>
  !isBlank(mine) && !isBlank(v) && stableJson(mine) !== stableJson(v);

function mergeColumns(
  a: TargetRecord['columns'],
  b: TargetRecord['columns'],
): TargetRecord['columns'] | undefined {
  const columns = { ...a };
  for (const [col, v] of Object.entries(b)) {
    const mine = columns[col];
    if (disagrees(mine, v)) return undefined;
    if (isBlank(mine)) columns[col] = v;
  }
  return columns;
}

function mergeRefs(
  a: TargetRecord['refs'],
  b: TargetRecord['refs'],
): TargetRecord['refs'] | undefined {
  const refs = { ...a };
  for (const [col, nk] of Object.entries(b)) {
    const mine = refs[col];
    if (mine && keyId(mine) !== keyId(nk)) return undefined;
    if (!mine) refs[col] = nk;
  }
  return refs;
}

type Prefer = 'first' | 'last';

interface Collision {
  kept: Desired;
  issue: RowIssue;
}

function mergedDuplicate(prev: Desired, next: Desired, record: TargetRecord): Collision {
  return {
    kept: { ...prev, record, hash: recordHash(record) },
    issue: {
      code: 'duplicate',
      severity: 'warn',
      entity: next.key.entity,
      ref: next.ref,
      detail: `${prev.hash === next.hash ? 'same as' : 'merged into'} ${prev.ref.tab} row ${prev.ref.row}`,
    },
  };
}

function keptConflict(prev: Desired, next: Desired, prefer: Prefer | undefined): Collision {
  const winner = prefer === 'last' ? next : prev;
  const loser = winner === prev ? next : prev;
  return {
    kept: winner,
    issue: {
      code: 'conflict',
      severity: 'review',
      entity: next.key.entity,
      ref: loser.ref,
      detail: `same key as ${winner.ref.tab} row ${winner.ref.row}, different values`,
    },
  };
}

function collide(prev: Desired, next: Desired, prefer: Prefer | undefined): Collision {
  const record = prev.hash === next.hash ? prev.record : mergeRecords(prev.record, next.record);
  return record ? mergedDuplicate(prev, next, record) : keptConflict(prev, next, prefer);
}

export function resolve(mapped: readonly Mapped[], opts: { prefer?: Prefer } = {}): ResolveResult {
  const issues: RowIssue[] = [];
  const byKey = new Map<string, Desired>();
  for (const m of mapped) {
    issues.push(...m.issues);
    if (!m.ok) continue;
    const next: Desired = { key: m.key, record: m.value, hash: recordHash(m.value), ref: m.ref };
    const id = keyId(m.key);
    const prev = byKey.get(id);
    if (!prev) {
      byKey.set(id, next);
      continue;
    }
    const collision = collide(prev, next, opts.prefer);
    byKey.set(id, collision.kept);
    issues.push(collision.issue);
  }
  return { kept: [...byKey.values()], issues };
}
