import { describe, expect, it, vi } from 'vitest';
import type { MeZoneRepo } from '@/common/auth/me-zone.repo';
import { accountRoutes } from '@ab/shared';
import { ZodPipe } from '@/common/http/zod-inputs';
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
    await expect(
      controller.setLocale({ params: undefined, query: undefined, body: { locale: 'en' } }, ME),
    ).resolves.toEqual({
      locale: 'en',
    });
    expect(me.setLocale).toHaveBeenCalledWith(ME.id, 'en');
  });

  it('400 validation_failed for another language or an extra key, before any write', async () => {
    const pipe = (raw: object) => new ZodPipe(accountRoutes.locale.body).transform(raw);
    await expect(pipe({ locale: 'fr' })).rejects.toThrow('validation_failed');
    await expect(pipe({ locale: 'ar', id: 'x' })).rejects.toThrow('validation_failed');
    await expect(pipe({ locale: 'ar' })).resolves.toEqual({ locale: 'ar' });
  });
});
