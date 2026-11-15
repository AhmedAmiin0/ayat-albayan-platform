import { vi, type Mock } from 'vitest';
import { detail, message } from '@/features/messaging/inbox/testing/inbox-fixture';
import { routeFetch } from '@/features/messaging/inbox/testing/test-utils';

// The chat search tests' chat (test-only): a newest page and an older page behind «رسائل أقدم».

export const PATH = '/threads/%2B966501234567';
export const id = (n: number) => `b0000000-0000-4000-8000-00000000000${n}`;
export const NEW = message({ id: id(2), body: 'درس الإسلام اليوم', created_at: '2026-10-02T10:00:00Z' });
export const MID = message({ id: id(3), body: 'شكرًا', created_at: '2026-10-03T10:00:00Z' });
export const OLD = message({ id: id(1), body: 'بداية الاسلام', created_at: '2026-09-01T10:00:00Z' });
const hit = (m: typeof NEW) => ({ id: m.id, created_at: m.created_at, snippet: m.body ?? '' });

/** `found`: the hits, newest first (the API's page). */
export function routeChat(apiFetch: Mock, found: (typeof NEW)[]) {
  routeFetch(apiFetch, [
    [`${PATH}/search?`, { items: found.map(hit), total: found.length, next_cursor: null }],
    [`${PATH}?before=`, detail([OLD])],
    // The window around an older hit (docs/37): one request, the hit and the rows after it.
    [`${PATH}?around=${id(1)}`, detail([OLD, NEW, MID])],
    [PATH, { ...detail([NEW, MID]), has_more: true }],
    ['/messaging/templates', []],
    ['/settings', {}],
  ]);
}

/** jsdom has no layout: scrollIntoView recorded, matchMedia wide. */
export function stubLayout(): Mock {
  const scroll = vi.fn();
  Element.prototype.scrollIntoView = scroll;
  const query = () => ({ matches: false, addEventListener: vi.fn(), removeEventListener: vi.fn() });
  vi.stubGlobal('matchMedia', vi.fn(query));
  return scroll;
}
