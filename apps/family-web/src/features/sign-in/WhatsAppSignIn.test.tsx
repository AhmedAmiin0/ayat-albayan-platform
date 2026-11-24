import { formatPhone } from '@ab/core';
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { renderAt } from '@/test/render-at';
import { WhatsAppSignIn } from './WhatsAppSignIn';

const request = vi.hoisted(() => vi.fn(async () => undefined));
const signInWithCode = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/auth/login/auth-api', async (orig) => {
  const real = await orig<{ authApi: object }>();
  return { ...real, authApi: { ...real.authApi, familyCodes: { request, verify: vi.fn() } } };
});
vi.mock('@ab/web-kit/auth/sign-in/sign-in', async (orig) => ({ ...(await orig<object>()), signInWithCode }));

const PHONE = '+966500000005';
const box = (n: number) => screen.getByLabelText(t.familyAuth.codeDigit.replace('{n}', String(n)));

beforeEach(() => {
  vi.spyOn(navigator, 'language', 'get').mockReturnValue('ar');
});

// Matches the family app (#741, #752): a refused code empties the boxes and refocuses the first.
it('the code step: the number, the sixth digit signs in, a refused code empties', async () => {
  signInWithCode.mockResolvedValue({ ok: false, error: t.familyAuth.errors.invalid_code });
  renderAt(<WhatsAppSignIn />);
  const phone = await screen.findByLabelText(t.familyAuth.phone);
  fireEvent.change(phone, { target: { value: '0500000005' } });
  fireEvent.click(screen.getByRole('button', { name: t.familyAuth.sendCode }));
  expect(await screen.findByRole('heading', { name: t.familyApp.signIn.codeTitle })).toBeTruthy();
  expect(screen.getByText(formatPhone(PHONE)).getAttribute('dir')).toBe('ltr');
  fireEvent.change(box(1), { target: { value: '123456' } });
  await vi.waitFor(() =>
    expect(signInWithCode).toHaveBeenCalledWith({ phone: PHONE, code: '123456' }, expect.anything()),
  );
  expect(await screen.findByText(t.familyAuth.errors.invalid_code)).toBeTruthy();
  expect(box(1)).toHaveProperty('value', '');
  expect(box(6)).toHaveProperty('value', '');
  expect(document.activeElement).toBe(box(1));
});

it('the code step: resend waits for its countdown, «غيّر الرقم» goes back', async () => {
  renderAt(<WhatsAppSignIn />);
  const phone = await screen.findByLabelText(t.familyAuth.phone);
  fireEvent.change(phone, { target: { value: '0500000005' } });
  fireEvent.click(screen.getByRole('button', { name: t.familyAuth.sendCode }));
  await screen.findByRole('heading', { name: t.familyApp.signIn.codeTitle });
  expect(request).toHaveBeenLastCalledWith(PHONE);
  const counting = t.familyAuth.resendIn.replace('{seconds}', '60');
  const names = screen.getAllByRole('button').map((b) => b.textContent);
  expect(names.slice(-2)).toEqual([counting, t.familyAuth.changePhone]);
  expect(screen.getByRole('button', { name: counting })).toHaveProperty('disabled', true);
  fireEvent.click(screen.getByRole('button', { name: t.familyAuth.changePhone }));
  expect(await screen.findByLabelText(t.familyAuth.phone)).toBeTruthy();
});
