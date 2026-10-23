import { renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useLegacySettingsRedirect } from './use-legacy-redirect';

const navigate = vi.hoisted(() => vi.fn());
const router = vi.hoisted(() => ({ current: null as null | { navigate: typeof navigate } }));
vi.mock('@tanstack/react-router', () => ({ useRouter: () => router.current }));

const at = (url: string) => window.history.replaceState(null, '', url);

describe('useLegacySettingsRedirect (old /admin/settings#… links)', () => {
  afterEach(() => {
    navigate.mockReset();
    router.current = null;
    at('/');
  });

  it('the Google OAuth return goes on to the integrations page with its query, replacing the entry', () => {
    router.current = { navigate };
    at('/admin/settings?google=connected#integrations');
    const { result } = renderHook(() => useLegacySettingsRedirect());
    expect(result.current).toBe(true);
    expect(navigate).toHaveBeenCalledWith({ href: '/admin/settings/integrations?google=connected', replace: true });
  });

  it('an old section anchor opens its group of «القيم»', () => {
    router.current = { navigate };
    at('/admin/settings#settings-accounts');
    renderHook(() => useLegacySettingsRedirect());
    expect(navigate).toHaveBeenCalledWith({ href: '/admin/settings/values?group=accounts', replace: true });
  });

  it('no hash or an unknown one: stays on the hub', () => {
    router.current = { navigate };
    at('/admin/settings#nothing-here');
    const { result } = renderHook(() => useLegacySettingsRedirect());
    expect(result.current).toBe(false);
    expect(navigate).not.toHaveBeenCalled();
  });

  it('without a router nothing moves and the hub shows', () => {
    at('/admin/settings#settings-messaging');
    const { result } = renderHook(() => useLegacySettingsRedirect());
    expect(result.current).toBe(false);
  });
});
