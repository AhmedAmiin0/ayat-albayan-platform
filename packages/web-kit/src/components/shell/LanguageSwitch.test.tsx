import { LOCALE_STORAGE_KEY } from '@ab/shared';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '#/lib/i18n/i18n.ts';
import { LanguageSwitch } from './LanguageSwitch';

const session = vi.hoisted(() => ({ current: null as { access_token: string } | null }));
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('#/lib/http/supabase.ts', () => ({
  supabase: { auth: { getSession: async () => ({ data: { session: session.current } }) } },
}));
vi.mock('#/lib/http/api/api.ts', async (orig) => ({ ...(await orig<object>()), apiSend }));

afterEach(() => {
  localStorage.clear();
  vi.unstubAllGlobals();
  apiSend.mockReset();
  session.current = null;
});

const press = () => fireEvent.click(screen.getByRole('button', { name: new RegExp(t.language.label) }));
const stubReload = () => {
  const reload = vi.fn();
  vi.stubGlobal('location', { reload });
  return reload;
};

describe('LanguageSwitch (no saved choice: Arabic UI)', () => {
  it('offers English by its own name, named «اللغة» for assistive tech', () => {
    render(<LanguageSwitch />);
    const button = screen.getByRole('button', { name: `${t.language.label} ${t.language.en}` });
    expect(button.querySelector('[lang="en"]')?.textContent).toBe(t.language.en);
  });

  it('signed out: saves English and reloads, no profile to write', async () => {
    const reload = stubReload();
    render(<LanguageSwitch />);
    press();
    await waitFor(() => expect(reload).toHaveBeenCalledOnce());
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBe('en');
    expect(apiSend).not.toHaveBeenCalled();
  });

  it('signed in: writes the login’s language (PATCH /me/locale), then saves and reloads', async () => {
    session.current = { access_token: 'tok' };
    apiSend.mockResolvedValue({ locale: 'en' });
    const reload = stubReload();
    render(<LanguageSwitch />);
    press();
    await waitFor(() => expect(reload).toHaveBeenCalledOnce());
    expect(apiSend).toHaveBeenCalledWith('PATCH', '/me/locale', { locale: 'en' });
  });

  it('a profile write that failed keeps the language and says so', async () => {
    session.current = { access_token: 'tok' };
    apiSend.mockRejectedValue(new Error('down'));
    const reload = stubReload();
    render(<LanguageSwitch />);
    press();
    expect(await screen.findByText(t.common.error)).toBeTruthy();
    expect(reload).not.toHaveBeenCalled();
    expect(localStorage.getItem(LOCALE_STORAGE_KEY)).toBeNull();
  });
});
