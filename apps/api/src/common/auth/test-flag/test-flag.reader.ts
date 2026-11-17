import type { TestFlagRepo } from './test-flag.repo';

/** How long a profile's flag is reused; the admin switch forgets it at once on this API copy. */
export const TEST_FLAG_TTL_MS = 30_000;

interface Entry {
  value: Promise<boolean>;
  expires: number;
}

const failClosed = (): boolean => false;

/**
 * The signed-in profile's is_test for the AuthGuard (AuthUser.isTest) and the double condition's
 * student half. Any failed read is `false`: a check is never skipped on doubt (fail closed).
 * Provided by AuthModule's factory (the clock is injectable for tests).
 */
export class TestFlagReader {
  private readonly users = new Map<string, Entry>();

  constructor(
    private readonly repo: TestFlagRepo,
    private readonly now: () => number = Date.now,
  ) {}

  ofUser(profileId: string): Promise<boolean> {
    const at = this.now();
    const hit = this.users.get(profileId);
    if (hit && hit.expires > at) return hit.value;
    const value = this.repo.ofProfile(profileId).catch(failClosed);
    this.users.set(profileId, { value, expires: at + TEST_FLAG_TTL_MS });
    return value;
  }

  ofStudent(studentId: string): Promise<boolean> {
    return this.repo.ofStudent(studentId).catch(failClosed);
  }

  ofLesson(lessonId: string): Promise<boolean> {
    return this.repo.lessonAllTest(lessonId).catch(failClosed);
  }

  /** The admin switch changed this profile (or its family): read it again on the next request. */
  forget(profileIds: readonly string[]): void {
    for (const id of profileIds) this.users.delete(id);
  }
}
