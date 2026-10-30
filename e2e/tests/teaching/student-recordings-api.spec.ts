import { createClient } from '@supabase/supabase-js';
import { expect, test, type APIRequestContext } from '@playwright/test';
import { seedTeacherRow, seedUser } from '../../support/core/db';
import { seedFamily, withSql } from '../../support/core/schedule';
import { USERS } from '../../support/core/users';

// GET /students/:id/recordings against the real API and database: a group lesson's file shows only
// the asked student's context, and the service decides who may ask (teacher who never taught the
// student, assistant who is not assigned: 403). The assistants hold a custom role that grants
// recordings.read, because the system assistant role does not (the route's coarse gate).

const API = 'http://localhost:3100';
const TAG = String(Date.now()).slice(-6);
const env = (name: string) => process.env[name] ?? '';

async function tokenOf(email: string, password: string): Promise<string> {
  const client = createClient(env('SUPABASE_URL'), env('SUPABASE_SERVICE_ROLE_KEY'), { auth: { persistSession: false } });
  const { data, error } = await client.auth.signInWithPassword({ email, password });
  if (error || !data.session) throw error ?? new Error('no session');
  return data.session.access_token;
}

const list = (request: APIRequestContext, token: string, studentId: string) =>
  request.get(`${API}/students/${studentId}/recordings`, { headers: { authorization: `Bearer ${token}` } });

interface World {
  a: string;
  b: string;
  lessons: { both: string; onlyA: string; onlyB: string };
  tokens: Record<'admin' | 'teacher' | 'otherTeacher' | 'assistant' | 'strangerAssistant' | 'plainAssistant', string>;
}

async function seedWorld(): Promise<World> {
  const family = await seedFamily('أم الاختبار', [`سارة ${TAG}`, `ليان ${TAG}`]);
  const [a = '', b = ''] = family.studentIds;
  const pw = 'Recs-e2e-123';
  const other = await seedUser({ email: `t2-${TAG}@e2e.local`, password: pw, role: 'teacher', fullName: 'معلمة أخرى' });
  await seedTeacherRow(other, `معلمة أخرى ${TAG}`);
  const assistant = await seedUser({ email: `as1-${TAG}@e2e.local`, password: pw, role: 'assistant', fullName: 'مساعدة' });
  const stranger = await seedUser({ email: `as2-${TAG}@e2e.local`, password: pw, role: 'assistant', fullName: 'مساعدة أخرى' });
  const plain = await seedUser({ email: `as3-${TAG}@e2e.local`, password: pw, role: 'assistant', fullName: 'مساعدة بلا دور' });
  const lessons = await withSql(async (sql) => {
    const [t] = await sql<{ id: string }[]>`select t.id from public.teachers t join auth.users u on u.id = t.profile_id where u.email = ${USERS.teacher.email}`;
    const [role] = await sql<{ id: string }[]>`insert into public.roles (key, name_ar, base_role) values (${`rec-asst-${TAG}`}, 'مساعد التسجيلات', 'assistant') returning id`;
    await sql`insert into public.role_permissions (role_id, permission) values (${role?.id ?? ''}, 'recordings.read')`;
    await sql`update public.profiles set role_id = ${role?.id ?? ''} where id in (${assistant}, ${stranger})`;
    await sql`update public.students set teacher_id = ${t?.id ?? ''} where id = ${a}`;
    await sql`insert into public.student_assistants (student_id, profile_id) values (${a}, ${assistant}), (${a}, ${plain})`;
    const make = async (students: string[], daysAgo: number): Promise<string> => {
      const [l] = await sql<{ id: string }[]>`insert into public.lessons (teacher_id, starts_at, ends_at)
        values (${t?.id ?? ''}, now() - make_interval(days => ${daysAgo}), now() - make_interval(days => ${daysAgo}) + interval '30 minutes') returning id`;
      for (const s of students) await sql`insert into public.lesson_students (lesson_id, student_id) values (${l?.id ?? ''}, ${s})`;
      await sql`insert into public.lesson_recordings (lesson_id, status, file_path, started_at, ended_at)
        values (${l?.id ?? ''}, 'failed', ${`lessons/${l?.id ?? ''}/rec.mp4`}, now() - make_interval(days => ${daysAgo}), now() - make_interval(days => ${daysAgo}) + interval '20 minutes')`;
      return l?.id ?? '';
    };
    return { both: await make([a, b], 3), onlyA: await make([a], 2), onlyB: await make([b], 1) };
  });
  const tokens = {
    admin: await tokenOf(USERS.admin.email, USERS.admin.password),
    teacher: await tokenOf(USERS.teacher.email, USERS.teacher.password),
    otherTeacher: await tokenOf(`t2-${TAG}@e2e.local`, pw),
    assistant: await tokenOf(`as1-${TAG}@e2e.local`, pw),
    strangerAssistant: await tokenOf(`as2-${TAG}@e2e.local`, pw),
    plainAssistant: await tokenOf(`as3-${TAG}@e2e.local`, pw),
  };
  return { a, b, lessons, tokens };
}

test.describe('student recordings (real API + database)', () => {
  test.beforeEach(() => test.skip(test.info().project.name !== 'desktop', 'API only: one run'));
  let w: World;
  test.beforeAll(async () => {
    w = await seedWorld();
  });

  test("student A's file holds A's lessons only, with the right total and no sibling context", async ({ request }) => {
    const res = await list(request, w.tokens.admin, w.a);
    expect(res.status()).toBe(200);
    const body = await res.json();
    expect(body.total).toBe(2);
    expect(body.items.map((i: { lesson_id: string }) => i.lesson_id).sort()).toEqual([w.lessons.both, w.lessons.onlyA].sort());
    const text = JSON.stringify(body);
    expect(text).not.toContain(w.b);
    expect(text).not.toContain(w.lessons.onlyB);
    expect(text).not.toContain('student_id');
    expect(text).not.toContain('file_path');
    expect((await (await list(request, w.tokens.admin, w.b)).json()).total).toBe(2);
  });

  test('the assigned teacher and the assigned assistant read it', async ({ request }) => {
    expect((await list(request, w.tokens.teacher, w.a)).status()).toBe(200);
    const mine = await list(request, w.tokens.assistant, w.a);
    expect(mine.status()).toBe(200);
    expect((await mine.json()).total).toBe(2);
  });

  test('a teacher who never taught the student and an unassigned assistant get 403', async ({ request }) => {
    expect((await list(request, w.tokens.otherTeacher, w.a)).status()).toBe(403);
    expect((await list(request, w.tokens.strangerAssistant, w.a)).status()).toBe(403);
    expect((await list(request, w.tokens.assistant, w.b)).status()).toBe(403);
  });

  test('an assigned assistant on the system role (no recordings.read) is refused at the gate', async ({ request }) => {
    expect((await list(request, w.tokens.plainAssistant, w.a)).status()).toBe(403);
  });
});
