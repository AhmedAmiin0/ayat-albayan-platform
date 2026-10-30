import { expect, test } from '@playwright/test';
import { bootApiOnce } from '../../support/api-boot';
import { seedFamily, withSql } from '../../support/schedule';
import { restoreSettings, snapshotSettings } from '../../support/settings';
import { stubSent } from '../../support/wa-stub';

// 26-P4 (docs/26 §5): on staging-shaped data (both sending switches OFF, a fake family with an old queued
// message) the API boots twice and runs its sender (a 300 ms tick); the gate stays closed: the queued row is
// never claimed, no `messages` row is created, the stub receives nothing for the family and both switches stay
// false. The switches are only set to false, then put back.

const KEYS = ['messaging_enabled', 'auto_messages_enabled'];
type Msg = { id: string; status: string };
const familyRows = (guardianId: string) => withSql((sql) => sql<Msg[]>`
  select id, status::text as status from public.messages where guardian_id = ${guardianId} order by id`);
const createdSince = (since: Date) => withSql(async (sql) =>
  (await sql<{ n: number }[]>`select count(*)::int as n from public.messages where created_at >= ${since}`)[0]?.n);
const sentTo = async (phone: string) => (await stubSent()).filter((m) => m.to.replace(/\D/g, '') === phone.replace(/\D/g, '')).length;
const gateRows = () => withSql((sql) => sql<{ key: string; value: unknown }[]>`
  select key, value from public.settings where key = any(${KEYS}) order by key`);

test.describe.serial('send gate across two boots (26-P4)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'API only: one run'));
  let saved: { key: string; value: unknown }[] = [];
  test.beforeAll(async () => {
    saved = await snapshotSettings(KEYS);
  });
  test.afterAll(() => restoreSettings({ keys: KEYS, rows: saved }));

  test('two boots on staging-shaped data: the gate stays closed and no message row appears', async () => {
    test.setTimeout(180_000);
    await withSql((sql) => sql`
      insert into public.settings (key, value) values ('messaging_enabled', 'false'::jsonb), ('auto_messages_enabled', 'false'::jsonb)
      on conflict (key) do update set value = excluded.value`);
    const family = await seedFamily('ولي أمر تجريبي', ['طالب تجريبي']);
    const [phone] = await withSql((sql) => sql<{ phone_e164: string }[]>`
      insert into public.messages (direction, phone_e164, guardian_id, body, status)
      select 'outbound', phone_e164, id, 'رسالة قديمة في الانتظار', 'queued' from public.guardians
      where id = ${family.guardianId} returning phone_e164`);
    const to = phone?.phone_e164 ?? '';
    const before = { rows: await familyRows(family.guardianId), gate: await gateRows() };
    expect(before.rows).toEqual([expect.objectContaining({ status: 'queued' })]);
    const since = new Date();

    for (const boot of [1, 2]) {
      await bootApiOnce(3_000);
      expect(await familyRows(family.guardianId), `boot ${boot}`).toEqual(before.rows);
      expect(await createdSince(since), `boot ${boot}`).toBe(0);
      expect(await sentTo(to), `boot ${boot}`).toBe(0);
      expect(await gateRows(), `boot ${boot}`).toEqual(before.gate);
    }
    expect(before.gate).toEqual([
      { key: 'auto_messages_enabled', value: false },
      { key: 'messaging_enabled', value: false },
    ]);
  });
});
