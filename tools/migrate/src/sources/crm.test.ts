// Fake reader, invented rows. Proves paging, delta merge and the tag precedence; never hits the CRM.
import { describe, expect, it } from 'vitest';
import { type CrmPageQuery, type CrmReader, PAGE, maxCursor, mergeById, selectAll } from './crm.ts';
import { CRM_TABLES, leadStatusFromTags } from './crm.schema.ts';

function fakeReader(total: number): CrmReader & { calls: CrmPageQuery[] } {
  const calls: CrmPageQuery[] = [];
  return {
    calls,
    async selectPage(q) {
      calls.push(q);
      const from = q.page * PAGE;
      const n = Math.max(0, Math.min(PAGE, total - from));
      return Array.from({ length: n }, (_, i) => ({ id: `r${from + i}` }));
    },
  };
}

describe('selectAll', () => {
  const spec = CRM_TABLES[0];
  if (!spec) throw new Error('no CRM specs');

  it('pages until a short page', async () => {
    const reader = fakeReader(PAGE * 2 + 5);
    const rows = await selectAll(reader, { spec, accountId: 'acc' });
    expect(rows).toHaveLength(PAGE * 2 + 5);
    expect(reader.calls.map((c) => c.page)).toEqual([0, 1, 2]);
    expect(reader.calls[0]?.accountId).toBe('acc');
  });

  it('stops after one call when the table is empty', async () => {
    const reader = fakeReader(0);
    expect(
      await selectAll(reader, { spec, accountId: 'acc', since: '2026-10-01T00:00:00Z' }),
    ).toEqual([]);
    expect(reader.calls).toHaveLength(1);
  });
});

describe('mergeById / maxCursor', () => {
  it('replaces by id and drops filter-only embeds', () => {
    const merged = mergeById(
      [
        { id: 'a', v: 1 },
        { id: 'b', v: 1 },
      ],
      [
        { id: 'b', v: 2, conversations: { account_id: 'x' } },
        { id: 'c', v: 1, contacts: {} },
        { id: 'd', v: 1, pipelines: { account_id: 'x' } },
      ],
    );
    expect(merged).toEqual([
      { id: 'a', v: 1 },
      { id: 'b', v: 2 },
      { id: 'c', v: 1 },
      { id: 'd', v: 1 },
    ]);
  });
  it('finds the newest ISO cursor', () => {
    const rows = [{ t: '2026-09-01T00:00:00Z' }, { t: '2026-10-01T00:00:00Z' }, { t: null }];
    expect(maxCursor(rows, 't')).toBe('2026-10-01T00:00:00Z');
    expect(maxCursor([], 't')).toBeUndefined();
  });
});

describe('every CRM read is account-scoped', () => {
  it('has an account filter and cursor per table', () => {
    for (const s of CRM_TABLES) {
      expect(s.account).toMatch(/account_id$/);
      expect(s.select).toContain(s.cursor);
    }
  });
});

describe('leadStatusFromTags', () => {
  it('takes the most advanced status tag', () => {
    expect(leadStatusFromTags(['جديد', 'تجريبي محجوز'])).toBe('trial_booked');
    expect(leadStatusFromTags(['مش مهتم', 'مشترك'])).toBe('converted');
    expect(leadStatusFromTags(['حضر التجربة'])).toBe('trial_done');
    expect(leadStatusFromTags(['محتاج متابعة', 'whatsapp'])).toBe('interested_no_slot');
  });
  it('ignores non-status tags', () => {
    expect(leadStatusFromTags(['مشكلة تقنية', 'imported'])).toBeUndefined();
  });
});
