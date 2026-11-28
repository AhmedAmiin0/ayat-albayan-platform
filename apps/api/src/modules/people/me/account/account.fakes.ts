import { AvatarWriter } from '@/common/storage/avatars/avatar-writer';
import { FakeAvatarFiles } from '@/common/storage/avatars/avatars.fakes';
import { AccountAvatarService } from './account.avatar.service';
import type { AccountRow, AccountStore, SelfPatch } from './account.ports';
import { ME_ID } from './account.me.fakes';
import { AccountService } from './account.service';
import { AccountSetupService } from './account.setup.service';
import { FakeAccountAuth } from './account.auth.fakes';

// Test helper (not a test): in-memory ports of the account services.

class FakeAccountStore implements AccountStore {
  rows = new Map<string, AccountRow>([
    [
      ME_ID,
      {
        id: ME_ID,
        full_name: 'Huda',
        phone_e164: null,
        avatar_path: null,
        role: { base: 'teacher', key: 'teacher', name_ar: 'teacher-ar', name_en: 'Teacher' },
      },
    ],
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

export const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0x0d]);

export function accountKit(min = 8) {
  const store = new FakeAccountStore();
  const auth = new FakeAccountAuth();
  const files = new FakeAvatarFiles();
  const config = {
    passwordMinLength: min,
    supabaseUrl: 'http://supabase.test',
    signInKey: 'test-key',
  };
  const account = new AccountService(store, auth, files, config);
  const avatar = new AccountAvatarService(store, files, account, new AvatarWriter(files));
  const setup = new AccountSetupService(store, auth, config);
  return { store, auth, files, account, avatar, setup };
}
