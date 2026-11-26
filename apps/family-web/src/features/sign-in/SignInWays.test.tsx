import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { renderAt } from '@/test/render-at';
import { SignInWays } from './SignInWays';

const request = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock('@ab/web-kit/auth/login/auth-api', async (orig) => {
  const real = await orig<{ authApi: object }>();
  return { ...real, authApi: { ...real.authApi, familyCodes: { request, verify: vi.fn() } } };
});

const S = t.familyApp.signIn;

// A bare «ar» names no region: the number starts in Saudi Arabia (jsdom says en-US, the US).
beforeEach(() => {
  vi.spyOn(navigator, 'language', 'get').mockReturnValue('ar');
});

describe('one sign-in for guardians and students (owner 2026-11-15)', () => {
  it('codes on: WhatsApp first, the student code one tap away and back', async () => {
    renderAt(<SignInWays codes />);
    expect(await screen.findByLabelText(t.familyAuth.phone)).toBeTruthy();
    expect(screen.queryByRole('tab')).toBeNull();
    fireEvent.click(screen.getByRole('button', { name: S.withPassword }));
    expect(await screen.findByLabelText(S.studentCode)).toBeTruthy();
    expect(screen.getByRole('button', { name: t.familyAuth.firstTime })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: S.withWhatsApp }));
    expect(await screen.findByLabelText(t.familyAuth.phone)).toBeTruthy();
  });

  it('a number is checked while typed and a whole one gets its code', async () => {
    renderAt(<SignInWays codes />);
    const phone = await screen.findByLabelText(t.familyAuth.phone);
    fireEvent.change(phone, { target: { value: '400000000' } });
    expect(screen.getByText(S.phoneBad)).toBeTruthy();
    fireEvent.change(phone, { target: { value: '0500000005' } });
    fireEvent.click(screen.getByRole('button', { name: t.familyAuth.sendCode }));
    expect(await screen.findByRole('heading', { name: S.codeTitle })).toBeTruthy();
    expect(request).toHaveBeenCalledWith('+966500000005');
  });

  it('codes off: the password form, no WhatsApp and one line saying why', async () => {
    renderAt(<SignInWays codes={false} />);
    expect(await screen.findByLabelText(S.studentCode)).toBeTruthy();
    expect(screen.getByText(S.whatsappOff)).toBeTruthy();
    expect(screen.queryByLabelText(t.familyAuth.phone)).toBeNull();
    expect(screen.queryByRole('button', { name: S.withWhatsApp })).toBeNull();
    expect(screen.queryByRole('button', { name: t.familyAuth.firstTime })).toBeNull();
  });

  it('a student code that cannot be one says what one looks like', async () => {
    renderAt(<SignInWays codes={false} />);
    fireEvent.change(await screen.findByLabelText(S.studentCode), { target: { value: '1234' } });
    expect(screen.getByText(S.studentCodeBad)).toBeTruthy();
  });
});
