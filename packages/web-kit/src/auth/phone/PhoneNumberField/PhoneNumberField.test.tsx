import { checkPhone, defaultCountry, nameOf } from '@ab/client-core';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { locale } from '@ab/web-kit/lib/i18n/locale';
import type { PhoneEntry } from '@ab/web-kit/auth/phone/use-phone-entry';
import { PhoneNumberField } from './PhoneNumberField';

const S = t.familyApp.signIn;
const egypt = defaultCountry('EG');
const saudi = defaultCountry('SA');
const entryOf = (): PhoneEntry => ({
  country: saudi,
  setCountry: vi.fn(),
  typed: '50',
  setTyped: vi.fn(),
  check: checkPhone(saudi, '50'),
});
const countryButton = (c = saudi) =>
  screen.getByRole('button', { name: S.country.replace('{name}', nameOf(c, locale)) });

describe('PhoneNumberField', () => {
  it('types into the entry and shows the default label, hint and error', () => {
    const entry = entryOf();
    render(<PhoneNumberField entry={entry} hint="hint" error="bad" />);
    fireEvent.change(screen.getByLabelText(t.familyAuth.phone), { target: { value: '501' } });
    expect(entry.setTyped).toHaveBeenCalledWith('501');
    expect(screen.getByText('hint')).toBeTruthy();
    expect(screen.getByText('bad')).toBeTruthy();
  });

  it('Enter runs onEnter; other keys do nothing', () => {
    const onEnter = vi.fn();
    render(<PhoneNumberField entry={entryOf()} hint="h" label="رقم" onEnter={onEnter} />);
    const input = screen.getByLabelText('رقم');
    fireEvent.keyDown(input, { key: 'a' });
    expect(onEnter).not.toHaveBeenCalled();
    fireEvent.keyDown(input, { key: 'Enter' });
    expect(onEnter).toHaveBeenCalledOnce();
  });

  it('the country button opens the picker; a pick sets the country and closes it', () => {
    const entry = entryOf();
    render(<PhoneNumberField entry={entry} hint="h" action={<span>go</span>} />);
    expect(screen.getByText('go')).toBeTruthy();
    fireEvent.click(countryButton());
    fireEvent.click(screen.getByRole('button', { name: new RegExp(nameOf(egypt, locale)) }));
    expect(entry.setCountry).toHaveBeenCalledWith(egypt);
    expect(screen.queryByLabelText(S.countrySearch)).toBeNull();
  });
});
