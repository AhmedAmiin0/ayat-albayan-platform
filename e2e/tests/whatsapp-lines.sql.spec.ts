import { expect, test } from '@playwright/test';
import { rolledBack, type Tx } from '../support/rls';

// Migration 20261010000290 (two WhatsApp lines, docs/12 §13): messages.line and the columns
// appended to v_threads; here last_inbound_line = the line of the newest inbound row (null when that
// row has none; the per-line instants are in whatsapp-lines.windows.sql.spec.ts), against the real
// database in a transaction that is rolled back. Every row gets an
// explicit, DISTINCT created_at: rows inserted in one statement share now(), so «newest» would be
// arbitrary and the null-newest case would flake.

const OLD_COLUMNS = [
  'phone_e164', 'last_message_id', 'last_direction', 'last_body', 'last_template_key', 'last_status',
  'last_media_mime', 'last_message_at', 'last_inbound_at', 'unread_count', 'lead_id', 'lead_name',
  'lead_status', 'lead_source', 'guardian_id', 'guardian_name', 'guardian_tz', 'teacher_id',
  'teacher_name', 'display_name',
];

const code = (tx: Tx, q: () => Promise<unknown>) => tx.savepoint(q).then(() => 'ok', (e: { code?: string }) => e.code);

type Line = 'notifications' | 'chat' | null;
interface Row {
  direction: 'inbound' | 'outbound';
  line: Line;
  minutesAgo: number;
}

/** One message per row, each with its own created_at (now - minutesAgo). */
async function insert(tx: Tx, phone: string, rows: Row[]): Promise<void> {
  for (const r of rows) {
    await tx`insert into public.messages (direction, phone_e164, body, line, created_at)
      values (${r.direction}, ${phone}, 'e2e lines', ${r.line}::public.wa_line,
        now() - make_interval(mins => ${r.minutesAgo}))`;
  }
}

async function lastLine(tx: Tx, phone: string): Promise<Line | undefined> {
  const [row] = await tx<{ last_inbound_line: Line }[]>`
    select last_inbound_line from public.v_threads where phone_e164 = ${phone}`;
  return row?.last_inbound_line;
}

test.describe('v_threads.last_inbound_line (migration 290, R-MSG-04)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('history only (every line null) → null', async () => {
    await rolledBack(async (tx) => {
      const phone = '+966500000901';
      await insert(tx, phone, [
        { direction: 'inbound', line: null, minutesAgo: 30 },
        { direction: 'inbound', line: null, minutesAgo: 20 },
      ]);
      expect(await lastLine(tx, phone)).toBeNull();
    });
  });

  test('the newest INBOUND row decides: chat after notifications → chat, and back', async () => {
    await rolledBack(async (tx) => {
      const phone = '+966500000902';
      await insert(tx, phone, [
        { direction: 'inbound', line: 'notifications', minutesAgo: 30 },
        { direction: 'inbound', line: 'chat', minutesAgo: 20 },
        // A newer OUTBOUND row on another line does not count.
        { direction: 'outbound', line: 'notifications', minutesAgo: 10 },
      ]);
      expect(await lastLine(tx, phone)).toBe('chat');
      await insert(tx, phone, [{ direction: 'inbound', line: 'notifications', minutesAgo: 5 }]);
      expect(await lastLine(tx, phone)).toBe('notifications');
    });
  });

  test('a null newest inbound row gives null, never an older row line', async () => {
    await rolledBack(async (tx) => {
      const phone = '+966500000903';
      await insert(tx, phone, [
        { direction: 'inbound', line: 'chat', minutesAgo: 30 },
        { direction: 'inbound', line: null, minutesAgo: 20 },
      ]);
      expect(await lastLine(tx, phone)).toBeNull();
    });
  });

  test('a thread with outbound rows only has no inbound line', async () => {
    await rolledBack(async (tx) => {
      const phone = '+966500000904';
      await insert(tx, phone, [{ direction: 'outbound', line: 'chat', minutesAgo: 10 }]);
      expect(await lastLine(tx, phone)).toBeNull();
    });
  });

  test('the 20 old columns are intact, in order, and the three line columns are appended after them', async () => {
    await rolledBack(async (tx) => {
      const cols = await tx<{ column_name: string }[]>`
        select column_name from information_schema.columns
        where table_schema = 'public' and table_name = 'v_threads' order by ordinal_position`;
      expect(cols.map((c) => c.column_name)).toEqual([...OLD_COLUMNS, 'last_inbound_line', 'last_chat_inbound_at', 'last_notifications_inbound_at']);
      const [type] = await tx<{ udt_name: string; is_nullable: string; column_default: string | null }[]>`
        select udt_name, is_nullable, column_default from information_schema.columns
        where table_schema = 'public' and table_name = 'messages' and column_name = 'line'`;
      expect(type).toEqual({ udt_name: 'wa_line', is_nullable: 'YES', column_default: null });
    });
  });

  test('anon and authenticated are still denied; service_role can read', async () => {
    await rolledBack(async (tx) => {
      for (const role of ['anon', 'authenticated']) {
        await tx.unsafe(`set local role ${role}`);
        expect([role, await code(tx, () => tx`select last_inbound_line from public.v_threads limit 1`)]).toEqual([role, '42501']);
        await tx`reset role`;
      }
      await tx`select set_config('request.jwt.claims', ${JSON.stringify({ role: 'service_role' })}, true)`;
      await tx`set local role service_role`;
      expect(await code(tx, () => tx`select last_inbound_line from public.v_threads limit 1`)).toBe('ok');
      await tx`reset role`;
    });
  });
});
