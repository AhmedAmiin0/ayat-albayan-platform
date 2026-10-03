import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { FeedbackPublicPage } from './FeedbackPublicPage';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
const OK = { teacherName: 'أبرار', kind: 'subscription', contactPhone: null, alreadySubmitted: false };

function open(token = 'tok') {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <FeedbackPublicPage token={token} />
    </QueryClientProvider>,
  );
}

describe('FeedbackPublicPage (no login)', () => {
  afterEach(() => fetchMock.mockReset());

  it('opens the form for a valid link, with the lesson kind chosen and no session header', async () => {
    fetchMock.mockResolvedValue(json(200, OK));
    open();
    expect(await screen.findByRole('button', { name: t.feedback.submit })).toBeTruthy();
    expect(screen.getByRole('radio', { name: t.enums.feedbackKind.subscription })).toHaveProperty('checked', true);
    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://api.test/public/feedback/tok');
  });

  it('a wrong or expired link says so and shows no form (and does not retry)', async () => {
    fetchMock.mockResolvedValue(json(404, { message: 'not_found' }));
    open('bad');
    expect(await screen.findByText(t.feedback.expired)).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.feedback.submit })).toBeNull();
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('a link already used says the feedback was received', async () => {
    fetchMock.mockResolvedValue(json(200, { ...OK, alreadySubmitted: true }));
    open();
    expect(await screen.findByText(t.feedback.alreadySent)).toBeTruthy();
    expect(screen.queryByRole('button', { name: t.feedback.submit })).toBeNull();
  });

  it('shows the thanks screen after a send', async () => {
    fetchMock.mockImplementation(async (_url: string, init?: RequestInit) => (init?.method === 'POST' ? new Response(null, { status: 204 }) : json(200, OK)));
    open();
    fireEvent.click(await screen.findByRole('radio', { name: t.feedback.rowRating.replace('{n}', '4') }));
    fireEvent.click(screen.getByRole('radio', { name: t.enums.feedbackRecommend.yes }));
    fireEvent.click(screen.getByRole('button', { name: t.feedback.submit }));
    expect(await screen.findByText(t.feedback.thanksTitle)).toBeTruthy();
  });
});
