// --only <entities>: every other entity is planned as untouched (skip, its issues left out), and so
// is every lesson starting before --from with its lesson_students rows: under --only the run adds
// upcoming bookings, never history. A record whose ref then has no target row is skipped too.
import { keyId } from '../keys.ts';
import { APPLY_ORDER } from '../types.ts';
import type { EntityName, PlanItem, RowIssue } from '../types.ts';
import type { PlanWithChanges } from '../plan/changes.ts';
import { countPlan } from '../plan/diff.ts';

export interface OnlyScope {
  only: ReadonlySet<EntityName>;
  /** UTC ISO of --from 00:00 Asia/Riyadh. */
  fromUtc: string;
}

/** `guardians,students` → entity set; throws on a name that is no entity. */
export function parseOnly(raw: string): Set<EntityName> {
  const names = raw
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  const bad = names.filter((n) => !(APPLY_ORDER as readonly string[]).includes(n));
  if (names.length === 0 || bad.length)
    throw new Error(
      `--only: unknown entity ${bad.join(', ') || '(empty)'}; one of ${APPLY_ORDER.join(', ')}`,
    );
  return new Set(names as EntityName[]);
}

const skip = (i: PlanItem): PlanItem => (i.action === 'skip' ? i : { ...i, action: 'skip' });

/** keyIds of lessons that start before --from. */
function pastLessons(items: readonly PlanItem[], fromUtc: string): Set<string> {
  const from = Date.parse(fromUtc);
  return new Set(
    items
      .filter((i) => i.key.entity === 'lessons')
      .filter((i) => {
        const at = i.record.columns['starts_at'];
        return typeof at !== 'string' || Date.parse(at) < from;
      })
      .map((i) => keyId(i.key)),
  );
}

/**
 * In APPLY_ORDER: a record that would be written while a ref names a planned record that has no
 * target row (a skipped create) is skipped with a missing_ref issue, and so on down the chain.
 */
export function skipUnresolvable(plan: PlanWithChanges): PlanWithChanges {
  const noRow = new Set<string>();
  const issues: RowIssue[] = [];
  const order = (i: PlanItem) => APPLY_ORDER.indexOf(i.key.entity);
  const byId = new Map<string, PlanItem>();
  for (const item of [...plan.items].sort((a, b) => order(a) - order(b))) {
    const lost = Object.entries(item.record.refs).filter(([, nk]) => noRow.has(keyId(nk)));
    let out = item;
    if (lost.length && item.action !== 'skip') {
      out = skip(item);
      const field = lost.map(([c]) => c).join(',');
      issues.push({
        code: 'missing_ref',
        severity: 'reject',
        entity: item.key.entity,
        ref: item.ref,
        field,
      });
    }
    if (out.action === 'skip' && out.targetId === null) noRow.add(keyId(out.key));
    byId.set(keyId(out.key), out);
  }
  const items = plan.items.map((i) => byId.get(keyId(i.key)) ?? i);
  const all = { items, issues: [...plan.issues, ...issues] };
  return { ...plan, ...all, counts: countPlan(all) };
}

/** Parent entity → its link table and the link's ref to it. */
const LINKS = [
  ['lesson_students', 'lesson_id'],
  ['schedule_rule_students', 'rule_id'],
] as const;

/**
 * A new lesson or rule any of whose new student links was skipped (its student left out) is
 * skipped too: the platform would otherwise book it with no student, or a group short of a child.
 * Only link tables named in --only count (leaving a link table out is the caller's choice).
 */
export function skipPartialParents(plan: PlanWithChanges, only: ReadonlySet<EntityName>) {
  const lost = new Set<string>();
  for (const [table, col] of LINKS) {
    if (!only.has(table)) continue;
    for (const l of plan.items) {
      const parent = l.key.entity === table ? l.record.refs[col] : undefined;
      if (parent && l.action === 'skip' && l.targetId === null) lost.add(keyId(parent));
    }
  }
  const items = plan.items.map((i) =>
    i.action === 'create' && lost.has(keyId(i.key)) ? skip(i) : i,
  );
  return skipUnresolvable({ ...plan, items, counts: countPlan({ items, issues: plan.issues }) });
}

export function onlyEntities(plan: PlanWithChanges, scope: OnlyScope): PlanWithChanges {
  const past = pastLessons(plan.items, scope.fromUtc);
  const untouched = (i: PlanItem): boolean => {
    if (!scope.only.has(i.key.entity) || past.has(keyId(i.key))) return true;
    const lesson = i.key.entity === 'lesson_students' ? i.record.refs['lesson_id'] : undefined;
    return lesson !== undefined && past.has(keyId(lesson));
  };
  const items = plan.items.map((i) => (untouched(i) ? skip(i) : i));
  const issues = plan.issues.filter((i) => scope.only.has(i.entity));
  const changes = plan.changes.filter((c) => scope.only.has(c.entity));
  const scoped = { ...plan, items, issues, changes, counts: countPlan({ items, issues }) };
  return skipPartialParents(skipUnresolvable(scoped), scope.only);
}
