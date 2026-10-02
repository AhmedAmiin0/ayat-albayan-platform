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

export interface ResolveResult {
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
  const columns = { ...a.columns };
  for (const [col, v] of Object.entries(b.columns)) {
    const mine = columns[col];
    if (isBlank(mine)) columns[col] = v;
    else if (!isBlank(v) && stableJson(mine) !== stableJson(v)) return undefined;
  }
  const refs = { ...a.refs };
  for (const [col, nk] of Object.entries(b.refs)) {
    const mine = refs[col];
    if (!mine) refs[col] = nk;
    else if (keyId(mine) !== keyId(nk)) return undefined;
  }
  return { columns, refs, ...aliasesOf(a, b) };
}

export function resolve(
  mapped: readonly Mapped[],
  opts: { prefer?: 'first' | 'last' } = {},
): ResolveResult {
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
    const merged = prev.hash === next.hash ? prev.record : mergeRecords(prev.record, next.record);
    if (merged) {
      byKey.set(id, { ...prev, record: merged, hash: recordHash(merged) });
      issues.push({
        code: 'duplicate',
        severity: 'warn',
        entity: m.key.entity,
        ref: next.ref,
        detail: `${prev.hash === next.hash ? 'same as' : 'merged into'} ${prev.ref.tab} row ${prev.ref.row}`,
      });
      continue;
    }
    const winner = opts.prefer === 'last' ? next : prev;
    const loser = winner === prev ? next : prev;
    byKey.set(id, winner);
    issues.push({
      code: 'conflict',
      severity: 'review',
      entity: m.key.entity,
      ref: loser.ref,
      detail: `same key as ${winner.ref.tab} row ${winner.ref.row}, different values`,
    });
  }
  return { kept: [...byKey.values()], issues };
}
