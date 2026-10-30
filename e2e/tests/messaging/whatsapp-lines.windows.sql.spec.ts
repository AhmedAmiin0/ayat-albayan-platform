import { expect, test } from '@playwright/test';
import { rolledBack, type Tx } from '../../support/core/rls';

// Migration 20261010000290, the two per-line windows of replyLine() (docs/12 §13.3 rule 2, §13.7):
// v_threads.last_chat_inbound_at = newest inbound with line 'chat'; last_notifications_inbound_at =
// newest inbound with line 'notifications' OR null (history / single line). Outbound rows never
// count. Real database, rolled back; every row has its own created_at (see whatsapp-lines.sql.spec).

type Line = 'notifications' | 'chat' | null;
interface Row {
  direction: 'inbound' | 'outbound';
  line: Line;
  minutesAgo: number;
}
interface Windows {
  chat: number | null;
  notifications: number | null;
}

async function insert(tx: Tx, phone: string, rows: Row[]): Promise<void> {
  for (const r of rows) {
    await tx`insert into public.messages (direction, phone_e164, body, line, created_at)
      values (${r.direction}, ${phone}, 'e2e windows', ${r.line}::public.wa_line,
        now() - make_interval(mins => ${r.minutesAgo}))`;
  }
}

/** Both columns as whole minutes before now() (null when the line has no inbound). */
async function windows(tx: Tx, phone: string): Promise<Windows | undefined> {
  const [row] = await tx<Windows[]>`
    select round(extract(epoch from now() - last_chat_inbound_at) / 60)::int as chat,
      round(extract(epoch from now() - last_notifications_inbound_at) / 60)::int as notifications
    from public.v_threads where phone_e164 = ${phone}`;
  return row;
}

test.describe('v_threads per-line inbound instants (migration 290, R-MSG-04)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('chat, then a reminder tap on notifications a minute later: both instants, newest line notifications', async () => {
    await rolledBack(async (tx) => {
      const phone = '+966500000911';
      await insert(tx, phone, [
        { direction: 'inbound', line: 'chat', minutesAgo: 3 },
        { direction: 'inbound', line: 'notifications', minutesAgo: 2 },
        { direction: 'outbound', line: 'chat', minutesAgo: 1 },
      ]);
      expect(await windows(tx, phone)).toEqual({ chat: 3, notifications: 2 });
      const [row] = await tx<{ last_inbound_line: Line }[]>`
        select last_inbound_line from public.v_threads where phone_e164 = ${phone}`;
      expect(row?.last_inbound_line).toBe('notifications');
    });
  });

  test('a null line counts as notifications; the newest of each line wins', async () => {
    await rolledBack(async (tx) => {
      const phone = '+966500000912';
      await insert(tx, phone, [
        { direction: 'inbound', line: 'notifications', minutesAgo: 40 },
        { direction: 'inbound', line: null, minutesAgo: 30 },
        { direction: 'inbound', line: 'chat', minutesAgo: 50 },
        { direction: 'inbound', line: 'chat', minutesAgo: 45 },
      ]);
      expect(await windows(tx, phone)).toEqual({ chat: 45, notifications: 30 });
    });
  });

  test('history only: no chat instant; chat only: no notifications instant', async () => {
    await rolledBack(async (tx) => {
      await insert(tx, '+966500000913', [{ direction: 'inbound', line: null, minutesAgo: 10 }]);
      expect(await windows(tx, '+966500000913')).toEqual({ chat: null, notifications: 10 });
      await insert(tx, '+966500000914', [{ direction: 'inbound', line: 'chat', minutesAgo: 10 }]);
      expect(await windows(tx, '+966500000914')).toEqual({ chat: 10, notifications: null });
    });
  });

  test('outbound rows never open a window', async () => {
    await rolledBack(async (tx) => {
      const phone = '+966500000915';
      await insert(tx, phone, [
        { direction: 'outbound', line: 'chat', minutesAgo: 5 },
        { direction: 'outbound', line: 'notifications', minutesAgo: 4 },
      ]);
      expect(await windows(tx, phone)).toEqual({ chat: null, notifications: null });
    });
  });
});
