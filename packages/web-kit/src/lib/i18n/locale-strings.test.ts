import ar from '@ab/shared/i18n/ar.json';
import en from '@ab/shared/i18n/en.json';
import { cloneBundle } from '@ab/shared';
import { describe, expect, it, vi } from 'vitest';
import { loadLocaleStrings } from './locale-strings';

// The English texts leave the main bundle (e-lazy-1): they are fetched as their own chunk at boot
// and written into `t` BEFORE boot.tsx pulls in the screens, so what every screen reads is
// unchanged. These tests pin that result against the bundle the app used to ship.

describe('loadLocaleStrings', () => {
  it('Arabic is already bundled, so nothing is loaded', async () => {
    const target = cloneBundle(ar);
    const load = vi.fn(async () => en);
    expect(await loadLocaleStrings(target, 'ar', load)).toBe('ar');
    expect(load).not.toHaveBeenCalled();
    expect(target).toEqual(ar);
  });

  it('writes every English string into the Arabic copy, giving the old `en` bundle', async () => {
    const target = cloneBundle(ar);
    expect(await loadLocaleStrings(target, 'en')).toBe('en');
    expect(target).toEqual(en);
  });

  it('writes a key that holds a dot, like the permission labels', async () => {
    const target = cloneBundle(ar);
    await loadLocaleStrings(target, 'en');
    expect(target.permissions.items['leads.read']).toBe(en.permissions.items['leads.read']);
  });

  it('writes in place, so a section captured before the load reads English', async () => {
    const target = cloneBundle(ar);
    const { nav } = target;
    await loadLocaleStrings(target, 'en');
    expect(nav.inbox).toBe(en.nav.inbox);
  });

  it('a chunk that cannot be fetched keeps the page fully Arabic', async () => {
    const target = cloneBundle(ar);
    const load = vi.fn(async () => {
      throw new Error('offline');
    });
    expect(await loadLocaleStrings(target, 'en', load)).toBe('ar');
    expect(target).toEqual(ar);
  });
});
