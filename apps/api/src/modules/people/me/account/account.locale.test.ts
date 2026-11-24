import { describe, expect, it, vi } from 'vitest';
import type { MeZoneRepo } from '@/common/auth/me-zone.repo';
import { bodyPipeOf } from '@/common/http/zod-inputs.test-util';
import { AccountController } from './account.controller';
import { accountKit, ME } from './account.fakes';

const setup = () => {
  const kit = accountKit();
  const me = { setLocale: vi.fn().mockResolvedValue(undefined) };
  const controller = new AccountController(
    kit.account,
    kit.avatar,
    kit.setup,
    me as unknown as MeZoneRepo,
  );
  return { controller, me };
};

describe('PATCH /me/locale', () => {
  it('writes the caller’s own language and answers it', async () => {
    const { controller, me } = setup();
    await expect(controller.setLocale({ locale: 'en' }, ME)).resolves.toEqual({ locale: 'en' });
    expect(me.setLocale).toHaveBeenCalledWith(ME.id, 'en');
  });

  it('400 validation_failed for another language or an extra key, before any write', async () => {
    const pipe = bodyPipeOf(AccountController, 'setLocale');
    await expect(pipe({ locale: 'fr' })).rejects.toThrow('validation_failed');
    await expect(pipe({ locale: 'ar', id: 'user-2' })).rejects.toThrow('validation_failed');
    await expect(pipe({ locale: 'ar' })).resolves.toEqual({ locale: 'ar' });
  });
});
