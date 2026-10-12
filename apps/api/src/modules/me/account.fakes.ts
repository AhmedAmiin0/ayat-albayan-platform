import type { AuthUser } from '../../common/auth/verify-token';
import { conflict } from '../scheduling/errors';
import { AccountAvatarService } from './account.avatar.service';
import type { AccountAuth, AccountFiles, AccountRow, AccountStore, SelfPatch } from './account.ports';
import { AccountPorts } from './account.ports.provider';
import { AccountService } from './account.service';

// Test helper (not a test): in-memory ports of the account services.

export const ME: AuthUser = { id: 'user-1', email: 'old@example.test', role: 'teacher' };
export const PASSWORD = 'Current-pass-1';

export class FakeAccountStore implements AccountStore {
  rows = new Map<string, AccountRow>([
    ['user-1', { id: 'user-1', full_name: 'Huda', phone_e164: null, avatar_path: null, role: { base: 'teacher', key: 'teacher', name_ar: 'teacher-ar', name_en: 'Teacher' } }],
  ]);
  /** Every patch exactly as the store received it. */
  patches: Record<string, unknown>[] = [];
  takenPhones = new Set<string>();

  async get(id: string) {
    return this.rows.get(id) ?? null;
  }
  async update(id: string, patch: SelfPatch) {
    this.patches.push({ ...patch });
    const row = this.rows.get(id);
    if (row) this.rows.set(id, { ...row, ...patch });
  }
  async phoneTaken(phone: string) {
    return this.takenPhones.has(phone);
  }
}

export class FakeAccountAuth implements AccountAuth {
  emails = new Map([['user-1', 'old@example.test']]);
  passwords = new Map([['old@example.test', PASSWORD]]);
  updates: { id: string; patch: { email?: string; password?: string } }[] = [];
  takenEmails = new Set<string>();

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
}

export class FakeAccountFiles implements AccountFiles {
  objects = new Map<string, { size: number; contentType: string; bytes: Uint8Array }>();
  removed: string[] = [];

  async uploadUrl(path: string) {
    return { bucket: 'avatars', path, token: 'tok', signed_url: `https://storage.test/${path}` };
  }
  async info(path: string) {
    const o = this.objects.get(path);
    return o ? { size: o.size, contentType: o.contentType } : null;
  }
  async head(path: string, bytes: number) {
    return this.objects.get(path)?.bytes.slice(0, bytes) ?? null;
  }
  async url(path: string) {
    return `https://storage.test/signed/${path}`;
  }
  async remove(path: string) {
    this.removed.push(path);
    this.objects.delete(path);
  }
}

export const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d]);

export function accountKit(min = 8) {
  const store = new FakeAccountStore();
  const auth = new FakeAccountAuth();
  const files = new FakeAccountFiles();
  const ports = new AccountPorts(store, auth, files);
  const config = { passwordMinLength: min, supabaseUrl: 'http://supabase.test', signInKey: 'test-key' };
  const account = new AccountService(ports, config);
  const avatar = new AccountAvatarService(ports, account);
  return { store, auth, files, account, avatar };
}
