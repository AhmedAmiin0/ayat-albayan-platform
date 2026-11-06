import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { pageView, PUBLIC_ID } from './page.fixture';
import { ReportPage } from './ReportPage';

// The WhatsApp code for a viewer who is not one of the report's signed-in readers.
const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();
const json = (status: number, body?: unknown) =>
  Promise.resolve(new Response(body === undefined ? null : JSON.stringify(body), { status }));
const API = 'http://api.test';
const PUB = `${API}/public/report-pages/${PUBLIC_ID}`;
const g = () => t.reportPage.gate;

type Answer = (init: RequestInit | undefined) => Promise<Response>;

function serve(opts: { verify: number }) {
  let verified = false;
  const code = opts.verify === 429 ? 'too_many_requests' : 'invalid_code';
  const routes: Record<string, Answer> = {
    [`${API}/report-pages/${PUBLIC_ID}`]: () => json(401, { code: 'unauthorized' }),
    [`${PUB}/access`]: () =>
      json(200, { available: true, to: [{ to: 'family', masked: '••••01' }] }),
    [`${PUB}/code`]: () => json(202),
    [`${PUB}/verify`]: () => {
      verified = opts.verify === 204;
      return verified ? json(204) : json(opts.verify, { code });
    },
    [PUB]: (init) => {
      expect(init?.credentials).toBe('include');
      return verified ? json(200, pageView()) : json(401, { code: 'code_required' });
    },
  };
  fetchMock.mockImplementation((url, init) => routes[url]?.(init) ?? json(500));
}

function open() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <ReportPage publicId={PUBLIC_ID} />
    </QueryClientProvider>,
  );
}

beforeEach(() => vi.stubGlobal('fetch', fetchMock));
afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

async function askAndEnter(code: string) {
  fireEvent.click(
    await screen.findByRole('button', { name: g().sendTo.replace('{masked}', '••••01') }),
  );
  fireEvent.change(await screen.findByLabelText(g().code), { target: { value: code } });
  fireEvent.click(screen.getByRole('button', { name: g().verify }));
}

describe('ReportPage — the WhatsApp code', () => {
  it("a masked number only, the code, then the saved report with the report's cookie", async () => {
    serve({ verify: 204 });
    open();
    expect(await screen.findByText(g().intro)).toBeTruthy();
    expect(screen.queryByText(/\+1555/)).toBeNull();
    await askAndEnter('123456');
    expect(await screen.findByText('أداء ممتاز')).toBeTruthy();
    const sent = fetchMock.mock.calls.find(([url]) => url === `${PUB}/code`);
    expect(sent?.[1]?.body).toBe(JSON.stringify({ to: 'family' }));
  });

  it('a wrong or expired code says so; the report stays closed', async () => {
    serve({ verify: 401 });
    open();
    await askAndEnter('000000');
    expect(await screen.findByText(g().invalid)).toBeTruthy();
    expect(screen.queryByText('أداء ممتاز')).toBeNull();
  });

  it('too many tries (429) says so', async () => {
    serve({ verify: 429 });
    open();
    await askAndEnter('123456');
    expect(await screen.findByText(g().tooMany)).toBeTruthy();
  });
});
