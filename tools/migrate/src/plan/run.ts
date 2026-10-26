// map → resolve → plan over the extracted cache. Shared by dry-run and apply.
import { cachePath, readJson } from '../cache.ts';
import type { EntityModule, SourceBundle } from '../entities/contract.ts';
import type { TargetDb } from '../db/target.ts';
import { keyId } from '../keys.ts';
import { CRM_TABLES } from '../sources/crm.schema.ts';
import { SHEETS } from '../sources/headers.ts';
import { loadTeacherDirectory } from '../sources/teachers.dir.ts';
import type { ZipEntryInfo } from '../sources/zip.ts';
import { ZIP_FILES, zipFileRows } from '../pdf-import/files.ts';
import { APPLY_ORDER } from '../types.ts';
import type {
  CrmRow,
  EntityName,
  Existing,
  Plan,
  RowIssue,
  SourceRow,
  TargetName,
} from '../types.ts';
import { type PlanWithChanges, loadChanges } from './changes.ts';
import { checkCodes } from './codes.ts';
import { matchTemplates } from './templates.target.ts';
import { countPlan, diffPlan } from './diff.ts';
import { matchTarget } from './match.target.ts';
import { type RecreateScope, dropOrphans } from '../delta/orphans.ts';
import { type Desired, resolve } from './resolve.ts';
import { samePhoneTeachers, similarStudents } from './similar.ts';

/**
 * Everything extract-sheets / extract-crm left in cache/ (missing files read as empty), plus the
 * owner's teacher directory (required) and approved PDF matches.
 */
export function loadBundle(today: string, from?: string): SourceBundle {
  loadTeacherDirectory();
  const sheets = Object.fromEntries(
    SHEETS.map((s) => [s.id, readJson<SourceRow[]>(cachePath.sheet(s.id), [])]),
  );
  sheets[ZIP_FILES] = zipFileRows(readJson<ZipEntryInfo[]>(cachePath.files(), []));
  const crm = Object.fromEntries(
    CRM_TABLES.map((t) => [t.table, readJson<CrmRow[]>(cachePath.crm(t.table), [])]),
  );
  const approvedPdfs = new Set(readJson<string[]>(cachePath.pdfApproved(), []));
  return { sheets, crm, earlier: new Map(), today, from, approvedPdfs };
}

export interface MapResult {
  desired: Desired[];
  issues: RowIssue[];
}

/** Runs each module in APPLY_ORDER, feeding accepted records forward through bundle.earlier. */
export function mapAll(bundle: SourceBundle, modules: readonly EntityModule[]): MapResult {
  const earlier = new Map<EntityName, readonly Desired[]>();
  const desired: Desired[] = [];
  const issues: RowIssue[] = [];
  for (const entity of APPLY_ORDER) {
    const mod = modules.find((m) => m.entity === entity);
    if (!mod) continue;
    const r = resolve(mod.map({ ...bundle, earlier }), { prefer: mod.prefer });
    earlier.set(entity, r.kept);
    desired.push(...r.kept);
    issues.push(...r.issues);
  }
  issues.push(...similarStudents(desired), ...samePhoneTeachers(desired));
  return { desired, issues };
}

/** import_items of the planned entities + adoptable rows found by each module's unique column. */
export async function loadExisting(o: {
  db: TargetDb;
  modules: readonly EntityModule[];
  desired: readonly Desired[];
  /** Runs before adoption: may drop import items (orphans.ts), which are then planned as new. */
  prune?: (existing: Map<string, Existing>) => Promise<void>;
}): Promise<Map<string, Existing>> {
  const existing = await o.db.loadImportItems(o.modules.map((m) => m.entity));
  await o.prune?.(existing);
  for (const mod of o.modules) {
    if (!mod.adoptBy) continue;
    const fresh = o.desired.filter(
      (d) => d.key.entity === mod.entity && !existing.has(keyId(d.key)),
    );
    const found = await o.db.findByColumn({
      table: mod.table,
      column: mod.adoptBy,
      values: fresh.map((d) => d.key.key),
    });
    for (const [value, id] of found)
      existing.set(keyId({ entity: mod.entity, key: value }), { targetId: id, hash: null });
  }
  return existing;
}

export interface BuildPlanInput {
  db: TargetDb;
  modules: readonly EntityModule[];
  target: TargetName;
  today: string;
  /** --from ('YYYY-MM-DD'); default today. */
  from?: string;
  /** --creates-only with --only: recreate orphaned import items (orphans.ts). */
  recreate?: Omit<RecreateScope, 'tableOf'>;
}

/** Read-only against the target: dry-run and apply share it, apply then writes the result. */
export async function buildPlan(
  input: BuildPlanInput,
): Promise<{ plan: PlanWithChanges; existing: Map<string, Existing>; recreated: Set<string> }> {
  const { db, modules } = input;
  const mapped = mapAll(loadBundle(input.today, input.from), modules);
  let recreated = new Set<string>();
  const scope = input.recreate && {
    ...input.recreate,
    tableOf: (e: EntityName) => modules.find((m) => m.entity === e)?.table ?? e,
  };
  const prune = async (existing: Map<string, Existing>) => {
    if (scope) recreated = await dropOrphans({ db, existing, desired: mapped.desired, scope });
  };
  const existing = await loadExisting({ db, modules, desired: mapped.desired, prune });
  const matched = await matchTarget({ db, desired: mapped.desired, existing });
  const codes = await checkCodes({ db, desired: mapped.desired, existing });
  const synced = await matchTemplates({ db, desired: codes.desired, existing });
  const diff = diffPlan({ desired: codes.desired, existing });
  const issues = [...mapped.issues, ...matched, ...codes.issues, ...diff.issues];
  const all = { items: diff.items, issues };
  const plan: Plan = {
    target: input.target,
    createdAt: new Date().toISOString(),
    ...all,
    counts: countPlan(all),
  };
  const changes = [...(await loadChanges({ db, items: diff.items, modules, existing })), ...synced];
  return { plan: { ...plan, changes }, existing, recreated };
}
