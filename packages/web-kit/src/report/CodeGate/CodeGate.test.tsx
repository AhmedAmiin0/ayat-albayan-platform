import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { PUBLIC_ID } from '@ab/web-kit/report/page.fixture';
import { CodeGate } from './CodeGate';

const fetchMock = vi.fn<(url: string, init?: RequestInit) => Promise<Response>>();
const PUB = `http://api.test/public/report-pages/${PUBLIC_ID}`;
const g = () => t.reportPage.gate;
const json = (status: number, body?: unknown) =>
  Promise.resolve(new Response(body === undefined ? null : JSON.stringify(body), { status }));

const FAMILY = { to: 'family', masked: '••••01' };

function serve(access: unknown, code = 202) {
  const routes: Record<string, () => Promise<Response>> = {
    [`${PUB}/access`]: () => (access === 404 ? json(404) : json(200, access)),
    [`${PUB}/code`]: () => json(code, code === 202 ? undefined : { code: 'codes_unavailable' }),
  };
  fetchMock.mockImplementation((url) => routes[url]?.() ?? json(500));
}

function open() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <CodeGate publicId={PUBLIC_ID} onVerified={vi.fn()} />
    </QueryClientProvider>,
  );
}

const sendTo = () =>
  screen.findByRole('button', { name: g().sendTo.replace('{masked}', '••••01') });

beforeEach(() => vi.stubGlobal('fetch', fetchMock));
afterEach(() => {
  vi.unstubAllGlobals();
  fetchMock.mockReset();
});

describe('CodeGate: the code goes to a masked number on file', () => {
  it('a sent code locks the number buttons and opens the code entry', async () => {
    serve({ available: true, to: [FAMILY] });
    open();
    expect(screen.getByText(g().intro)).toBeTruthy();
    fireEvent.click(await sendTo());
    expect(await screen.findByLabelText(g().code)).toBeTruthy();
    expect(await sendTo()).toHaveProperty('disabled', true);
  });

  it('a refused send says why and keeps the entry closed', async () => {
    serve({ available: true, to: [FAMILY] }, 503);
    open();
    fireEvent.click(await sendTo());
    expect(await screen.findByText(g().unavailable)).toBeTruthy();
    expect(screen.queryByLabelText(g().code)).toBeNull();
  });

  it('codes off for this report: the unavailable notice, no buttons', async () => {
    serve({ available: false, to: [FAMILY] });
    open();
    expect(await screen.findByText(g().unavailable)).toBeTruthy();
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('no number on file: the no-phone notice', async () => {
    serve({ available: true, to: [] });
    open();
    expect(await screen.findByText(g().noPhone)).toBeTruthy();
  });

  it('an unknown report: not found', async () => {
    serve(404);
    open();
    expect(await screen.findByText(t.reportPage.notFound)).toBeTruthy();
  });
});
