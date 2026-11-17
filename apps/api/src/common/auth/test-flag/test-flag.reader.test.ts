import { describe, expect, it, vi } from 'vitest';
import { TEST_FLAG_TTL_MS, TestFlagReader } from './test-flag.reader';
import type { TestFlagRepo } from './test-flag.repo';

const repoOf = (over: Partial<Record<keyof TestFlagRepo, () => Promise<boolean>>>) =>
  ({
    ofProfile: vi.fn(async () => true),
    ofStudent: vi.fn(async () => true),
    lessonAllTest: vi.fn(async () => true),
    ...over,
  }) as unknown as TestFlagRepo;

describe('TestFlagReader (docs/56)', () => {
  it('caches a profile flag for the TTL; forget() reads it again', async () => {
    let now = 0;
    const repo = repoOf({});
    const flags = new TestFlagReader(repo, () => now);
    await flags.ofUser('p1');
    await flags.ofUser('p1');
    expect(repo.ofProfile).toHaveBeenCalledTimes(1);
    now = TEST_FLAG_TTL_MS + 1;
    await flags.ofUser('p1');
    flags.forget(['p1']);
    await flags.ofUser('p1');
    expect(repo.ofProfile).toHaveBeenCalledTimes(3);
  });

  it('fails closed: a failed read is false, for the user, the student and the lesson', async () => {
    const boom = async () => Promise.reject(new Error('db down'));
    const repo = repoOf({ ofProfile: boom, ofStudent: boom, lessonAllTest: boom });
    const flags = new TestFlagReader(repo);
    await expect(flags.ofUser('p1')).resolves.toBe(false);
    await expect(flags.ofStudent('s1')).resolves.toBe(false);
    await expect(flags.ofLesson('l1')).resolves.toBe(false);
  });
});
