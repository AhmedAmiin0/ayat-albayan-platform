import { avatarUploadSchema } from '@ab/shared';
import { describe, expect, it } from 'vitest';
import { accountKit, ME, PNG } from './account.fakes';

// R-ACC-05: avatars/<uid>/avatar-<ms>.<ext>; mime and size re-checked from Storage and the bytes.

const PATH = 'user-1/avatar-1700000000000.png';
const codeOf = (p: Promise<unknown>) => p.then(() => 'ok', (e: { response?: { code?: string } }) => e.response?.code);

describe('avatar upload (R-ACC-05)', () => {
  it('signs an upload into the caller’s own folder', async () => {
    const kit = accountKit();
    const signed = await kit.avatar.uploadUrl(ME, { mime: 'image/webp', size: 1000 });
    expect(signed.path).toMatch(/^user-1\/avatar-\d+\.webp$/);
  });

  it('the body schema refuses another type or more than 2 MB', () => {
    expect(avatarUploadSchema.safeParse({ mime: 'image/heic', size: 10 }).success).toBe(false);
    expect(avatarUploadSchema.safeParse({ mime: 'image/png', size: 2 * 1024 * 1024 + 1 }).success).toBe(false);
  });

  it('registers an uploaded PNG, signs its URL and deletes the previous photo', async () => {
    const kit = accountKit();
    await kit.store.update(ME.id, { avatar_path: 'user-1/avatar-1.png' });
    kit.files.objects.set(PATH, { size: 900, contentType: 'image/png', bytes: PNG });
    const view = await kit.avatar.set(ME, PATH);
    expect(view.avatar_url).toBe(`https://storage.test/signed/${PATH}`);
    expect(kit.files.removed).toEqual(['user-1/avatar-1.png']);
  });

  it('refuses a path outside the caller’s folder or not yet uploaded', async () => {
    const kit = accountKit();
    kit.files.objects.set('user-2/avatar-1.png', { size: 900, contentType: 'image/png', bytes: PNG });
    expect(await codeOf(kit.avatar.set(ME, 'user-2/avatar-1.png'))).toBe('avatar_path');
    expect(await codeOf(kit.avatar.set(ME, 'user-1/receipt.png'))).toBe('avatar_path');
    expect(await codeOf(kit.avatar.set(ME, PATH))).toBe('avatar_path');
    expect(kit.store.patches).toEqual([]);
  });

  it('re-checks size and type server-side and deletes a refused object', async () => {
    const kit = accountKit();
    kit.files.objects.set(PATH, { size: 3 * 1024 * 1024, contentType: 'image/png', bytes: PNG });
    expect(await codeOf(kit.avatar.set(ME, PATH))).toBe('avatar_too_large');
    kit.files.objects.set(PATH, { size: 900, contentType: 'application/pdf', bytes: PNG });
    expect(await codeOf(kit.avatar.set(ME, PATH))).toBe('avatar_type');
    kit.files.objects.set(PATH, { size: 900, contentType: 'image/png', bytes: new TextEncoder().encode('%PDF-1.7 hello') });
    expect(await codeOf(kit.avatar.set(ME, PATH))).toBe('avatar_type');
    expect(kit.files.removed).toEqual([PATH, PATH, PATH]);
    expect(kit.store.patches).toEqual([]);
  });

  it('remove clears the path and the object; without a photo it changes nothing', async () => {
    const kit = accountKit();
    expect((await kit.avatar.remove(ME)).avatar_url).toBeNull();
    await kit.store.update(ME.id, { avatar_path: PATH });
    expect((await kit.avatar.remove(ME)).avatar_url).toBeNull();
    expect(kit.files.removed).toEqual([PATH]);
  });
});
