import { screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@ab/web-kit';
import { renderAt } from '@/test/render-at';
import { LegalFooter } from '@/features/legal/LegalFooter';

describe('the footer under a legal page', () => {
  it('links the other legal page and sign-in, never the page on screen', async () => {
    renderAt(<LegalFooter current="privacy" />);
    const other = await screen.findByRole('link', { name: t.legal.links.deleteAccount });
    expect(other.getAttribute('href')).toBe('/delete-account');
    expect(screen.queryByRole('link', { name: t.legal.links.privacy })).toBeNull();
    expect(screen.getByRole('link', { name: t.legal.links.signIn }).getAttribute('href')).toBe(
      '/login',
    );
  });

  it('on the deletion page: the privacy page instead', async () => {
    renderAt(<LegalFooter current="deleteAccount" />);
    const other = await screen.findByRole('link', { name: t.legal.links.privacy });
    expect(other.getAttribute('href')).toBe('/privacy');
  });
});
