import { screen, within } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { renderAt } from '@/test/render-at';
import { LoginPage } from './LoginPage';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

afterEach(() => {
  apiFetch.mockReset();
});

// Google Play: the privacy policy and the deletion page are reachable before signing in.
it('the sign-in footer links both legal pages', async () => {
  apiFetch.mockResolvedValue({ open: true });
  renderAt(<LoginPage />, '/login');
  const nav = await screen.findByRole('navigation', { name: t.legal.links.nav });
  const hrefs = within(nav).getAllByRole('link').map((a) => a.getAttribute('href'));
  expect(hrefs).toEqual(['/privacy', '/delete-account']);
});
