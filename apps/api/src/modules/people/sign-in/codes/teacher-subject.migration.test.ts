import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { migrationPath } from '@/common/db/repo-paths.test-util';

// Migration 20261111000100 read as text (docs/46 A2): the teacher subject of a sign-in code.
const sql = readFileSync(migrationPath('20261111000100_login_codes_teacher_subject.sql'), 'utf8');

describe('migration 000100: login_codes takes the teacher subject', () => {
  it('widens the subject check with every earlier kind kept', () => {
    expect(sql).toContain(
      "check (subject_kind in ('guardian', 'student', 'profile', 'report', 'teacher')) not valid;",
    );
  });

  it('NOT VALID then VALIDATE, under a short lock timeout, and nothing else changes', () => {
    expect(sql).toContain("set local lock_timeout = '5s';");
    expect(sql).toContain('validate constraint login_codes_subject_kind_check;');
    expect(sql).not.toMatch(/purpose_check|policy|grant/i);
  });
});
