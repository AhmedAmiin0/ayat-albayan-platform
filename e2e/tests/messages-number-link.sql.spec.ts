import { expect, test } from '@playwright/test';
import { rolledBack, type Tx } from '../support/rls';

// Migration 20261025000711 (docs/23c «ربط كل رسالة برقمها»): under comms_source = legacy a new message
// gets number_id = the ONE enabled wa_numbers row of its line (none or several → null); a number the writer
// set is kept; module mode is untouched; nothing else in the row changes. Rolled back; database only.

const PHONE = '+966500000781';

async function number(tx: Tx, input: { pnid: string; purpose: 'chat' | 'notifications'; enabled: boolean }): Promise<string> {
  const [row] = await tx<{ id: string }[]>`insert into public.wa_numbers (label, purpose, phone_number_id, enabled)
    values ('e2e link', ${input.purpose}::public.wa_line, ${input.pnid}, ${input.enabled}) returning id`;
  if (!row) throw new Error('no number');
  return row.id;
}

type Row = { id: string; number_id: string | null; line: string | null; body: string; status: string; direction: string };

async function message(tx: Tx, input: { line: string | null; numberId?: string | null }): Promise<Row> {
  const [row] = await tx<Row[]>`insert into public.messages (direction, phone_e164, body, status, line, number_id)
    values ('outbound', ${PHONE}, 'e2e link', 'queued', ${input.line}::public.wa_line, ${input.numberId ?? null})
    returning id, number_id, line, body, status, direction`;
  if (!row) throw new Error('no message');
  return row;
}

const legacy = (tx: Tx) => tx`insert into public.settings (key, value) values ('comms_source', '"legacy"'::jsonb)
  on conflict (key) do update set value = excluded.value`;

test.describe('every new message linked to its number (migration 711)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('legacy: the one enabled number of the line; disabled numbers ignored; the rest of the row unchanged', async () => {
    await rolledBack(async (tx) => {
      await legacy(tx);
      await tx`delete from public.wa_numbers`;
      const chat = await number(tx, { pnid: 'e2e-link-chat', purpose: 'chat', enabled: true });
      const crm = await number(tx, { pnid: 'e2e-link-crm', purpose: 'notifications', enabled: true });
      await number(tx, { pnid: 'e2e-link-old', purpose: 'notifications', enabled: false });
      const a = await message(tx, { line: 'chat' });
      expect(a).toMatchObject({ number_id: chat, line: 'chat', body: 'e2e link', status: 'queued', direction: 'outbound' });
      expect((await message(tx, { line: 'notifications' })).number_id).toBe(crm);
      expect((await message(tx, { line: null })).number_id).toBeNull();
    });
  });

  test('legacy: none or two enabled numbers → null; a number the writer set is kept', async () => {
    await rolledBack(async (tx) => {
      await legacy(tx);
      await tx`delete from public.wa_numbers`;
      expect((await message(tx, { line: 'chat' })).number_id).toBeNull();
      const one = await number(tx, { pnid: 'e2e-link-c1', purpose: 'chat', enabled: true });
      const old = await number(tx, { pnid: 'e2e-link-c0', purpose: 'chat', enabled: false });
      expect((await message(tx, { line: 'chat', numberId: old })).number_id).toBe(old);
      await number(tx, { pnid: 'e2e-link-c2', purpose: 'chat', enabled: true });
      expect((await message(tx, { line: 'chat' })).number_id).toBeNull();
      expect(one).toBeTruthy();
    });
  });

  test('legacy claim re-stamps line: the number follows; a hand-set number stays; other updates leave it', async () => {
    await rolledBack(async (tx) => {
      await legacy(tx);
      await tx`delete from public.wa_numbers`;
      const chat = await number(tx, { pnid: 'e2e-link-chat', purpose: 'chat', enabled: true });
      const crm = await number(tx, { pnid: 'e2e-link-crm', purpose: 'notifications', enabled: true });
      const old = await number(tx, { pnid: 'e2e-link-old', purpose: 'notifications', enabled: false });
      const queued = await message(tx, { line: null });
      const [claimed] = await tx<Row[]>`update public.messages set line = 'chat' where id = ${queued.id} returning number_id`;
      expect(claimed?.number_id).toBe(chat);
      const [moved] = await tx<Row[]>`update public.messages set line = 'notifications' where id = ${queued.id} returning number_id`;
      expect(moved?.number_id).toBe(crm);
      const history = await message(tx, { line: 'notifications', numberId: old });
      const [kept] = await tx<Row[]>`update public.messages set line = 'chat' where id = ${history.id} returning number_id`;
      expect(kept?.number_id).toBe(old);
      const [sent] = await tx<Row[]>`update public.messages set status = 'sent' where id = ${queued.id} returning number_id`;
      expect(sent?.number_id).toBe(crm);
    });
  });

  test('module mode: the trigger does nothing (the app stamps the number itself)', async () => {
    await rolledBack(async (tx) => {
      await tx`insert into public.settings (key, value) values ('comms_source', '"module"'::jsonb)
        on conflict (key) do update set value = excluded.value`;
      await tx`delete from public.wa_numbers`;
      await number(tx, { pnid: 'e2e-link-chat', purpose: 'chat', enabled: true });
      const row = await message(tx, { line: 'chat' });
      expect(row.number_id).toBeNull();
      const [after] = await tx<Row[]>`update public.messages set line = 'notifications' where id = ${row.id} returning number_id`;
      expect(after?.number_id).toBeNull();
    });
  });
});
