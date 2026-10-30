import { randomUUID } from 'node:crypto';
import type { Page } from '@playwright/test';
import { ar, expect, test } from '../../support/fixtures';
import { API, bearer, freshDigits } from '../../support/messages';
import { openNav } from '../../support/core/nav';
import {
  addDays,
  nextWeekSaturday,
  resetAbrar,
  riyadh,
  seedFamily,
  setAvailability,
  withSql,
} from '../../support/schedule';
import { USERS } from '../../support/users';

// The bell (R-NOT-01) and the teacher's new-student alert (R-NOT-03). WEB_PUSH_* stay unset here:
// browser push is off, nothing leaves the server; the bell reads push_notifications rows only.

const unread = (n: number) => ar.bell.openUnread.replace('{n}', String(n));
const SHELL = 900;

/**
 * Opens the bell's list: the header bell from 900px; below it (owner 2026-10-05: one bar button)
 * «القائمة», then the sheet's «الإشعارات» row. `name`: the bell's / the row's accessible name.
 */
async function openBell(page: Page, name: string | RegExp): Promise<void> {
  if ((page.viewportSize()?.width ?? 1280) >= SHELL) {
    await page.getByRole('button', { name }).first().click();
    return;
  }
  await expect(page.getByRole('button', { name: ar.nav.menu, exact: true })).toBeVisible();
  const sheet = await openNav(page);
  await sheet.getByRole('button', { name }).click();
}

async function profileOf(email: string): Promise<string> {
  const [row] = await withSql((sql) => sql<{ id: string }[]>`select id from auth.users where email = ${email}`);
  if (!row) throw new Error(`no user ${email}`);
  return row.id;
}

/** Everything of the profile read, then one fresh unread new_lead row about `phone`. */
async function seedOneUnread(profileId: string, phone: string): Promise<void> {
  await withSql(async (sql) => {
    await sql`update public.push_notifications set read_at = now() where profile_id = ${profileId} and read_at is null`;
    await sql`insert into public.push_notifications (profile_id, kind, title, body, data, dedup_key)
      values (${profileId}, 'new_lead', ${ar.notifications.new_lead.title}, 'e2e', ${sql.json({ kind: 'new_lead', phone })},
        ${`e2e-bell:${randomUUID()}`})`;
  });
}

test.describe('notification bell', () => {
  test('badge → open → click a row → its page, and the badge clears', async ({ asRole }) => {
    const phone = `+${freshDigits()}`;
    await seedOneUnread(await profileOf(USERS.admin.email), phone);
    const page = await asRole('admin');
    await page.goto('/admin');
    const wide = (page.viewportSize()?.width ?? 1280) >= SHELL;
    // Below 900px the unread count is the description of «القائمة» (its name stays exact).
    if (wide) await expect(page.getByRole('button', { name: unread(1) })).toBeVisible();
    else
      await expect(
        page.getByRole('button', { name: ar.nav.menu, exact: true }),
      ).toHaveAccessibleDescription(ar.bell.menuUnread.replace('{n}', '1'));
    await openBell(page, unread(1));
    await page
      .getByRole('button', { name: new RegExp(ar.notifications.new_lead.title) })
      .first()
      .click();
    await expect(page).toHaveURL(
      new RegExp(`/admin/inbox\\?phone=${encodeURIComponent(phone).replace('+', '\\+')}`),
    );
    if (wide)
      await expect(
        page.getByRole('button', { name: ar.bell.open, exact: true }).first(),
      ).toBeVisible();
    else
      await expect(
        page.getByRole('button', { name: ar.nav.menu, exact: true }),
      ).not.toHaveAttribute('aria-describedby');
  });

  test('a teacher sees a new_student row after an admin booking', async ({ asRole, isMobile }) => {
    test.skip(isMobile, 'one booking per run: the desktop run covers it');
    const teacherId = await resetAbrar();
    // resetAbrar clears her availability too: Sunday 16:00–19:00 Riyadh holds the 17:00 trial.
    await setAvailability(teacherId, [[0, '16:00', '19:00']]);
    const admin = await asRole('admin');
    await admin.goto('/admin');
    const sunday = addDays(nextWeekSaturday(), 1);
    const family = await seedFamily('أم جنى', ['جنى']);
    const res = await admin.request.post(`${API}/booking`, {
      headers: await bearer(admin),
      data: {
        teacherId,
        byday: [0],
        startTimeLocal: '17:00',
        tz: 'Asia/Riyadh',
        durationMin: 45,
        startsOn: sunday,
        kind: 'trial',
        package: 'trial',
        studentIds: family.studentIds,
        clientRequestId: randomUUID(),
        startsAt: riyadh(sunday, '17:00').toISOString(),
      },
    });
    expect(res.status(), await res.text()).toBe(201);
    const { lessons } = (await res.json()) as { lessons: { id: string }[] };
    // The bell row is written before the booking returns; poll anyway (no assumption on timing).
    const rows = async () => {
      const [row] = await withSql(
        (sql) => sql<{ n: number }[]>`select count(*)::int as n from public.push_notifications
        where kind = 'new_student' and data->>'lessonId' = ${lessons[0]?.id ?? ''}`,
      );
      return row?.n;
    };
    await expect.poll(rows).toBe(1);

    const teacher = await asRole('teacher');
    await teacher.goto('/teacher');
    await openBell(teacher, new RegExp(`^${ar.bell.open}`));
    await expect(teacher.getByText(ar.notifications.new_student.title).first()).toBeVisible();
  });
});
