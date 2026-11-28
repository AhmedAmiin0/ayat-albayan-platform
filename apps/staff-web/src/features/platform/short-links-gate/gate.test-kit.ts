import type { ShortLinkGateView } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createElement } from 'react';
import { vi } from 'vitest';
import { type Me, meQuery } from '@ab/web-kit';
import { GatePage } from './GatePage';

// Tests only: the gate /l/<code> on a fresh query client, the API answered by `fetch` routes
// («METHOD /path» → a Response; anything else 404), the session put in the meQuery cache.

export const CODE = 'Ab12Cd34';
export const TITLE = 'اللقاء التعريفي لأولياء الأمور';
export const TARGET = 'https://example.com/meet';
export const PHONE = '+966500000004';
export const GATE = `/public/short-links/${CODE}`;

export const OPEN_VIEW: ShortLinkGateView = {
  title: TITLE,
  state: 'open',
  goneReason: null,
  needs: 'sign_in_or_code',
  codesAvailable: true,
};

export const GUARDIAN: Me = {
  id: 'g-1',
  email: 'g@example.com',
  role: 'guardian',
  permissions: [],
};

export const json = (status: number, body: unknown): Response =>
  new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });

const PROFILE = {
  id: '0b6f3c2a-5d1e-4f7a-9c8b-2e4d6a8f0c13',
  full_name: 'أحمد علي',
  email: null,
  phone_e164: null,
  avatar_url: null,
  role: { base: 'guardian', key: null, name_ar: null, name_en: null },
};

export type Routes = Record<string, () => Response>;

/** Every call the page made, as «METHOD /path» with its JSON body as sent. */
export interface Call {
  route: string;
  body: BodyInit | null | undefined;
}

/** `fetch` answers `routes` (plus GET /me/profile); returns the calls made. */
export function stubApi(routes: Routes): Call[] {
  const calls: Call[] = [];
  const all: Routes = { 'GET /me/profile': () => json(200, PROFILE), ...routes };
  vi.stubGlobal('fetch', (url: string, init?: RequestInit) => {
    const route = `${init?.method ?? 'GET'} ${new URL(url).pathname}`;
    calls.push({ route, body: init?.body });
    const answer = all[route];
    return Promise.resolve(answer ? answer() : json(404, { code: 'short_link_not_found' }));
  });
  return calls;
}

/** The gate for `me` (null = signed out); `go` stands in for the full load to the target. */
export function showGate(me: Me | null = null) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  client.setQueryData(meQuery.queryKey, me);
  const go = vi.fn<(url: string) => void>();
  const page = createElement(GatePage, { code: CODE, go });
  render(createElement(QueryClientProvider, { client }, page));
  return { client, go };
}
