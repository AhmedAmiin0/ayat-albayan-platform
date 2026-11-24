import { addDays, riyadhToday } from '@ab/time';
import { describe, expect, it, vi } from 'vitest';
import { assertPauseDates, assertStudent } from './course-pause.guards';

// The checks a pause and its preview share.
describe('course-pause guards', () => {
  it('an unknown student is a 404', async () => {
    const repo = { studentExists: vi.fn().mockResolvedValue(false) };
    await expect(assertStudent(repo, 's1')).rejects.toMatchObject({ status: 404 });
    repo.studentExists.mockResolvedValue(true);
    await expect(assertStudent(repo, 's1')).resolves.toBeUndefined();
  });

  it('an end before the start is a 400; an open-ended pause from today passes', () => {
    const today = riyadhToday();
    expect(() => assertPauseDates(today, addDays(today, -1))).toThrow();
    expect(() => assertPauseDates(today, null)).not.toThrow();
  });
});
