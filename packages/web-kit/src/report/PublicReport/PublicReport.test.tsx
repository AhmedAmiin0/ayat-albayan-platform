import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { pageView, PUBLIC_ID } from '@ab/web-kit/report/page.fixture';
import { PublicReport } from './PublicReport';

const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();
const PUB = `http://api.test/public/report-pages/${PUBLIC_ID}`;
const json = (status: number, body?: unknown) =>
  Promise.resolve(new Response(body === undefined ? null : JSON.stringify(body), { status }));

function serve(page: () => Promise<Response>) {
  const routes: Record<string, () => Promise<Response>> = {
    [PUB]: page,
    [`${PUB}/access`]: () => json(200, { available: true, to: [] }),
  };
  fetchMock.mockImplementation((url) => routes[url]?.() ?? json(500));
}

function open() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <PublicReport publicId={PUBLIC_ID} />
    </QueryClientProvider>,
  );
}

beforeEach(() => vi.stubGlobal('fetch', fetchMock));
afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe('PublicReport: the page for a reader without a session', () => {
  it("this report's cookie opens the saved report", async () => {
    serve(() => json(200, pageView()));
    open();
    expect(await screen.findByText('أداء ممتاز')).toBeTruthy();
    expect(screen.queryByText(t.reportPage.gate.intro)).toBeNull();
  });

  it('without the cookie (401 code_required): the WhatsApp code gate', async () => {
    serve(() => json(401, { code: 'code_required' }));
    open();
    expect(await screen.findByText(t.reportPage.gate.intro)).toBeTruthy();
    expect(screen.queryByText(t.reportPage.notFound)).toBeNull();
  });

  it('an unknown report: not found, no gate', async () => {
    serve(() => json(404, { code: 'not_found' }));
    open();
    expect(await screen.findByText(t.reportPage.notFound)).toBeTruthy();
    expect(screen.queryByText(t.reportPage.gate.intro)).toBeNull();
  });
});
