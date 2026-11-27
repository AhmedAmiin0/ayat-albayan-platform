import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { PhoneSignIn } from './PhoneSignIn';

const signInWithCode = vi.hoisted(() => vi.fn());
const land = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/auth/sign-in', () => ({ signInWithCode }));
vi.mock('@ab/web-kit/auth/use-return-to', () => ({ useLandAfterSignIn: () => land }));
vi.mock('@ab/web-kit/lib/http/api/api', () => ({ apiFetch: vi.fn(), apiSend: vi.fn() }));

const F = t.familyAuth;
const codes = { request: vi.fn(() => Promise.resolve()), verify: vi.fn() };
const click = (name: string) => fireEvent.click(screen.getByRole('button', { name }));
const paste = (digits: string) =>
  fireEvent.paste(screen.getByLabelText(F.codeDigit.replace('{n}', '1')), {
    clipboardData: { getData: () => digits },
  });

function toCodeStep(unavailable?: string) {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PhoneSignIn codes={codes} {...(unavailable && { unavailable })}>
        <p>links</p>
      </PhoneSignIn>
    </QueryClientProvider>,
  );
  fireEvent.change(screen.getByLabelText(F.phone), { target: { value: '+201001234567' } });
  click(F.sendCode);
}

describe('PhoneSignIn (docs/30 §1)', () => {
  beforeEach(() => {
    signInWithCode.mockReset();
    land.mockReset().mockResolvedValue(undefined);
  });

  it('a bad number says so without sending', async () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <PhoneSignIn codes={codes} />
      </QueryClientProvider>,
    );
    fireEvent.change(screen.getByLabelText(F.phone), { target: { value: '12' } });
    click(F.sendCode);
    expect(await screen.findByText(F.errors.invalid_phone)).toBeTruthy();
    expect(codes.request).not.toHaveBeenCalled();
  });

  it('number → code → the home, and back to the number', async () => {
    signInWithCode.mockResolvedValue({ ok: true, home: '/family' });
    toCodeStep();
    await screen.findByRole('button', { name: F.verify });
    expect(codes.request).toHaveBeenCalledWith('+201001234567');
    click(F.verify);
    expect(await screen.findByText(F.errors.code_incomplete)).toBeTruthy();
    paste('123456');
    click(F.verify);
    await waitFor(() => expect(land).toHaveBeenCalledWith('/family'));
    expect(signInWithCode.mock.calls[0]?.[0]).toEqual({ phone: '+201001234567', code: '123456' });
    click(F.changePhone);
    expect(screen.getByText('links')).toBeTruthy();
  });

  it('«codes unavailable» takes the tab’s own words; other errors stay', async () => {
    signInWithCode.mockResolvedValueOnce({ ok: false, error: F.errors.codes_unavailable });
    toCodeStep('teacher words');
    await screen.findByRole('button', { name: F.verify });
    paste('123456');
    click(F.verify);
    expect(await screen.findByText('teacher words')).toBeTruthy();
    signInWithCode.mockResolvedValueOnce({ ok: false, error: 'wrong code' });
    click(F.verify);
    expect(await screen.findByText('wrong code')).toBeTruthy();
  });

  it('without its own words the family error shows', async () => {
    signInWithCode.mockResolvedValueOnce({ ok: false, error: F.errors.codes_unavailable });
    toCodeStep();
    await screen.findByRole('button', { name: F.verify });
    paste('123456');
    click(F.verify);
    expect(await screen.findByText(F.errors.codes_unavailable)).toBeTruthy();
  });
});
