import { defaultCountry, nameOf } from '@ab/client-core';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { locale } from '@ab/web-kit/lib/i18n/locale';
import { CountryButton } from './CountryButton';

describe('CountryButton', () => {
  it('names the country, shows its calling code and opens the picker', () => {
    const country = defaultCountry('EG');
    const onClick = vi.fn();
    render(<CountryButton country={country} onClick={onClick} />);
    const name = t.familyApp.signIn.country.replace('{name}', nameOf(country, locale));
    fireEvent.click(screen.getByRole('button', { name }));
    expect(onClick).toHaveBeenCalledOnce();
    expect(screen.getByText(country.dial)).toBeTruthy();
  });
});
