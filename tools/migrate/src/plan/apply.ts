// apply: execute a Plan in APPLY_ORDER, one transaction per batch of an entity, recording
// import_items. Re-running the same plan is a no-op (all skip); a failed batch rolls back alone
// and the run is marked failed, earlier batches stay committed and are skipped next time.
import type { EntityModule, WriteContext, WriteResult } from '../entities/contract.ts';
import type { TargetStorage } from '../db/storage.ts';
import type { TargetDb } from '../db/target.ts';
import { keyId } from '../keys.ts';
import { APPLY_ORDER } from '../types.ts';
import type { ColumnValue, Existing, Plan, PlanItem } from '../types.ts';

interface ApplyInput {
  db: TargetDb;
  plan: Plan;
  /** Same map the plan was diffed against: refs to rows imported by earlier runs resolve here. */
  existing: ReadonlyMap<string, Existing>;
  modules: readonly EntityModule[];
  sources: Record<string, unknown>;
  gitSha: string | null;
  storage?: TargetStorage;
  readZipEntry?: (path: string) => Uint8Array | undefined;
  /** Records per transaction (default BATCH_SIZE). */
  batchSize?: number;
}

const BATCH_SIZE = 500;

export function batches<T>(xs: readonly T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < xs.length; i += size) out.push(xs.slice(i, i + size));
  return out;
}

/** refs → uuids from `ids` (keyId → target id). Throws on a ref the plan did not cover. */
export function resolveRefs(
  item: PlanItem,
  ids: ReadonlyMap<string, string | null>,
): Record<string, ColumnValue> {
  const columns: Record<string, ColumnValue> = { ...item.record.columns };
  for (const [col, nk] of Object.entries(item.record.refs)) {
    const id = ids.get(keyId(nk));
    if (!id) throw new Error(`${keyId(item.key)}: ref ${col} → ${keyId(nk)} has no target id`);
    columns[col] = id;
  }
  return columns;
}

async function defaultWrite(mod: EntityModule, ctx: WriteContext): Promise<WriteResult> {
  if (ctx.item.action === 'create')
    return { targetId: await ctx.tx.insert({ table: mod.table, columns: ctx.columns }) };
  const id = ctx.item.targetId;
  if (!id) throw new Error(`${keyId(ctx.item.key)}: update without target id`);
  await ctx.tx.update({ table: mod.table, id, columns: ctx.columns });
  return { targetId: id };
}

/** One record inside a batch transaction: write (or adopt), then its import_items row. */
async function applyItem(o: { mod: EntityModule; ctx: WriteContext; runId: string }) {
  const { mod, ctx } = o;
  const res: WriteResult =
    ctx.item.action === 'adopt'
      ? { targetId: ctx.item.targetId }
      : await (mod.write ?? ((c) => defaultWrite(mod, c)))(ctx);
  await ctx.tx.recordItem({
    entity: mod.entity,
    naturalKey: ctx.item.key.key,
    targetTable: mod.table,
    targetId: res.targetId,
    targetPath: res.targetPath ?? null,
    payloadHash: ctx.item.hash,
    sourceRef: ctx.item.ref,
    runId: o.runId,
  });
  return res.targetId;
}

function assertStorage(input: ApplyInput): void {
  const pdfs = input.plan.items.some((i) => i.key.entity === 'report_pdfs' && i.action !== 'skip');
  if (pdfs && (!input.storage || !input.readZipEntry)) {
    throw new Error('Plan copies report PDFs: set the target Storage URL + service key first');
  }
}

export async function applyPlan(input: ApplyInput): Promise<string> {
  const { db, plan } = input;
  assertStorage(input);
  const ids = new Map<string, string | null>([...input.existing].map(([k, e]) => [k, e.targetId]));
  for (const i of plan.items) ids.set(keyId(i.key), i.targetId);
  const runId = await db.startRun({ sources: input.sources, gitSha: input.gitSha });
  try {
    for (const entity of APPLY_ORDER) {
      const todo = plan.items.filter((i) => i.key.entity === entity && i.action !== 'skip');
      if (todo.length === 0) continue;
      const mod = input.modules.find((m) => m.entity === entity);
      if (!mod) throw new Error(`No entity module for ${entity}`);
      for (const batch of batches(todo, input.batchSize ?? BATCH_SIZE)) {
        await db.transaction(async (tx) => {
          for (const item of batch) {
            const { storage, readZipEntry } = input;
            const columns = resolveRefs(item, ids);
            const ctx: WriteContext = { tx, item, columns, storage, readZipEntry };
            ids.set(keyId(item.key), await applyItem({ mod, ctx, runId }));
          }
        });
      }
    }
    await db.finishRun({ runId, ok: true, counts: plan.counts });
    return runId;
  } catch (err) {
    await db.finishRun({ runId, ok: false, counts: plan.counts, error: String(err) });
    throw err;
  }
}
