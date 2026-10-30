import { createClient } from '@supabase/supabase-js';
import { expect, type Page } from '@playwright/test';
import { API, bearer } from '../messages';
import { withSql } from '../core/schedule';

// The Google sync's e2e helpers (docs/24 §5): tools/google-stub stands in for Google, so nothing
// in e2e ever reaches a real account. Fake ids and names only.

export const GOOGLE_STUB = 'http://localhost:4120'; // = playwright.config.ts GOOGLE_STUB_PORT
export const STUB_TEACHER_CAL = 'stub-teacher-cal@group.calendar.google.com';

export interface StubEvent {
  id: string;
  summary: string;
  description: string;
  location: string;
  extendedProperties?: { private?: Record<string, string> };
}
export interface StubState {
  calendars: Record<string, StubEvent[]>;
  files: { id: string; name: string; mimeType: string; parents: string[]; appProperties: Record<string, string> }[];
  sheets: Record<string, unknown[][]>;
}

export async function stubState(): Promise<StubState> {
  return (await fetch(`${GOOGLE_STUB}/__stub/state`)).json() as Promise<StubState>;
}

/** A fresh stub account, and no Google sync rows, settings or tokens left from a run. */
export async function resetGoogle(): Promise<void> {
  await fetch(`${GOOGLE_STUB}/__stub/reset`, { method: 'POST' });
  await withSql(async (sql) => {
    await sql`delete from public.google_sync_items`;
    await sql`delete from public.google_teacher_calendars`;
    await sql`delete from public.google_student_files`;
    await sql`delete from public.google_account`;
    await sql`delete from public.settings where key in ('google_sync_enabled', 'google_sync_mode', 'google_calendar_window_days')`;
    await sql`select public.google_token_clear()`;
  });
}

export async function googleApi<T>(page: Page, input: { method: string; path: string; body?: unknown }): Promise<T> {
  const res = await fetch(`${API}/admin/google${input.path}`, {
    method: input.method,
    headers: { ...(await bearer(page)), ...(input.body !== undefined ? { 'content-type': 'application/json' } : {}) },
    ...(input.body !== undefined ? { body: JSON.stringify(input.body) } : {}),
  });
  expect(res.ok, `${input.method} ${input.path} → ${res.status}`).toBe(true);
  return res.json() as Promise<T>;
}

interface ItemRow {
  kind: string;
  state: string;
  skip_reason: string | null;
  google_id: string | null;
  planned: { method: string; target: string; summary: string } | null;
}

export async function itemsOf(subjectId: string): Promise<ItemRow[]> {
  return withSql((sql) => sql<ItemRow[]>`
    select kind, state, skip_reason, google_id, planned from public.google_sync_items where subject_id = ${subjectId} order by kind`);
}

/** A tiny PDF in the reports bucket, and the report row pointing at it, made `ready` (the trigger queues it). */
export async function readyReport(input: { lessonId: string; studentId: string; teacherId: string }): Promise<string> {
  const path = `${input.studentId}/${input.lessonId}.pdf`;
  const storage = createClient(process.env['SUPABASE_URL'] ?? '', process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? '', { auth: { persistSession: false } });
  const { error } = await storage.storage.from('reports').upload(path, new TextEncoder().encode('%PDF-1.4\n%e2e\n'), { contentType: 'application/pdf', upsert: true });
  if (error) throw new Error(`pdf upload: ${error.message}`);
  return withSql(async (sql) => {
    await sql`update public.lessons set status = 'completed' where id = ${input.lessonId}`;
    await sql`update public.lesson_students set attendance = 'on_time' where lesson_id = ${input.lessonId}`;
    const [r] = await sql<{ id: string }[]>`insert into public.lesson_reports
      (lesson_id, student_id, teacher_id, attendance, recited, grade_overall, status, version, submitted_at, pdf_path, pdf_status)
      values (${input.lessonId}, ${input.studentId}, ${input.teacherId}, 'on_time', 'الفاتحة', 'excellent', 'submitted', 1, now(), ${path}, 'pending')
      returning id`;
    if (!r) throw new Error('report not written');
    await sql`update public.lesson_reports set pdf_status = 'ready' where id = ${r.id}`;
    return r.id;
  });
}
