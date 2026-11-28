import { describe, expect, it } from 'vitest';
import { fakeDb } from '@/common/db/testing/fake-db';
import { fileRow, LESSON } from './lesson-files.fakes';
import { LessonFilesRepo } from './lesson-files.repo';

const insert = {
  lesson_id: LESSON,
  kind: 'homework',
  mime: 'image/png',
  size: 900,
  storage_path: `${LESSON}/a.png`,
};

describe('LessonFilesRepo.add (idempotent register)', () => {
  it('inserts once, ignoring a duplicate storage path', async () => {
    const f = fakeDb({ lesson_files: [{ data: fileRow() }] });
    expect(await new LessonFilesRepo(f.db).add(insert)).toEqual(fileRow());
    const opts = { onConflict: 'storage_path', ignoreDuplicates: true };
    expect(f.argsOf('lesson_files', 'upsert')).toEqual([insert, opts]);
    expect(f.trips).toEqual(['lesson_files']);
  });

  it('a retry returns the row the first register made', async () => {
    const f = fakeDb({ lesson_files: [{ data: null }, { data: fileRow() }] });
    expect(await new LessonFilesRepo(f.db).add(insert)).toEqual(fileRow());
    expect(f.argsOf('lesson_files', 'eq')).toEqual(['storage_path', `${LESSON}/a.png`]);
    expect(f.trips).toEqual(['lesson_files', 'lesson_files']);
  });
});
