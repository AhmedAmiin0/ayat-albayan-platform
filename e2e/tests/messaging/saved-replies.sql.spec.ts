import { expect, test } from '@playwright/test';
import { assistant, code } from '../../support/sales/assistant';
import { as, rolledBack, userId } from '../../support/rls';
import { USERS } from '../../support/users';

// Saved replies «الردود السريعة» (owner 2026-10-25, migrations 670–672): shared rows (owner null) are
// read by the admin and assistants; personal rows by their owner alone; a teacher sees nothing. Writes
// go through the API only (migration 672): a logged-in user cannot write the table directly.
// saved_replies.manage is seeded for the system admin. Rolled back; database only.

const count = (tx: Parameters<Parameters<typeof rolledBack>[0]>[0]) => tx<{ n: number }[]>`select count(*)::int as n from public.saved_replies`;

test.describe('saved replies in the database (migrations 670–672)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('shared rows: everyone with the inbox reads them; a teacher reads nothing', async () => {
    await rolledBack(async (tx) => {
      await tx`delete from public.saved_replies`;
      const teacher = await userId(tx, USERS.teacher.email);
      const sara = await assistant(tx, 'saved-sara');
      await tx`insert into public.saved_replies (title, body) values ('الأسعار', 'السعر مرفق')`;
      expect((await as(tx, sara, () => count(tx)))[0]?.n).toBe(1);
      expect((await as(tx, teacher, () => count(tx)))[0]?.n).toBe(0);
    });
  });

  test('personal rows: only their owner reads them', async () => {
    await rolledBack(async (tx) => {
      await tx`delete from public.saved_replies`;
      const sara = await assistant(tx, 'saved-sara2');
      const huda = await assistant(tx, 'saved-huda');
      const admin = await userId(tx, USERS.admin.email);
      await tx`insert into public.saved_replies (owner_profile_id, title, body) values (${sara}, 'ردي', 'نص')`;
      expect((await as(tx, huda, () => count(tx)))[0]?.n).toBe(0);
      expect((await as(tx, admin, () => count(tx)))[0]?.n).toBe(0);
      expect((await as(tx, sara, () => count(tx)))[0]?.n).toBe(1);
    });
  });

  test('writes are API-only: not even the admin or a row\'s owner writes directly', async () => {
    await rolledBack(async (tx) => {
      await tx`delete from public.saved_replies`;
      const admin = await userId(tx, USERS.admin.email);
      const sara = await assistant(tx, 'saved-sara3');
      await tx`insert into public.saved_replies (owner_profile_id, title, body) values (${sara}, 'ردي', 'نص')`;
      expect(await code(tx, () => as(tx, admin, () => tx`insert into public.saved_replies (title, body) values ('س', 'ب')`))).toBe('42501');
      expect(await code(tx, () => as(tx, sara, () => tx`insert into public.saved_replies (owner_profile_id, title, body) values (${sara}, 'س', 'ب')`))).toBe('42501');
      expect(await code(tx, () => as(tx, sara, () => tx`update public.saved_replies set title = 'تعديل'`))).toBe('42501');
      expect(await code(tx, () => as(tx, sara, () => tx`delete from public.saved_replies`))).toBe('42501');
    });
  });

  test('one attachment belongs to one reply', async () => {
    await rolledBack(async (tx) => {
      const file = (title: string) => tx`insert into public.saved_replies (title, body, attachment_path, attachment_mime, attachment_name, attachment_size)
        values (${title}, 'ب', 'saved/x/same.pdf', 'application/pdf', 'a.pdf', 10)`;
      await file('أ');
      expect(await code(tx, () => file('ب'))).toBe('23505');
    });
  });

  test('checks: title 1–60 trimmed, the attachment whole or empty, and the admin seed', async () => {
    await rolledBack(async (tx) => {
      expect(await code(tx, () => tx`insert into public.saved_replies (title, body) values (' مسافة', 'ب')`)).toBe('23514');
      expect(await code(tx, () => tx`insert into public.saved_replies (title, body) values (${'ع'.repeat(61)}, 'ب')`)).toBe('23514');
      expect(await code(tx, () => tx`insert into public.saved_replies (title, body, attachment_path) values ('ع', 'ب', 'saved/x/y.pdf')`)).toBe('23514');
      expect(await code(tx, () => tx`insert into public.saved_replies (title, body, attachment_path, attachment_mime, attachment_name, attachment_size)
        values ('ع', 'ب', 'saved/x/y.webp', 'image/webp', 'y.webp', 10)`)).toBe('23514');
      const seeded = await tx<{ key: string }[]>`select r.key from public.role_permissions rp join public.roles r on r.id = rp.role_id
        where rp.permission = 'saved_replies.manage' order by r.key`;
      expect(seeded.map((r) => r.key)).toEqual(['admin']);
    });
  });
});
