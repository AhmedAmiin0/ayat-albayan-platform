import { fireEvent, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { renderAt } from '@/test/render-at';
import { StudentSignIn } from './StudentSignIn';

const signIn = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/auth/sign-in', async (orig) => ({ ...(await orig<object>()), signIn }));

const S = t.familyApp.signIn;

// Board PortalWebSignInPassword: the card's title, the code and the password, the gold «دخول»,
// then «أول دخول؟» / «نسيت كلمة السر؟»; a refused sign-in says why in the inline alert.
it('the password card: title, links, and a refused sign-in in the inline alert', async () => {
  signIn.mockResolvedValue({ ok: false, error: t.common.error });
  renderAt(<StudentSignIn codes />);
  expect(await screen.findByRole('heading', { level: 1, name: t.auth.loginTitle })).toBeTruthy();
  expect(screen.getByText(t.familyLook.signIn.audience)).toBeTruthy();
  const submit = screen.getByRole('button', { name: t.auth.submit });
  expect(submit).toHaveProperty('disabled', true);
  fireEvent.change(screen.getByLabelText(S.studentCode), { target: { value: 'AB-2041' } });
  fireEvent.change(screen.getByLabelText(t.auth.password), { target: { value: 'secret-pass' } });
  expect(submit).toHaveProperty('disabled', false);
  fireEvent.click(submit);
  await vi.waitFor(() =>
    expect(signIn).toHaveBeenCalledWith({ email: 'AB-2041', password: 'secret-pass' }, expect.anything()),
  );
  expect((await screen.findByRole('alert')).textContent).toBe(t.common.error);
});

it('«أول دخول؟» opens the first-password flow under the same card title', async () => {
  renderAt(<StudentSignIn codes />);
  fireEvent.click(await screen.findByRole('button', { name: t.familyAuth.firstTime }));
  expect(screen.getByRole('heading', { level: 1, name: t.auth.loginTitle })).toBeTruthy();
  expect(screen.getByRole('heading', { level: 2, name: t.familyAuth.firstTime })).toBeTruthy();
  expect(screen.queryByLabelText(S.studentCode)).toBeNull();
});
