// Teacher directory loading on invented files in a temp dir.
import { mkdtempSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';
import { TEST_TEACHERS } from '../test-setup.ts';
import { loadTeacherDirectory, setTeacherDirectory, teacherDirectory } from './teachers.dir.ts';
import { teacherFromText } from './values.ts';

const dir = mkdtempSync(join(tmpdir(), 'ab-teachers-'));
afterEach(() => setTeacherDirectory(TEST_TEACHERS));

describe('teacher directory', () => {
  it('refuses to plan without the owner file', () => {
    expect(() => loadTeacherDirectory(join(dir, 'none.json'))).toThrow(/RUNBOOK/);
    const bad = join(dir, 'bad.json');
    writeFileSync(bad, '{"names":{}}');
    expect(() => loadTeacherDirectory(bad)).toThrow(/malformed/);
  });

  it('loads names and aliases; aliases match any Arabic spelling', () => {
    const file = join(dir, 'teachers.json');
    writeFileSync(file, JSON.stringify({ names: { nour: 'نور' }, aliases: { نورة: 'nour' } }));
    loadTeacherDirectory(file);
    expect(teacherDirectory().names).toEqual({ nour: 'نور' });
    expect(teacherFromText('نوره')).toBe('nour');
    expect(teacherFromText('Nour')).toBe('nour');
    expect(teacherFromText('abrar')).toBeUndefined();
  });
});
