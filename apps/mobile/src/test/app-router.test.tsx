import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { renderApp, resetApp } from './app-router';
import { FakeBackend } from './fake-backend';

function emptyBackend() {
  const empty = { items: [], total: 0, page: 1, pageSize: 25 };
  return new FakeBackend()
    .on('GET /lessons/day', () => [])
    .on('GET /settings', () => ({}))
    .on('GET /threads', () => empty)
    .on('GET /leads', () => empty);
}

beforeEach(resetApp);

test('smoke: the real tabs open on Today; tapping «المحادثات» lands on /inbox with its list', async () => {
  const app = await renderApp({ url: '/', backend: emptyBackend() });
  expect(app.pathname()).toBe('/');
  await fireEvent.press(screen.getByRole('button', { name: t.nav.conversations }));
  expect(app.pathname()).toBe('/inbox');
  expect(await screen.findByText(t.inbox.empty)).toBeTruthy();
  expect(app.backend.sent('GET /threads')).toHaveLength(1);
});

test('the harness records calls and fails loudly on a route nobody faked', async () => {
  const backend = emptyBackend();
  await expect(backend.fetch('/nope?x=1')).rejects.toThrow('unexpected GET /nope?x=1');
  expect(backend.calls.at(-1)).toMatchObject({ method: 'GET', path: '/nope', query: { x: '1' } });
});

test('a signed-out boot lands on /login', async () => {
  const app = await renderApp({ url: '/students', backend: emptyBackend(), gate: 'out' });
  expect(app.pathname()).toBe('/login');
});
