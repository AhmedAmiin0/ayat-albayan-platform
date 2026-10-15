// students write(): legacy code with OVERRIDING SYSTEM VALUE, no silent fallback, sequence bump.
import { describe, expect, it } from 'vitest';
import type { WriteContext } from '../../entities/contract.ts';
import type { TargetTx } from '../../db/target.ts';
import type { InsertSpec, SqlText } from '../../db/sql.ts';
import { keys } from '../../keys.ts';
import type { PlanItem } from '../../types.ts';
import { BUMP_CODE_SEQ, writeStudent } from './students.write.ts';

function fakeTx(o: { taken?: boolean } = {}) {
  const calls: (InsertSpec | SqlText | { update: string; columns: object })[] = [];
  const tx: TargetTx = {
    insert: async (spec) => (calls.push(spec), o.taken ? null : 'new-id'),
    update: async (spec) => void calls.push({ update: spec.id, columns: spec.columns }),
    recordItem: async () => {},
    exec: async (q) => void calls.push(q),
  };
  return { tx, calls };
}

const item = (action: PlanItem['action'], targetId: string | null = null): PlanItem => ({
  key: keys.student({ guardianPhone: '+966551110001', name: 'ليان' }),
  action,
  targetId,
  hash: 'h',
  record: { columns: {}, refs: {} },
  ref: { source: 'HUB', tab: 't', row: 2 },
});

const ctx = (o: { tx: TargetTx; item: PlanItem; columns: WriteContext['columns'] }): WriteContext =>
  o;

describe('writeStudent', () => {
  it('inserts a legacy code with overriding system value, then bumps the sequence', async () => {
    const { tx, calls } = fakeTx();
    const r = await writeStudent(
      ctx({ tx, item: item('create'), columns: { name: 'ليان', code_seq: 12 } }),
    );
    expect(r.targetId).toBe('new-id');
    expect(calls).toEqual([
      {
        table: 'students',
        columns: { name: 'ليان', code_seq: 12 },
        overridingSystemValue: true,
        onConflict: 'nothing',
      },
      { text: BUMP_CODE_SEQ, params: [] },
    ]);
  });

  it('a code taken since the plan fails the batch instead of drawing a new code', async () => {
    const { tx, calls } = fakeTx({ taken: true });
    const columns = { name: 'ليان', code_seq: 12 };
    await expect(writeStudent(ctx({ tx, item: item('create'), columns }))).rejects.toThrow(
      /code 12 is taken.*re-run/,
    );
    expect(calls).toHaveLength(1);
  });

  it('a student without a legacy code takes the sequence, skips the bump, sets status', async () => {
    const { tx, calls } = fakeTx();
    const columns = { name: 'ليان', status: 'pending_subscription' };
    await writeStudent(ctx({ tx, item: item('create'), columns }));
    expect(calls).toEqual([{ table: 'students', columns }]);
  });

  it('an update never touches code_seq nor status', async () => {
    const { tx, calls } = fakeTx();
    const columns = { name: 'ليان', code_seq: 12, status: 'new' };
    const r = await writeStudent(ctx({ tx, item: item('update', 's1'), columns }));
    expect(r.targetId).toBe('s1');
    expect(calls).toEqual([{ update: 's1', columns: { name: 'ليان' } }]);
    await expect(
      writeStudent(ctx({ tx, item: item('update'), columns: { name: 'x' } })),
    ).rejects.toThrow(/without target id/);
  });

  it('the bump only moves the sequence forward, past codes at or above 183', () => {
    expect(BUMP_CODE_SEQ).toMatch(/pg_get_serial_sequence\('public\.students', 'code_seq'\)/);
    expect(BUMP_CODE_SEQ).toMatch(/x\.m >= 183/);
    expect(BUMP_CODE_SEQ).toMatch(
      /greatest\(x\.m, coalesce\(pg_sequence_last_value\(s\.seq\), 0\)\)/,
    );
  });
});
