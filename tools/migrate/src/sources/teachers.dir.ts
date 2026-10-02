// Teacher directory: which slugs exist, their Arabic display names, and the free-text spellings
// (A3 aliases) that name each one. Teachers' full names are personal data and stay out of git: the
// CLI loads the owner's git-ignored cache/teachers.json, tests install an invented fixture
// (src/test-setup.ts). Shape of the JSON:
//   { "names":   { "<slug>": "<Arabic display name>", … },      // slug = keys.teacher natural key
//     "aliases": { "<Arabic spelling>": "<slug>", … } }          // matched after normalizeArabic
import { normalizeArabic } from '@ab/shared';
import { cachePath, readJson } from '../cache.ts';

export interface TeacherDirectory {
  names: Readonly<Record<string, string>>;
  aliases: Readonly<Record<string, string>>;
}

let current: TeacherDirectory = { names: {}, aliases: {} };

/** Alias keys are stored normalized, so lookups match any أ/ا, ة/ه, ى/ي spelling. */
export function setTeacherDirectory(d: TeacherDirectory): void {
  const aliases = Object.fromEntries(
    Object.entries(d.aliases).map(([k, v]) => [normalizeArabic(k).trim(), v]),
  );
  current = { names: { ...d.names }, aliases };
}

export function teacherDirectory(): TeacherDirectory {
  return current;
}

/** Reads cache/teachers.json; a plan without it would reject every teacher, so it must exist. */
export function loadTeacherDirectory(path = cachePath.teachers()): void {
  const d = readJson<TeacherDirectory | undefined>(path, undefined);
  if (!d?.names || !d.aliases) {
    throw new Error(`${path} is missing or malformed: see tools/migrate/RUNBOOK.md (step 1)`);
  }
  setTeacherDirectory(d);
}
