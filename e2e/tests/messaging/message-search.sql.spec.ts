import { searchFold } from '@ab/shared';
import { expect, test } from '@playwright/test';
import { rolledBack } from '../../support/core/rls';
import { FOLD_CASES, ids, msg, search } from '../../support/messaging/message-search';

// Message search (migration 20261106000400, docs/37) against the real database. The SQL fold is
// the twin of searchFold (@ab/shared): this spec is its gate. Example numbers only. Rolled back.

const A = '+966500000951';
const B = '+966500000952';
const C = '+966500000953';
const D = '+966500000954';

test.describe('message search (20261106000400)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('public.search_fold equals searchFold on every case', async () => {
    await rolledBack(async (tx) => {
      for (const text of FOLD_CASES) {
        const [row] = await tx<{ f: string }[]>`select public.search_fold(${text}) as f`;
        expect({ text, fold: row?.f }).toEqual({ text, fold: searchFold(text) });
      }
    });
  });

  test('folded variants match; deleted, hidden and marker rows never do', async () => {
    await rolledBack(async (tx) => {
      const school = await msg(tx, { phone: A, body: 'المدرسة zqcanary الحلقة ١٢' });
      await msg(tx, { phone: A, body: 'مدرسه zqcanary', extra: 'hidden' });
      await msg(tx, { phone: A, body: 'مدرسه zqcanary', extra: 'deleted' });
      await msg(tx, { phone: A, body: 'مدرسه zqcanary', extra: 'reaction' });
      expect(ids(await search(tx, { q: 'مدرسه', phones: [A] }))).toEqual([school]);
      expect(ids(await search(tx, { q: 'الحلقه 12', phones: [A] }))).toEqual([school]);
      expect(ids(await search(tx, { q: 'ZQCANARY', phones: [A] }))).toEqual([school]);
    });
  });

  test('p_phones limits, p_hide drops, p_skip_templates drops only those templates', async () => {
    await rolledBack(async (tx) => {
      const a = await msg(tx, { phone: A, body: 'zqscope plain', at: '2026-01-01T10:00:03Z' });
      const b = await msg(tx, { phone: B, body: 'zqscope other', at: '2026-01-01T10:00:02Z' });
      const link = await msg(tx, { phone: A, body: 'zqscope join', template: 'lesson_join_link', at: '2026-01-01T10:00:01Z' });
      expect(ids(await search(tx, { q: 'zqscope', phones: [B] }))).toEqual([b]);
      expect(ids(await search(tx, { q: 'zqscope', hide: [A] }))).toEqual([b]);
      expect(ids(await search(tx, { q: 'zqscope', phones: [A, B] }))).toEqual([a, b, link]);
      const skip = ['lesson_feedback_request', 'lesson_join_link'];
      expect(ids(await search(tx, { q: 'zqscope', phones: [A, B], skip }))).toEqual([a, b]);
    });
  });

  test('the keyset returns two rows sharing a created_at exactly once across pages', async () => {
    await rolledBack(async (tx) => {
      const at = '2026-02-01T10:00:00.123456Z';
      const x = await msg(tx, { phone: A, body: 'zqtie one', at });
      const y = await msg(tx, { phone: A, body: 'zqtie two', at });
      const seen: string[] = [];
      let before: { at: string; id: string } | null = null;
      for (let n = 0; n < 3; n += 1) {
        const [hit] = await search(tx, { q: 'zqtie', phones: [A], before, limit: 1 });
        if (!hit) break;
        seen.push(hit.id);
        before = { at: hit.created_at, id: hit.id };
      }
      expect(seen.sort()).toEqual([x, y].sort());
    });
  });

  test('% and _ in the words match literally', async () => {
    await rolledBack(async (tx) => {
      const pct = await msg(tx, { phone: A, body: 'خصم 50% zqesc' });
      await msg(tx, { phone: A, body: 'خصم 500 zqesc' });
      const under = await msg(tx, { phone: A, body: 'zq a_b' });
      await msg(tx, { phone: A, body: 'zq axb' });
      expect(ids(await search(tx, { q: '50%', phones: [A] }))).toEqual([pct]);
      expect(ids(await search(tx, { q: 'a_b', phones: [A] }))).toEqual([under]);
    });
  });

  test('display_name is v_threads.display_name: guardian, lead, teacher, unknown', async () => {
    await rolledBack(async (tx) => {
      await tx`insert into public.guardians (name, phone_e164) values ('ولي أمر بحث', ${A})`;
      await tx`insert into public.leads (phone_e164, name, status, source) values (${B}, 'مهتم بحث', 'new', 'whatsapp_direct')`;
      await tx`insert into public.teachers (display_name_ar, gender, phone_e164) values ('معلمة بحث', 'female', ${C})`;
      for (const phone of [A, B, C, D]) await msg(tx, { phone, body: 'zqname' });
      const hits = await search(tx, { q: 'zqname', phones: [A, B, C, D] });
      const names = await tx<{ phone_e164: string; display_name: string | null }[]>`
        select phone_e164, display_name from public.v_threads where phone_e164 in (${A}, ${B}, ${C}, ${D})`;
      const byPhone = (rows: readonly { phone_e164: string; display_name: string | null }[]) =>
        Object.fromEntries(rows.map((r) => [r.phone_e164, r.display_name]));
      expect(byPhone(hits)).toEqual(byPhone(names));
      expect(byPhone(hits)[D]).toBeNull();
    });
  });

  test('anon and authenticated get permission denied on execute', async () => {
    await rolledBack(async (tx) => {
      for (const role of ['anon', 'authenticated']) {
        const run = tx.savepoint(async (sp) => {
          await sp.unsafe(`set local role ${role}`);
          await sp`select * from public.search_messages('zqx', null, '{}', '{}', null, null, 5)`;
        });
        await expect(run).rejects.toThrow(/permission denied/);
      }
    });
  });
});
