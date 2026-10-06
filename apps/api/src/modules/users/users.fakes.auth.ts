import type { AuthAdmin, AuthPatch } from './users.store';

/** In-memory Auth Admin API; `calls` records what was asked, never a secret beyond the fake's own state. */
export class FakeAuthAdmin implements AuthAdmin {
  users = new Map<string, { email: string; password?: string | undefined; banned: boolean }>();
  calls: string[] = [];
  private seq = 0;

  async findIdByEmail(email: string) {
    return [...this.users].find(([, u]) => u.email === email)?.[0] ?? null;
  }

  async create(input: { email: string; password?: string; fullName: string }) {
    this.seq += 1;
    const id = `auth-${this.seq}`;
    this.users.set(id, { email: input.email, password: input.password, banned: false });
    this.calls.push(`create:${id}`);
    return id;
  }

  async update(id: string, patch: AuthPatch) {
    const u = this.users.get(id) ?? { email: '', banned: false };
    this.users.set(id, { ...u, ...(patch.email && { email: patch.email }), ...(patch.password && { password: patch.password }), ...(patch.banned !== undefined && { banned: patch.banned }) });
    this.calls.push(`update:${id}`);
  }

  async remove(id: string) {
    this.users.delete(id);
    this.calls.push(`remove:${id}`);
  }

  async recoveryLink(email: string) {
    return `https://auth.example.test/verify?token=SECRET&email=${email}`;
  }

  async revokeSessions(id: string) {
    this.calls.push(`revoke:${id}`);
  }
}
