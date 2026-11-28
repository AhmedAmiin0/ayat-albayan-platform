import { PATH_METADATA } from '@nestjs/common/constants';
import { describe, expect, it, vi } from 'vitest';
import type { MeZoneRepo } from '@/common/auth/me-zone.repo';
import { PERMISSION, SIGNED_IN } from '@/common/auth/decorators';
import { accountRoutes } from '@ab/shared';
import { ZodPipe } from '@/common/http/zod-inputs';
import { AccountController } from './account.controller';
import { accountKit } from './account.fakes';
import { ME, PASSWORD } from './account.me.fakes';

// R-ACC-01..05: every signed-in role, always the caller (no id in any path).

const withBody = <B>(body: B) => ({ params: undefined, query: undefined, body });

const localeRepo = () =>
  ({ setLocale: vi.fn().mockResolvedValue(undefined) }) as unknown as MeZoneRepo;

const HANDLERS = [
  'profile',
  'updateProfile',
  'changeEmail',
  'changePassword',
  'avatarUploadUrl',
  'setAvatar',
  'removeAvatar',
  'setup',
  'setLocale',
] as const;

describe('AccountController', () => {
  it('is @SignedIn on /me with no permission: custom roles, students and guardians may use it', () => {
    expect(Reflect.getMetadata(SIGNED_IN, AccountController)).toBe(true);
    expect(Reflect.getMetadata(PERMISSION, AccountController)).toBeUndefined();
    for (const name of HANDLERS) {
      const path: unknown = Reflect.getMetadata(PATH_METADATA, AccountController.prototype[name]);
      expect(String(path)).toMatch(/^\/?me\//);
    }
  });

  it('has no path parameter on any handler: always the caller’s own profile', () => {
    for (const name of HANDLERS) {
      const path: unknown = Reflect.getMetadata(PATH_METADATA, AccountController.prototype[name]);
      expect(String(path)).not.toContain(':');
    }
  });

  it('acts on the token’s user and ignores ids in the body', async () => {
    const kit = accountKit();
    const controller = new AccountController(kit.account, kit.avatar, kit.setup, localeRepo());
    const raw = { id: 'user-2', full_name: 'Huda Ali', role: 'admin' };
    const body = await new ZodPipe(accountRoutes.updateProfile.body).transform(raw);
    expect(body).toEqual({ full_name: 'Huda Ali' });
    const view = await controller.updateProfile(withBody({ full_name: 'Huda Ali' }), ME);
    expect(view).toMatchObject({ id: ME.id, full_name: 'Huda Ali', role: { base: 'teacher' } });
    expect(kit.store.patches).toEqual([{ full_name: 'Huda Ali' }]);
  });

  it('validates bodies before the services run (400 validation_failed)', async () => {
    const kit = accountKit();
    const controller = new AccountController(kit.account, kit.avatar, kit.setup, localeRepo());
    // @RouteInput's pipe runs before the handler, so no service call happens.
    const updateProfile = new ZodPipe(accountRoutes.updateProfile.body);
    const changePassword = new ZodPipe(accountRoutes.password.body);
    await expect(updateProfile.transform({ role: 'admin' })).rejects.toThrow('validation_failed');
    await expect(changePassword.transform({ new_password: 'x' })).rejects.toThrow(
      'validation_failed',
    );
    expect(kit.store.patches).toEqual([]);
    await expect(
      controller.changeEmail(withBody({ email: 'a@b.test', current_password: PASSWORD }), ME),
    ).resolves.toMatchObject({ email: 'a@b.test' });
  });
});
