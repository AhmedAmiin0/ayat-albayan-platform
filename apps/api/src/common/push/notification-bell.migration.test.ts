import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { INTEGRATION_SECRET_KEYS, PUSH_KINDS, SETTING_DEFAULTS } from '@ab/shared';
import { describe, expect, it } from 'vitest';

// Migrations 380–382 (R-NOT-01..03). No database runs in unit tests: this pins their shape.
const dir = join(__dirname, '../../../../../packages/db/supabase/migrations');
const read = (file: string) => readFileSync(join(dir, file), 'utf8');
const bell = read('20261012000380_notification_bell.sql');
const kinds = read('20261012000381_push_kinds.sql');
const teacher = read('20261012000382_teacher_whatsapp.sql');
const code = (sql: string) => sql.split('\n').filter((l) => !l.trimStart().startsWith('--')).join('\n');

describe('migration 380: the bell and browser push', () => {
  it('adds read_at and the unread partial index, re-runnably', () => {
    expect(bell).toContain('alter table public.push_notifications add column if not exists read_at timestamptz;');
    expect(bell).toMatch(/create index if not exists push_notifications_unread_idx on public\.push_notifications \(profile_id\)\s+where read_at is null;/);
  });

  it('web_push_subscriptions: RLS on, own-read only, writes revoked from clients, checked columns', () => {
    expect(bell).toContain('create table if not exists public.web_push_subscriptions');
    expect(bell).toContain('references public.profiles (id) on delete cascade');
    expect(bell).toContain("check (endpoint ~ '^https://' and char_length(endpoint) <= 2048)");
    expect(bell).toContain("check (p256dh ~ '^[A-Za-z0-9_-]{87}$')");
    expect(bell).toContain("check (auth ~ '^[A-Za-z0-9_-]{22}$')");
    expect(bell).toContain('alter table public.web_push_subscriptions enable row level security;');
    expect(bell).toContain('revoke all on public.web_push_subscriptions from anon;');
    expect(bell).toMatch(/revoke insert, update, delete, truncate, references, trigger on public\.web_push_subscriptions\s+from authenticated;/);
    expect(bell).toContain('using (profile_id = (select auth.uid()));');
  });

  it('integration_secret_key_ok lists the shared secret keys of its day (Kapso came in 450, Google in 20261022000610, the CRM in 640, the TURN password in 740)', () => {
    const fn = /integration_secret_key_ok\(p_key text\)[\s\S]*?array\[([\s\S]*?)\]/.exec(bell)?.[1] ?? '';
    const listed = [...fn.matchAll(/'([A-Z_]+)'/g)].map((m) => m[1]);
    expect(listed.sort()).toEqual(INTEGRATION_SECRET_KEYS.filter((k) => !k.startsWith('KAPSO_') && !k.startsWith('GOOGLE_') && !k.startsWith('WACRM_') && !k.startsWith('CALLS_')).sort());
  });

  it('grants notifications.push to the teacher, assistant and sales system roles', () => {
    expect(bell).toContain("select r.id, 'notifications.push' from public.roles r where r.is_system and r.key in ('teacher', 'assistant', 'sales')\non conflict do nothing;");
  });
});

describe('migration 381: the new push kinds, alone', () => {
  it('only adds the two enum values, re-runnably', () => {
    const statements = code(kinds).split(';').map((s) => s.trim()).filter(Boolean);
    expect(statements).toEqual([
      "alter type public.push_kind add value if not exists 'new_student'",
      "alter type public.push_kind add value if not exists 'meeting_invite'",
    ]);
    expect(PUSH_KINDS).toEqual(expect.arrayContaining(['new_student', 'meeting_invite']));
  });
});

describe('migration 382: the teacher’s WhatsApp', () => {
  it('seeds teacher_new_student as a not-submitted utility template with three variables', () => {
    expect(teacher).toContain("('teacher_new_student', 'teacher_new_student', 'utility', 'notifications',");
    expect(teacher).toContain('\'["student_name", "lesson_when", "lesson_kind"]\'');
    expect(code(teacher)).not.toMatch(/'(approved|pending)'/);
    for (const slot of ['{{1}}', '{{2}}', '{{3}}']) expect(teacher).toContain(slot);
    expect(teacher).toContain('on conflict (key) do nothing;');
  });

  it('seeds both switches ON, like the registry defaults', () => {
    expect(teacher).toContain("('teacher_whatsapp_new_student', 'true'::jsonb)");
    expect(teacher).toContain("('teacher_whatsapp_lesson_reminder', 'true'::jsonb)");
    expect(SETTING_DEFAULTS.teacher_whatsapp_new_student).toBe(true);
    expect(SETTING_DEFAULTS.teacher_whatsapp_lesson_reminder).toBe(true);
  });
});
