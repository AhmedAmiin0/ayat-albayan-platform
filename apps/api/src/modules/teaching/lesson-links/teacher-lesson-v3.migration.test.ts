import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { TEACHER_LESSON_V3, templateCreateSchema } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { MIGRATIONS_DIR } from '@/common/db/repo-paths.test-util';
import { templateButtons } from '@/modules/messaging/whatsapp/messages/wa-json';

// Migration 20261106001300 seeds teacher_lesson_v3 (owner 2026-11-06). No database in unit tests:
// this pins the SQL to the shared definition, and its buttons to what the sender and «القوالب»
// read.
const sql = readFileSync(join(MIGRATIONS_DIR, '20261106001300_teacher_lesson_v3.sql'), 'utf8');
const jsonAfter = (n: number): unknown => {
  const literals = [...sql.matchAll(/'(\[[^']*\])'::jsonb/g)].map((m) => m[1] ?? '');
  return JSON.parse(literals[n] ?? 'null');
};

describe('migration 20261106001300: the teacher_lesson_v3 registry row', () => {
  it('the same body, footer, params and samples as the shared definition; not submitted', () => {
    expect(sql).toContain(`'${TEACHER_LESSON_V3.body}'`);
    expect(sql).toContain(`'${TEACHER_LESSON_V3.footer ?? ''}'`);
    expect(jsonAfter(0)).toEqual(TEACHER_LESSON_V3.params.map((p) => p.name));
    expect(jsonAfter(1)).toEqual(TEACHER_LESSON_V3.params.map((p) => p.sample));
    expect(sql).toContain("'utility', 'notifications', 'ar', 'not_submitted'");
    expect(sql).toContain('on conflict (key) do nothing;');
  });

  it('two URL buttons with a {{1}} suffix and a sample each, valid for «قالب جديد» and the sender', () => {
    const buttons = jsonAfter(2);
    expect(buttons).toEqual(TEACHER_LESSON_V3.buttons);
    expect(templateButtons(buttons as never)).toEqual(buttons);
    const row = { ...TEACHER_LESSON_V3, buttons };
    expect(templateCreateSchema.safeParse(row).success).toBe(true);
  });
});
