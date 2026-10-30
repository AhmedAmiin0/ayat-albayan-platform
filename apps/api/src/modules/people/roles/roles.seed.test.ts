import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { defaultGrantsOf, isGrantable } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { MIGRATIONS_DIR } from '@/common/db/repo-paths.test-util';

// The migrations seed the system roles' grants by hand; this keeps them equal to the catalog
// (packages/shared defaultGrantsOf), which the parity test proves equal to the old @Roles table.
const MIGRATIONS = MIGRATIONS_DIR;
const SQL = readFileSync(join(MIGRATIONS, '20261005000220_roles_permissions.sql'), 'utf8');
// Keys added later by an idempotent insert: select r.id, '<key>' from public.roles r where ... r.key in ('admin', 'teacher')
const LATER = [
  '20261005000240_student_recordings.sql',
  '20261006000274_assistant_scope_roles.sql',
  '20261006000281_student_logins.sql',
  '20261012000300_sales_messages_read.sql',
  '20261012000360_restricted_templates.sql',
  '20261012000380_notification_bell.sql',
  '20261012000430_sales_check_start_permissions.sql',
  '20261020000521_chat_lists_permission.sql',
  '20261023000620_wa_numbers.sql',
  '20261024000632_notification_rules.sql',
  '20261025000671_saved_replies_permission.sql',
  '20261026000760_sales_pricing_read.sql',
  '20261028000800_student_channels.sql',
  '20261028000890_sales_lesson_moves.sql',
  '20261028000936_sales_lesson_confirm.sql',
  '20261028000958_courses_pause_permission.sql',
  '20261029000970_sales_renew_any_permission.sql',
  '20261029000975_leads_link_family_permission.sql',
  '20261030000985_course_stop_permissions.sql',
]
  .map((file) => readFileSync(join(MIGRATIONS, file), 'utf8'))
  .join('\n');

function seeded(key: string): string[] {
  const block = SQL.match(new RegExp(`\\('${key}', array\\[([^\\]]*)\\]\\)`));
  return block?.[1] ? [...block[1].matchAll(/'([a-z_.]+)'/g)].map((m) => m[1] ?? '') : [];
}

function addedLater(key: string): string[] {
  const inserts = LATER.matchAll(/select r\.id, '([a-z_.]+)' from public\.roles r where [^;]*?r\.key in \(([^)]*)\)/g);
  return [...inserts].filter((m) => [...(m[2] ?? '').matchAll(/'([a-z_]+)'/g)].some((k) => k[1] === key)).map((m) => m[1] ?? '');
}

describe('migration 20261005000220 seed (+ 240, 274, 281, 300, 360, 380, 430, 521, 620, 631, 671, 760, 800, 890, 936, 958, 970, 975, 985)', () => {
  it.each(['admin', 'teacher', 'assistant', 'sales'] as const)('%s gets exactly its catalog grants', (key) => {
    expect([...seeded(key), ...addedLater(key)].sort()).toEqual([...defaultGrantsOf(key)].sort());
  });

  it('seeds recordings.manage for the admin and the teacher only', () => {
    expect(['admin', 'teacher', 'assistant', 'sales'].filter((k) => addedLater(k).includes('recordings.manage'))).toEqual(['admin', 'teacher']);
  });

  it('seeds users.read and users.write for the admin only', () => {
    expect(['admin', 'teacher', 'assistant', 'sales'].filter((k) => addedLater(k).includes('users.write'))).toEqual(['admin']);
    expect(addedLater('admin')).toEqual(expect.arrayContaining(['users.read', 'users.write']));
  });

  it('seeds templates.send_all (every template, 2026-10-12) for the admin only', () => {
    expect(['admin', 'teacher', 'assistant', 'sales'].filter((k) => addedLater(k).includes('templates.send_all'))).toEqual(['admin']);
  });

  it('seeds notifications.push (the bell, 2026-10-12) for teacher, assistant and sales; the admin had it', () => {
    expect(['teacher', 'assistant', 'sales'].filter((k) => addedLater(k).includes('notifications.push'))).toEqual(['teacher', 'assistant', 'sales']);
    expect(seeded('admin')).toContain('notifications.push');
  });

  it('seeds saved_replies.manage «الردود السريعة» (2026-10-25) for the admin only', () => {
    expect(['admin', 'teacher', 'assistant', 'sales'].filter((k) => addedLater(k).includes('saved_replies.manage'))).toEqual(['admin']);
  });

  it('seeds inbox.lists «القوائم» (2026-10-20) for admin and sales only, never a teacher', () => {
    expect(['admin', 'teacher', 'assistant', 'sales'].filter((k) => addedLater(k).includes('inbox.lists'))).toEqual(['admin', 'sales']);
  });

  it('seeds pricing.read «عرض سعر» (2026-10-26) for the system sales role only, never a teacher, idempotently', () => {
    expect(['admin', 'teacher', 'assistant', 'sales'].filter((k) => addedLater(k).includes('pricing.read'))).toEqual(['sales']);
    const sql = readFileSync(join(MIGRATIONS, '20261026000760_sales_pricing_read.sql'), 'utf8');
    expect(sql).toMatch(/where r\.is_system and r\.key in \('sales'\)\s+on conflict do nothing;/);
  });

  it('seeds lessons.reschedule and lessons.cancel (sales, 2026-10-27) for admin and sales only, idempotently', () => {
    for (const perm of ['lessons.reschedule', 'lessons.cancel']) {
      expect(['admin', 'teacher', 'assistant', 'sales'].filter((k) => addedLater(k).includes(perm))).toEqual(['admin', 'sales']);
    }
    const sql = readFileSync(join(MIGRATIONS, '20261028000890_sales_lesson_moves.sql'), 'utf8');
    expect(sql.match(/on conflict do nothing;/g)).toHaveLength(2);
  });

  it('seeds lessons.confirm «تأكيد الحلقة» (sales, 2026-10-28) for admin and sales only, idempotently', () => {
    expect(['admin', 'teacher', 'assistant', 'sales'].filter((k) => addedLater(k).includes('lessons.confirm'))).toEqual(['admin', 'sales']);
    const sql = readFileSync(join(MIGRATIONS, '20261028000936_sales_lesson_confirm.sql'), 'utf8');
    expect(sql.match(/on conflict do nothing;/g)).toHaveLength(1);
  });

  it('seeds courses.pause «إيقاف الدورة مؤقتًا» (2026-10-28) for admin and sales only, idempotently', () => {
    expect(['admin', 'teacher', 'assistant', 'sales'].filter((k) => addedLater(k).includes('courses.pause'))).toEqual(['admin', 'sales']);
    const sql = readFileSync(join(MIGRATIONS, '20261028000958_courses_pause_permission.sql'), 'utf8');
    expect(sql.match(/on conflict do nothing;/g)).toHaveLength(1);
  });

  it('seeds sales.renew_any (2026-10-29) for the system admin only (never sales by default), idempotently', () => {
    expect(['admin', 'teacher', 'assistant', 'sales'].filter((k) => addedLater(k).includes('sales.renew_any'))).toEqual(['admin']);
    const sql = readFileSync(join(MIGRATIONS, '20261029000970_sales_renew_any_permission.sql'), 'utf8');
    expect(sql).toMatch(/where r\.is_system and r\.key in \('admin'\)\s+on conflict do nothing;/);
    expect(sql.match(/on conflict do nothing;/g)).toHaveLength(1);
  });

  it('seeds leads.link_family «ربط بطالب موجود» (2026-10-29) for the system admin only (never sales), idempotently', () => {
    expect(['admin', 'teacher', 'assistant', 'sales'].filter((k) => addedLater(k).includes('leads.link_family'))).toEqual(['admin']);
    const sql = readFileSync(join(MIGRATIONS, '20261029000975_leads_link_family_permission.sql'), 'utf8');
    expect(sql).toMatch(/where r\.is_system and r\.key in \('admin'\)\s+on conflict do nothing;/);
  });

  it('seeds students.check_registration and subscriptions.set_start_date (2026-10-12) for admin and sales only', () => {
    for (const perm of ['students.check_registration', 'subscriptions.set_start_date']) {
      expect(['admin', 'teacher', 'assistant', 'sales'].filter((k) => addedLater(k).includes(perm))).toEqual(['admin', 'sales']);
    }
  });

  it('430 also grants subscriptions.set_start_date to existing custom roles based on sales (never check_registration)', () => {
    const sql = readFileSync(join(MIGRATIONS, '20261012000430_sales_check_start_permissions.sql'), 'utf8');
    const custom = [...sql.matchAll(/select r\.id, '([a-z_.]+)' from public\.roles r where not r\.is_system and r\.base_role = 'sales'\s+on conflict do nothing;/g)];
    expect(custom.map((m) => m[1])).toEqual(['subscriptions.set_start_date']);
  });

  it('433 removes any grant left on the system portal roles (guardian, student), idempotently', () => {
    const sql = readFileSync(join(MIGRATIONS, '20261012000433_portal_role_grants_cleanup.sql'), 'utf8');
    const del = sql.replace(/--[^\n]*\n/g, '').replace(/\s+/g, ' ').trim();
    expect(del).toBe(
      "delete from public.role_permissions rp using public.roles r where rp.role_id = r.id and r.is_system and r.key in ('guardian', 'student');",
    );
    expect(LATER).not.toMatch(/r\.key in \([^)]*'(guardian|student)'/);
  });

  it('seeds nothing for guardians and only grantable keys', () => {
    expect(seeded('guardian')).toEqual([]);
    for (const key of ['admin', 'teacher', 'assistant', 'sales']) expect(seeded(key).every(isGrantable)).toBe(true);
  });

  it('seeds notifications.manage «الإشعارات» (docs/23 phase 4) for the admin among the system roles', () => {
    expect(['admin', 'teacher', 'assistant', 'sales'].filter((k) => addedLater(k).includes('notifications.manage'))).toEqual(['admin']);
  });

  it('seeds numbers.manage «الأرقام» (docs/23 phase 3) for the admin only', () => {
    expect(['admin', 'teacher', 'assistant', 'sales'].filter((k) => addedLater(k).includes('numbers.manage'))).toEqual(['admin']);
  });
});
