import { defaultCountry, nameOf } from '@ab/client-core';
import { fireEvent, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { renderAt } from '@/test/render-at';
import { WhatsAppSignIn } from '@/features/sign-in/WhatsAppSignIn';

const request = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock('@ab/web-kit/auth/login/auth-api', async (orig) => {
  const real = await orig<{ authApi: object }>();
  return { ...real, authApi: { ...real.authApi, familyCodes: { request, verify: vi.fn() } } };
});

const S = t.familyApp.signIn;
const countryButton = (code: string) =>
  screen.findByRole('button', {
    name: S.country.replace('{name}', nameOf(defaultCountry(code), 'ar')),
  });

beforeEach(() => {
  vi.spyOn(navigator, 'language', 'get').mockReturnValue('ar');
});

describe('the WhatsApp number, any country (#752, as the family app)', () => {
  it('starts in Saudi Arabia with «+966» as an LTR island in an LTR field', async () => {
    renderAt(<WhatsAppSignIn />);
    const button = await countryButton('SA');
    expect(button.querySelector('bdi[dir="ltr"]')?.textContent).toBe('+966');
    expect(button.parentElement?.getAttribute('dir')).toBe('ltr');
  });

  it('a whole number pasted picks its country and keeps the national digits', async () => {
    renderAt(<WhatsAppSignIn />);
    const phone = await screen.findByLabelText(t.familyAuth.phone);
    fireEvent.change(phone, { target: { value: '+44 7700 900123' } });
    expect(await countryButton('GB')).toBeTruthy();
    expect(phone).toHaveProperty('value', '7700900123');
    fireEvent.click(screen.getByRole('button', { name: t.familyAuth.sendCode }));
    await vi.waitFor(() => expect(request).toHaveBeenCalledWith('+447700900123'));
  });

  it('«اختر الدولة» finds a country by its Arabic name and picks it', async () => {
    renderAt(<WhatsAppSignIn />);
    fireEvent.click(await countryButton('SA'));
    fireEvent.change(screen.getByLabelText(S.countrySearch), { target: { value: 'باكستان' } });
    expect(screen.getAllByRole('listitem')).toHaveLength(1);
    fireEvent.click(screen.getByRole('button', { name: /باكستان/ }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(await countryButton('PK')).toBeTruthy();
  });

  it('a search that finds nothing says so', async () => {
    renderAt(<WhatsAppSignIn />);
    fireEvent.click(await countryButton('SA'));
    fireEvent.change(screen.getByLabelText(S.countrySearch), { target: { value: 'zzz' } });
    expect(screen.getByText(S.countryNone)).toBeTruthy();
  });
});
