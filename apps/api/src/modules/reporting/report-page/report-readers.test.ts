import { describe, expect, it, vi } from 'vitest';
import type { AuthUser } from '@/common/auth/verify-token';
import { pageFacts, STUDENT_ID, user } from './report-page.fakes';
import type { ReportPageRepo } from './report-page.repo';
import { ReportReaders } from './report-readers';

function readers(owned: readonly string[] = []) {
  const repo = { owns: vi.fn(async (profileId: string) => owned.includes(profileId)) };
  return { r: new ReportReaders(repo as unknown as ReportPageRepo), repo };
}
const read = (r: ReportReaders, u: AuthUser) =>
  r.canRead({ user: u, studentId: STUDENT_ID, facts: pageFacts() });

describe('ReportReaders — who reads a submitted report while signed in', () => {
  it("admin, the lesson's teacher, the guardian and the student's own account", async () => {
    const { r } = readers();
    for (const u of [user('admin'), user('teacher'), user('guardian'), user('student')]) {
      expect(await read(r, u)).toBe(true);
    }
  });

  it('another teacher, another family or a login without a role: refused', async () => {
    const { r } = readers();
    for (const u of [
      user('teacher', 'x'),
      user('guardian', 'x'),
      user('student', 'x'),
      user(null),
    ]) {
      expect(await read(r, u)).toBe(false);
    }
  });

  it("the student's owning assistant (sales or classroom assistant) only", async () => {
    const { r, repo } = readers(['owner-1']);
    expect(await read(r, user('sales', 'owner-1'))).toBe(true);
    expect(await read(r, user('assistant', 'owner-1'))).toBe(true);
    expect(await read(r, user('sales', 'other'))).toBe(false);
    expect(await read(r, user('assistant', 'other'))).toBe(false);
    expect(repo.owns).toHaveBeenCalledWith('owner-1', STUDENT_ID);
  });
});
