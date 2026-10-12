import { PATH_METADATA } from '@nestjs/common/constants';
import { describe, expect, it } from 'vitest';
import { PERMISSION, SIGNED_IN } from '../../common/auth/decorators';
import { AccountController } from './account.controller';
import { accountKit, ME, PASSWORD } from './account.fakes';

// R-ACC-01..05: every signed-in role, always the caller (no id in any path).

const HANDLERS = ['profile', 'updateProfile', 'changeEmail', 'changePassword', 'avatarUploadUrl', 'setAvatar', 'removeAvatar'] as const;

describe('AccountController', () => {
  it('is @SignedIn on /me with no permission: custom roles, students and guardians may use it', () => {
    expect(Reflect.getMetadata(SIGNED_IN, AccountController)).toBe(true);
    expect(Reflect.getMetadata(PERMISSION, AccountController)).toBeUndefined();
    expect(Reflect.getMetadata(PATH_METADATA, AccountController)).toBe('me');
  });

  it('has no path parameter on any handler: always the caller’s own profile', () => {
    for (const name of HANDLERS) {
      const path: unknown = Reflect.getMetadata(PATH_METADATA, AccountController.prototype[name]);
      expect(String(path)).not.toContain(':');
    }
  });

  it('acts on the token’s user and ignores ids in the body', async () => {
    const kit = accountKit();
    const controller = new AccountController(kit.account, kit.avatar);
    const view = await controller.updateProfile({ id: 'user-2', full_name: 'Huda Ali', role: 'admin' }, ME);
    expect(view).toMatchObject({ id: 'user-1', full_name: 'Huda Ali', role: { base: 'teacher' } });
    expect(kit.store.patches).toEqual([{ full_name: 'Huda Ali' }]);
  });

  it('validates bodies before the services run (400 validation_failed)', async () => {
    const kit = accountKit();
    const controller = new AccountController(kit.account, kit.avatar);
    // parseOrThrow throws synchronously, before any service call.
    expect(() => controller.updateProfile({ role: 'admin' }, ME)).toThrow('validation_failed');
    expect(() => controller.changePassword({ new_password: 'x' }, ME)).toThrow('validation_failed');
    expect(kit.store.patches).toEqual([]);
    await expect(controller.changeEmail({ email: 'a@b.test', current_password: PASSWORD }, ME)).resolves.toMatchObject({ email: 'a@b.test' });
  });
});
