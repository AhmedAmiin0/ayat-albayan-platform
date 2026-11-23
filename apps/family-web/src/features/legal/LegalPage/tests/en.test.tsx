import en from '@ab/shared/i18n/en.json';
import { screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { renderAt } from '#/test/render-at.tsx';
import { LegalPage } from '#/features/legal/LegalPage/LegalPage.tsx';

vi.mock('@ab/web-kit/i18n', async (orig) => ({ ...(await orig<object>()), t: en, locale: 'en' }));
vi.mock('@ab/web-kit/http', async (orig) => ({
  ...(await orig<object>()),
  apiFetch: () => Promise.resolve({ academy_contact: { email: 'help@example.org' } }),
}));

it.each(['privacy', 'deleteAccount'] as const)('%s reads English, no Arabic letters', async (p) => {
  renderAt(<LegalPage page={p} />, '/');
  const title = p === 'privacy' ? en.legal.privacy.title : en.legal.deletion.title;
  expect(await screen.findByRole('heading', { level: 1, name: title })).toBeTruthy();
  expect(await screen.findByRole('link', { name: 'help@example.org' })).toBeTruthy();
  // The page itself; the footer's language switch names Arabic in Arabic on purpose.
  expect(screen.getByRole('main').textContent).not.toMatch(/[\u0600-\u06FF]/);
  expect(screen.getByRole('contentinfo').textContent).toContain(en.legal.links.signIn);
});
