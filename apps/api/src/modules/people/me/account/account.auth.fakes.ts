import { conflict } from '@/common/http/errors';
import type { AccountAuth } from './account.ports';
import { ME_ID, PASSWORD } from './account.me.fakes';

export class FakeAccountAuth implements AccountAuth {
  emails = new Map([[ME_ID, 'old@example.test']]);
  passwords = new Map([['old@example.test', PASSWORD]]);
  updates: { id: string; patch: { email?: string; password?: string } }[] = [];
  takenEmails = new Set<string>();
  revoked: { userId: string; keep: string | null }[] = [];

  async emailOf(id: string) {
    return this.emails.get(id) ?? null;
  }
  async passwordMatches(input: { email: string; password: string }) {
    return this.passwords.get(input.email) === input.password;
  }
  async update(id: string, patch: { email?: string; password?: string }) {
    if (patch.email && this.takenEmails.has(patch.email)) throw conflict('email_taken');
    this.updates.push({ id, patch });
    if (patch.email) this.emails.set(id, patch.email);
  }
  async revokeOtherSessions(input: { userId: string; keep: string | null }) {
    this.revoked.push(input);
  }
}
