import type { AuthAdmin, AuthPatch } from '@/modules/people/users/store/users.store';

/** In-memory Auth Admin API; `calls` records what was asked, never a secret beyond the fake's own state. */
export class FakeAuthAdmin implements AuthAdmin {
  users = new Map<string, { email: string; password?: string | undefined; banned: boolean }>();
  calls: string[] = [];
  /** What each update asked for (the secrets in it are the fake's own). */
  patches: { id: string; patch: AuthPatch }[] = [];
  private seq = 0;

  findIdByEmail(email: string) {
    return Promise.resolve([...this.users].find(([, u]) => u.email === email)?.[0] ?? null);
  }

  create(input: { email: string; password?: string; fullName: string }) {
    this.seq += 1;
    const id = `auth-${this.seq}`;
    this.users.set(id, { email: input.email, password: input.password, banned: false });
    this.calls.push(`create:${id}`);
    return Promise.resolve(id);
  }

  update(id: string, patch: AuthPatch) {
    const u = this.users.get(id) ?? { email: '', banned: false };
    this.users.set(id, {
      ...u,
      ...(patch.email && { email: patch.email }),
      ...(patch.password && { password: patch.password }),
      ...(patch.banned !== undefined && { banned: patch.banned }),
    });
    this.calls.push(`update:${id}`);
    this.patches.push({ id, patch });
    return Promise.resolve();
  }

  remove(id: string) {
    this.users.delete(id);
    this.calls.push(`remove:${id}`);
    return Promise.resolve();
  }

  recoveryLink(email: string) {
    return Promise.resolve(`https://auth.example.test/verify?token=SECRET&email=${email}`);
  }

  revokeSessions(id: string) {
    this.calls.push(`revoke:${id}`);
    return Promise.resolve();
  }
}
