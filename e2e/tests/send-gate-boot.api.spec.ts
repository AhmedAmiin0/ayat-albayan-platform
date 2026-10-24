import { expect, test } from '@playwright/test';
import { bootApiOnce } from '../support/api-boot';
import { resetAbrar, seedFamily, seedLesson, withSql } from '../support/schedule';
import { restoreSettings, snapshotSettings } from '../support/settings';
import { stubSent } from '../support/wa-stub';

// 26-P4 (docs/26 §5): on staging-shaped data (both sending switches OFF, real-looking fake families with a
// lesson soon and an old queued message) the API boots twice; the send gate stays closed, no `messages` row
// is created or changed, and the stub receives nothing. The switches are only set to false, then put back.

const KEYS = ['messaging_enabled', 'auto_messages_enabled'];
type Msg = { id: string; status: string };
const messages = () => withSql((sql) => sql<Msg[]>`select id, status::text as status from public.messages order by id`);
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
    const teacher = await resetAbrar();
    const family = await seedFamily('ولي أمر تجريبي', ['طالب تجريبي']);
    // Tomorrow, on the hour: inside every reminder window, so a gate that opened would queue or send.
    const soon = new Date(Math.ceil((Date.now() + 20 * 3_600_000) / 3_600_000) * 3_600_000);
    await seedLesson({ teacherId: teacher, studentId: family.studentIds[0] ?? '', startsAt: soon, minutes: 30 });
    await withSql((sql) => sql`insert into public.messages (direction, phone_e164, guardian_id, body, status)
      select 'outbound', phone_e164, id, 'رسالة قديمة في الانتظار', 'queued' from public.guardians where id = ${family.guardianId}`);
    const before = { rows: await messages(), sent: (await stubSent()).length, gate: await gateRows() };

    for (const boot of [1, 2]) {
      await bootApiOnce(3_000);
      expect(await messages(), `boot ${boot}`).toEqual(before.rows);
      expect((await stubSent()).length, `boot ${boot}`).toBe(before.sent);
      expect(await gateRows(), `boot ${boot}`).toEqual(before.gate);
    }
    expect(before.gate).toEqual([
      { key: 'auto_messages_enabled', value: false },
      { key: 'messaging_enabled', value: false },
    ]);
  });
});
