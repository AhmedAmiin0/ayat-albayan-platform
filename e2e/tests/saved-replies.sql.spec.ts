import { expect, test } from '@playwright/test';
import { assistant, code } from '../support/assistant';
import { as, rolledBack, userId } from '../support/rls';
import { USERS } from '../support/users';

// Saved replies «الردود السريعة» (owner 2026-10-25, migrations 670–671): shared rows (owner null) are
// read by the admin and assistants and written only with saved_replies.manage; personal rows belong to
// their owner alone; a teacher sees nothing. saved_replies.manage is seeded for the system admin.
// Rolled back; database only.

const count = (tx: Parameters<Parameters<typeof rolledBack>[0]>[0]) => tx<{ n: number }[]>`select count(*)::int as n from public.saved_replies`;

test.describe('saved replies in the database (migrations 670, 671)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'database only: one run'));

  test('shared rows: everyone with the inbox reads, only a manager writes; a teacher reads nothing', async () => {
    await rolledBack(async (tx) => {
      await tx`delete from public.saved_replies`;
      const admin = await userId(tx, USERS.admin.email);
      const teacher = await userId(tx, USERS.teacher.email);
      const sara = await assistant(tx, 'saved-sara');
      await as(tx, admin, () => tx`insert into public.saved_replies (title, body) values ('الأسعار', 'السعر مرفق')`);
      expect((await as(tx, sara, () => count(tx)))[0]?.n).toBe(1);
      expect((await as(tx, teacher, () => count(tx)))[0]?.n).toBe(0);
      expect(await code(tx, () => as(tx, sara, () => tx`insert into public.saved_replies (title, body) values ('س', 'ب')`))).toBe('42501');
      const edited = await as(tx, sara, () => tx`update public.saved_replies set title = 'تعديل' where owner_profile_id is null returning id`);
      expect(edited.length).toBe(0);
      await tx`insert into public.role_permissions (role_id, permission)
        select id, 'saved_replies.manage' from public.roles where is_system and key = 'sales'`;
      const granted = await as(tx, sara, () => tx`update public.saved_replies set title = 'تعديل' where owner_profile_id is null returning id`);
      expect(granted.length).toBe(1);
    });
  });

  test('personal rows: only their owner reads and writes them', async () => {
    await rolledBack(async (tx) => {
      await tx`delete from public.saved_replies`;
      const sara = await assistant(tx, 'saved-sara2');
      const huda = await assistant(tx, 'saved-huda');
      const admin = await userId(tx, USERS.admin.email);
      await as(tx, sara, () => tx`insert into public.saved_replies (owner_profile_id, title, body) values (${sara}, 'ردي', 'نص')`);
      expect((await as(tx, huda, () => count(tx)))[0]?.n).toBe(0);
      expect((await as(tx, admin, () => count(tx)))[0]?.n).toBe(0);
      const gone = await as(tx, huda, () => tx`delete from public.saved_replies returning id`);
      expect(gone.length).toBe(0);
      expect(await code(tx, () => as(tx, huda, () => tx`insert into public.saved_replies (owner_profile_id, title, body) values (${sara}, 'س', 'ب')`))).toBe('42501');
      expect((await as(tx, sara, () => count(tx)))[0]?.n).toBe(1);
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
