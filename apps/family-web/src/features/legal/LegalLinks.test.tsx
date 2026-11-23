import { screen, within } from '@testing-library/react';
import { expect, it } from 'vitest';
import { t } from '@ab/web-kit/i18n';
import { renderAt } from '#/test/render-at.tsx';
import { LegalLinks } from './LegalLinks';

it('a named navigation with both legal pages, in order', async () => {
  renderAt(<LegalLinks />);
  const nav = await screen.findByRole('navigation', { name: t.legal.links.nav });
  const links = within(nav).getAllByRole('link');
  expect(links.map((a) => [a.textContent, a.getAttribute('href')])).toEqual([
    [t.legal.links.privacy, '/privacy'],
    [t.legal.links.deleteAccount, '/delete-account'],
  ]);
});
