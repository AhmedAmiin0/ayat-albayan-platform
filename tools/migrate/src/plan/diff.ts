// plan: desired records vs what the target holds → create / update / skip / adopt. Pure.
// Records arrive in APPLY_ORDER; a record whose ref is neither planned nor in the target is
// rejected (missing_ref), and so is everything that depends on it.
import { keyId } from '../keys.ts';
import { APPLY_ORDER } from '../types.ts';
import type { Existing, PlanAction, PlanCounts, PlanItem, RowIssue } from '../types.ts';
import type { Desired } from './resolve.ts';

export interface DiffInput {
  desired: readonly Desired[];
  /** keyId → existing: import_items rows, plus adopted rows found by unique column (hash null). */
  existing: ReadonlyMap<string, Existing>;
}

export interface DiffResult {
  items: PlanItem[];
  issues: RowIssue[];
}

function actionFor(d: Desired, e: Existing | undefined): PlanAction {
  if (!e) return 'create';
  if (e.hash === null) return 'adopt';
  return e.hash === d.hash ? 'skip' : 'update';
}

const order = (d: Desired): number => APPLY_ORDER.indexOf(d.key.entity);

export function diffPlan(input: DiffInput): DiffResult {
  const sorted = [...input.desired].sort((a, b) => order(a) - order(b));
  const planned = new Set<string>();
  const items: PlanItem[] = [];
  const issues: RowIssue[] = [];
  for (const d of sorted) {
    const id = keyId(d.key);
    if (planned.has(id)) throw new Error(`diffPlan: ${id} twice — run resolve() first`);
    const missing = Object.entries(d.record.refs).filter(([, nk]) => {
      const rid = keyId(nk);
      return !planned.has(rid) && !input.existing.has(rid);
    });
    if (missing.length) {
      issues.push({
        code: 'missing_ref',
        severity: 'reject',
        entity: d.key.entity,
        ref: d.ref,
        field: missing.map(([col]) => col).join(','),
        detail: missing.map(([, nk]) => keyId(nk)).join(' '),
      });
      continue;
    }
    planned.add(id);
    const e = input.existing.get(id);
    items.push({
      key: d.key,
      action: actionFor(d, e),
      targetId: e?.targetId ?? null,
      hash: d.hash,
      record: d.record,
      ref: d.ref,
    });
  }
  return { items, issues };
}

/** Per entity: how many of each action, plus rejected/review issue counts. */
export function countPlan(result: DiffResult): PlanCounts {
  const counts: PlanCounts = {};
  const bucket = (entity: PlanItem['key']['entity']) =>
    (counts[entity] ??= { create: 0, update: 0, skip: 0, adopt: 0, reject: 0, review: 0 });
  for (const i of result.items) bucket(i.key.entity)[i.action]++;
  for (const i of result.issues) if (i.severity !== 'warn') bucket(i.entity)[i.severity]++;
  return counts;
}
