// Calendar v3: the calendar list and one calendar's events.
import { nextId, notFound, readJson, type Route, type StubEvent, type StubState } from './state.ts';

const cal = (s: StubState, id: string) => {
  const name = decodeURIComponent(id);
  if (!s.calendars.has(name)) return null;
  const events = s.events.get(name) ?? new Map<string, StubEvent>();
  s.events.set(name, events);
  return events;
};

export const calendarRoutes: Route[] = [
  ['GET', /^\/calendar\/v3\/users\/me\/calendarList$/, async (_r, { s }) => [200, { items: [...s.calendars].map(([id, summary]) => ({ id, summary })) }]],
  ['POST', /^\/calendar\/v3\/calendars\/([^/]+)\/events$/, async (req, { m, s }) => {
    const events = cal(s, m[1] ?? '');
    if (!events) return notFound();
    const body = await readJson<Omit<StubEvent, 'id' | 'status'>>(req);
    const id = nextId(s, 'stubev');
    events.set(id, { ...body, id, status: 'confirmed' });
    return [200, events.get(id)];
  }],
  ['GET', /^\/calendar\/v3\/calendars\/([^/]+)\/events\/([^/]+)$/, async (_r, { m, s }) => {
    const ev = cal(s, m[1] ?? '')?.get(decodeURIComponent(m[2] ?? ''));
    return ev ? [200, ev] : notFound();
  }],
  ['PUT', /^\/calendar\/v3\/calendars\/([^/]+)\/events\/([^/]+)$/, async (req, { m, s }) => {
    const events = cal(s, m[1] ?? '');
    const id = decodeURIComponent(m[2] ?? '');
    if (!events?.has(id)) return notFound();
    events.set(id, { ...(await readJson<Omit<StubEvent, 'id' | 'status'>>(req)), id, status: 'confirmed' });
    return [200, events.get(id)];
  }],
  ['DELETE', /^\/calendar\/v3\/calendars\/([^/]+)\/events\/([^/]+)$/, async (_r, { m, s }) => {
    const events = cal(s, m[1] ?? '');
    if (!events?.delete(decodeURIComponent(m[2] ?? ''))) return [410, { error: { code: 410, errors: [{ reason: 'deleted' }] } }];
    return [204, null];
  }],
];
