import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { isLessonTimed, TEMPLATE_KEYS } from '@ab/shared';
import { REPO_ROOT } from '@/common/db/repo-paths.test-util';

// The lesson_join_link definition lives in migration 182 (seeded, not submitted, admin-initiated).
const root = REPO_ROOT;
const sql = readFileSync(join(root, 'packages/db/supabase/migrations/20261001000182_lesson_join_link_template.sql'), 'utf8');
const ar: { templates: { names: Record<string, string> } } = JSON.parse(readFileSync(join(root, 'packages/shared/i18n/ar.json'), 'utf8'));

describe('lesson_join_link template definition', () => {
  it('is a known key with a name in the template list', () => {
    expect(TEMPLATE_KEYS).toContain('lesson_join_link');
    expect(ar.templates.names.lesson_join_link).toBeTruthy();
  });

  it('is seeded as a utility template that is NOT submitted to Meta', () => {
    expect(sql).toContain("('lesson_join_link', 'lesson_join_link', 'utility'");
    expect(sql).not.toMatch(/'(approved|pending)'/);
    expect(sql).toContain('(key, meta_name, category, params, buttons, body_ar, footer_ar)');
  });

  it('has one URL button on the app origin carrying the token, and one body variable', () => {
    expect(sql).toContain('https://app.ayatalbayan.com/join/{{1}}');
    expect(sql).toContain('{{1}}');
    expect(sql).not.toContain('{{2}}');
    expect(sql).toContain('["student_name"]');
  });

  it('is lesson-timed: a link to a cancelled or moved lesson is dropped as stale (its expires_at is the room close)', () => {
    expect(isLessonTimed('lesson_join_link')).toBe(true);
  });

  it('migration 330 rewrites the body in Modern Standard Arabic only while it was never submitted', () => {
    const msa = readFileSync(join(root, 'packages/db/supabase/migrations/20261012000330_meeting_link_auto.sql'), 'utf8');
    expect(msa).toMatch(/where key = 'lesson_join_link'\s+and status = 'not_submitted'/);
    expect(msa).toContain('{{1}}');
    expect(msa).not.toContain('{{2}}');
    expect(msa).not.toMatch(/ دي |على طول|من غير/);
  });
});
