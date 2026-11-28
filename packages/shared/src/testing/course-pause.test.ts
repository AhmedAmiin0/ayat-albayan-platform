import { describe, expect, it } from 'vitest';
import { coursePauseResultSchema, coursePauseViewSchema } from '../people/students';
import { coursePauseFixture, coursePauseResultFixture } from './course-pause';

describe('course pause fixtures', () => {
  it('build a full pause view the api schema accepts, with the named fields kept', () => {
    const pause = coursePauseFixture({ until_date: '2026-12-10' });
    expect(coursePauseViewSchema.parse(pause)).toEqual(pause);
    expect(pause.until_date).toBe('2026-12-10');
  });

  it('build a write answer around a pause, every count zero unless named', () => {
    const result = coursePauseResultFixture({ reopened: 2 });
    expect(coursePauseResultSchema.parse(result)).toEqual(result);
    expect(result).toMatchObject({ cancelled: 0, reopened: 2, conflicts: 0 });
  });
});
