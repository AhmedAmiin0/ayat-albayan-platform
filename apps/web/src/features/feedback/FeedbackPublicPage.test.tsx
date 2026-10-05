import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { FeedbackPublicPage } from './FeedbackPublicPage';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

const json = (status: number, body: unknown) => new Response(JSON.stringify(body), { status });
const OK = { teacherName: 'أبرار', kind: 'subscription', contactPhone: '', alreadySubmitted: false };

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
    expect(screen.getByText(t.enums.feedbackKind.subscription)).toBeTruthy();
    expect(screen.getByText(t.app.brand)).toBeTruthy();
    expect(fetchMock.mock.calls[0]?.[0]).toBe('http://api.test/public/feedback/tok');
  });

  it('a wrong link says it is not valid, shows no form, does not retry, and points to the academy’s WhatsApp', async () => {
    fetchMock.mockResolvedValue(json(404, { message: 'not_found' }));
    open('bad');
    expect(await screen.findByText(t.feedback.invalid)).toBeTruthy();
    expect(screen.queryByText(t.feedback.expired)).toBeNull();
    expect(screen.queryByRole('button', { name: t.feedback.submit })).toBeNull();
    // One feedback read (no retry); the page also reads GET /settings/public for the WhatsApp number.
    expect(fetchMock.mock.calls.filter(([url]) => String(url).includes('/public/feedback/'))).toHaveLength(1);
    expect(screen.getByRole('link', { name: t.feedback.openWhatsapp }).getAttribute('href')).toMatch(/^https:\/\/wa\.me\/\d+$/);
  });

  it('an expired link (410) says expired, and also offers the WhatsApp way to a new one', async () => {
    fetchMock.mockResolvedValue(json(410, { code: 'feedback_expired' }));
    open('old');
    expect(await screen.findByText(t.feedback.expired)).toBeTruthy();
    expect(screen.getByText(t.feedback.expiredBody)).toBeTruthy();
    expect(screen.getByRole('link', { name: t.feedback.openWhatsapp })).toBeTruthy();
    expect(screen.queryByText(t.feedback.invalid)).toBeNull();
  });

  it('too many tries (429) is not an expired link: it says wait, and offers a retry', async () => {
    fetchMock.mockResolvedValue(json(429, { message: 'too_many' }));
    open();
    expect(await screen.findByText(t.feedback.tooMany)).toBeTruthy();
    expect(screen.getByRole('button', { name: t.feedback.retry })).toBeTruthy();
    expect(screen.queryByText(t.feedback.expired)).toBeNull();
  });

  it('a 409 on opening means already sent, not expired', async () => {
    fetchMock.mockResolvedValue(json(409, { code: 'already_submitted' }));
    open();
    expect(await screen.findByText(t.feedback.alreadySent)).toBeTruthy();
    expect(screen.queryByText(t.feedback.expired)).toBeNull();
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
