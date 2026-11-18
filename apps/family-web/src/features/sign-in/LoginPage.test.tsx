import { screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { renderAt } from '@/test/render-at';
import { LoginPage } from './LoginPage';

const codesOpen = vi.hoisted(() => vi.fn<() => boolean | undefined>());
vi.mock('@ab/web-kit/auth/login/CodesGate', () => ({ useCodesOpen: codesOpen }));

const L = t.familyLook;

beforeEach(() => {
  vi.spyOn(navigator, 'language', 'get').mockReturnValue('ar');
});

// Boards PortalWebSignIn / PortalPhoneSignIn (docs/51 §1a.1): header, emerald panel, the card.
describe('the family sign-in page', () => {
  it('the signed-out header, the emerald panel and the card «تسجيل الدخول»', async () => {
    codesOpen.mockReturnValue(true);
    renderAt(<LoginPage />);
    const h1 = await screen.findByRole('heading', { level: 1, name: t.auth.loginTitle });
    expect(h1).toBeTruthy();
    expect(screen.getByRole('banner').textContent).toContain(L.brand.name);
    expect(screen.queryByRole('navigation')).toBeNull();
    const panel = screen.getByRole('complementary', { name: L.brand.name });
    expect(within(panel).getByText(L.signIn.welcome)).toBeTruthy();
    const main = screen.getByRole('main');
    expect(within(main).getByText(L.signIn.audience)).toBeTruthy();
    expect(within(main).getByText(t.familyAuth.familyIntro)).toBeTruthy();
    expect(within(main).getByText(L.signIn.or)).toBeTruthy();
    expect(within(main).getByRole('button', { name: t.familyApp.signIn.withPassword }))
      .toBeTruthy();
    expect(screen.getByRole('button', { name: new RegExp(t.language.label) })).toBeTruthy();
  });

  it('waits for the code status: no way in yet, no title', () => {
    codesOpen.mockReturnValue(undefined);
    renderAt(<LoginPage />);
    expect(screen.queryByRole('heading', { level: 1 })).toBeNull();
    expect(screen.queryByLabelText(t.familyAuth.phone)).toBeNull();
  });

  it('codes off: the password card, no «أو», the line why', async () => {
    codesOpen.mockReturnValue(false);
    renderAt(<LoginPage />);
    expect(await screen.findByLabelText(t.familyApp.signIn.studentCode)).toBeTruthy();
    expect(screen.getByRole('heading', { level: 1, name: t.auth.loginTitle })).toBeTruthy();
    expect(screen.getByText(t.familyApp.signIn.whatsappOff)).toBeTruthy();
    expect(screen.queryByText(L.signIn.or)).toBeNull();
  });
});
