import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { createMemoryHistory, createRouter, RouterProvider } from '@tanstack/react-router';
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { type Me, meQuery, t } from '@ab/web-kit';
import { routeTree } from './routeTree.gen';

// The family-host move (docs/51 §3, VITE_FAMILY_ORIGIN) signs a family out of this host and
// sends it away: only /portal and /account may make it. The short-link gate /l/<code> is for
// guardians and students too, and must open here whoever is signed in (docs/19 «Gate flow»).

const FAMILY = vi.hoisted(() => 'https://family.example.test');
const signOut = vi.hoisted(() => vi.fn(async () => undefined));
vi.mock('@ab/web-kit/lib/http/env/env', async (orig) => {
  const real = await orig<{ env: object }>();
  return { ...real, env: { ...real.env, familyOrigin: FAMILY } };
});
vi.mock('@ab/web-kit/auth/sign-in/sign-in', async (orig) => ({ ...(await orig<object>()), signOut }));

const routes = import.meta.glob<string>(['./routes/**/*.tsx'], {
  query: '?raw', import: 'default', eager: true,
});
const GUARDIAN: Me = { id: 'g-1', email: 'g@example.com', role: 'guardian', permissions: [] };
const CODE = 'Ab12Cd34';
const view = {
  title: 'رابط', state: 'open', goneReason: null, needs: 'sign_in_or_code', codesAvailable: true,
};

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

describe('the family-host move never catches /l/<code>', () => {
  it('only /portal and /account call leaveForFamilyHost', () => {
    const movers = Object.entries(routes)
      .filter(([, source]) => source.includes('leaveForFamilyHost('))
      .map(([path]) => path);
    expect(movers.sort()).toEqual(['./routes/account.tsx', './routes/portal.tsx']);
  });

  it('a signed-in guardian on /l/<code> with the family host live gets the gate', async () => {
    const replace = vi.fn();
    vi.stubGlobal('location', { origin: 'https://app.example.test', replace });
    vi.stubGlobal('matchMedia', () => ({ matches: false }));
    vi.stubGlobal('fetch', (url: string) =>
      Promise.resolve(
        new URL(url).pathname === `/public/short-links/${CODE}`
          ? new Response(JSON.stringify(view), { status: 200 })
          : new Response('{}', { status: 404 }),
      ),
    );
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    queryClient.setQueryData(meQuery.queryKey, GUARDIAN);
    const history = createMemoryHistory({ initialEntries: [`/l/${CODE}`] });
    const router = createRouter({ routeTree, history, context: { queryClient } });
    render(
      <QueryClientProvider client={queryClient}>
        <RouterProvider router={router} />
      </QueryClientProvider>,
    );
    const name = new RegExp(t.shortLinks.gate.continueAs);
    expect(await screen.findByRole('button', { name }, { timeout: 5000 })).toBeTruthy();
    expect(replace).not.toHaveBeenCalled();
    expect(signOut).not.toHaveBeenCalled();
  });
});
