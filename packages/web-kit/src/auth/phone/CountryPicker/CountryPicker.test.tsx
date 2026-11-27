import { defaultCountry, nameOf } from '@ab/client-core';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { locale } from '@ab/web-kit/lib/i18n/locale';
import { CountryPicker } from './CountryPicker';

const S = t.familyApp.signIn;
const egypt = defaultCountry('EG');
const search = (value: string) =>
  fireEvent.change(screen.getByLabelText(S.countrySearch), { target: { value } });

describe('CountryPicker', () => {
  it('marks the current country and picks the one clicked', () => {
    const onPick = vi.fn();
    render(<CountryPicker current={egypt} onPick={onPick} onClose={vi.fn()} />);
    const row = screen.getByRole('button', { name: new RegExp(nameOf(egypt, locale)) });
    expect(row.getAttribute('aria-current')).toBe('true');
    fireEvent.click(row);
    expect(onPick).toHaveBeenCalledWith(egypt);
  });

  it('the search narrows the list, and no match says so', () => {
    render(<CountryPicker current={egypt} onPick={vi.fn()} onClose={vi.fn()} />);
    search(egypt.dial);
    expect(screen.getByRole('button', { name: new RegExp(nameOf(egypt, locale)) })).toBeTruthy();
    search('zzzz-none');
    expect(screen.getByText(S.countryNone)).toBeTruthy();
  });
});
