// students write(): legacy AB-nnnn codes go in with OVERRIDING SYSTEM VALUE (code_seq is an
// identity column). A code is never silently swapped: the dry-run drops the legacy code of a
// student whose code the target already uses and raises a review (plan/codes.ts), so a conflict
// here means the target changed after planning — the batch rolls back and the run fails; re-run.
// Afterwards the sequence is bumped past the highest code (handbook gotcha 1), forward only: it
// never rewinds below the AB-1000 start reserved by migration 161.
import type { WriteContext, WriteResult } from '../../entities/contract.ts';
import type { ColumnValue } from '../../types.ts';

export const BUMP_CODE_SEQ = `select setval(s.seq, greatest(x.m, coalesce(pg_sequence_last_value(s.seq), 0)))
  from (select pg_get_serial_sequence('public.students', 'code_seq')::regclass as seq) s,
       (select max(code_seq) as m from public.students) x where x.m >= 183`;

function withoutCode(columns: Record<string, ColumnValue>): Record<string, ColumnValue> {
  const rest = { ...columns };
  delete rest['code_seq'];
  return rest;
}

export async function writeStudent(ctx: WriteContext): Promise<WriteResult> {
  if (ctx.item.action !== 'create') {
    const id = ctx.item.targetId;
    if (!id) throw new Error('students update without target id');
    // code_seq is generated: it can only be set on insert, so an update never touches it.
    await ctx.tx.update({ table: 'students', id, columns: withoutCode(ctx.columns) });
    return { targetId: id };
  }
  const code = ctx.columns['code_seq'];
  if (typeof code !== 'number') {
    const id = await ctx.tx.insert({ table: 'students', columns: ctx.columns });
    if (!id) throw new Error('students insert returned no id');
    return { targetId: id };
  }
  const id = await ctx.tx.insert({
    table: 'students',
    columns: ctx.columns,
    overridingSystemValue: true,
    onConflict: 'nothing',
  });
  if (!id) {
    const at = `${ctx.item.ref.tab} row ${ctx.item.ref.row}`;
    throw new Error(`students (${at}): code ${code} is taken in the target since the plan; re-run`);
  }
  await ctx.tx.exec({ text: BUMP_CODE_SEQ, params: [] });
  return { targetId: id };
}
