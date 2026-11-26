import { render, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { t } from '@ab/web-kit';
import { SignInLockup } from './SignInLockup';

const S = t.familyApp.signIn;

// The project's logo: the academy emblem, not the old family icon.
it('shows the academy emblem, the wordmark and «آيات البيان»', () => {
  const { container } = render(<SignInLockup />);
  expect(container.querySelector('img[data-mark="large"]')?.getAttribute('src')).toMatch(
    /brand\/mark\.png$/,
  );
  expect(container.querySelector('img[src$="icon-192.png"]')).toBeNull();
  expect(screen.getByRole('heading', { level: 1, name: S.wordmark })).toBeTruthy();
  expect(screen.getByText(S.wordmarkArabic)).toBeTruthy();
});
