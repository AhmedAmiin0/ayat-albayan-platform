import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { migrationPath } from '@/common/db/repo-paths.test-util';
import { templateProblem } from '@/modules/messaging/whatsapp/template-review';

// Migration 20261106001400, read as text: no database here.
const sql = readFileSync(migrationPath('20261106001400_report_public_page.sql'), 'utf8')
  .split('\n')
  .filter((l) => !l.trim().startsWith('--'))
  .join('\n');

const bodies = [...sql.matchAll(/'(السلام عليكم[\s\S]*?)', null\)/g)].map((m) => m[1] ?? '');

describe("migration 900: the report's public id and its two link templates", () => {
  it('a random 32-hex public_id, unique and checked; nothing else of lesson_reports changes', () => {
    expect(sql).toContain("default replace(gen_random_uuid()::text, '-', '')");
    expect(sql).toContain('unique (public_id)');
    expect(sql).toContain("check (public_id ~ '^[0-9a-f]{32}$')");
    expect(sql).not.toMatch(/drop |delete from|update public\./i);
  });

  it('two utility templates on the notifications line, not submitted, the live page button', () => {
    for (const key of ['report_ready_teacher', 'report_ready_family']) {
      expect(sql).toContain(
        `('${key}', '${key}', 'ar', 'utility', 'notifications', 'not_submitted',`,
      );
    }
    const button = '"text": "عرض التقرير", "url": "https://app.ayatalbayan.com/report/{{1}}"';
    expect(sql.split(button)).toHaveLength(3);
    expect(sql).toContain('on conflict do nothing;');
  });

  it('positional bodies: teacher {{1}}-{{2}}, family {{1}}-{{4}}, each passing the submit check', () => {
    expect(bodies).toHaveLength(2);
    const slots = bodies.map((b) => [...b.matchAll(/\{\{(\d)\}\}/g)].map((m) => m[1]));
    expect(slots).toEqual([
      ['1', '2'],
      ['1', '2', '3', '4'],
    ]);
    const params = [
      ['student_name', 'lesson_date'],
      ['student_name', 'lesson_date', 'teacher_name', 'feedback_link'],
    ];
    bodies.forEach((body, i) =>
      expect(templateProblem({ body_ar: body, params: params[i] ?? [] })).toBeNull(),
    );
  });
});
