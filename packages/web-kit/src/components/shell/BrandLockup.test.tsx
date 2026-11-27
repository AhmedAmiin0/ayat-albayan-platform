import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { BrandLockup } from './BrandLockup';

const S = t.familyApp.signIn;

describe('BrandLockup', () => {
  it('names the academy in English left to right and in Arabic right to left', () => {
    render(<BrandLockup />);
    const english = screen.getByRole('heading', { name: S.wordmark });
    expect(english.getAttribute('dir')).toBe('ltr');
    expect(screen.getByText(S.wordmarkArabic).getAttribute('dir')).toBe('rtl');
  });

  it('shows what the page puts under the name', () => {
    render(
      <BrandLockup>
        <p>under the name</p>
      </BrandLockup>,
    );
    expect(screen.getByText('under the name').closest('header')).not.toBeNull();
  });
});
