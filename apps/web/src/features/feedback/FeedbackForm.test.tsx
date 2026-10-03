import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { FeedbackForm } from './FeedbackForm';
import type { FeedbackFormView } from './types';

const fetchMock = vi.fn();
vi.stubGlobal('fetch', fetchMock);

const FORM: FeedbackFormView = { teacherName: 'أبرار', kind: 'trial', contactPhone: '+201001234567', alreadySubmitted: false };

const reply = (status: number, body: unknown = null) =>
  new Response(body === null ? null : JSON.stringify(body), { status });

function renderForm(onDone = vi.fn()) {
  render(
    <QueryClientProvider client={new QueryClient({ defaultOptions: { mutations: { retry: false } } })}>
      <FeedbackForm token="tok.sig" form={FORM} onDone={onDone} />
    </QueryClientProvider>,
  );
  return onDone;
}

describe('FeedbackForm «رأيك يهمّنا»', () => {
  afterEach(() => fetchMock.mockReset());

  it('has the three Google Form questions in order with their stars, and the prefilled read-only ones', () => {
    renderForm();
    const titles = [
      t.feedback.teacher,
      t.feedback.kind,
      t.feedback.rating,
      t.feedback.recommend,
      t.feedback.note,
      t.feedback.contact,
    ];
    const text = document.body.textContent ?? '';
    const at = titles.map((x) => text.indexOf(x));
    expect(at.every((i) => i >= 0)).toBe(true);
    expect([...at].sort((a, b) => a - b)).toEqual(at);
    expect(screen.getByLabelText(t.feedback.teacher)).toHaveProperty('readOnly', true);
    expect((screen.getByLabelText(t.feedback.teacher) as HTMLInputElement).value).toBe('أبرار');
    // The family can correct the number; the lesson type is the lesson's own, shown as a fixed line.
    expect((screen.getByLabelText(t.feedback.contact) as HTMLInputElement).value).toBe('+201001234567');
    expect(screen.getByLabelText(t.feedback.contact)).toHaveProperty('readOnly', false);
    expect(screen.getByText(t.enums.feedbackKind.trial)).toBeTruthy();
    expect(screen.queryByText(t.enums.feedbackKind.subscription)).toBeNull();
    expect(screen.queryByRole('radio', { name: t.enums.feedbackKind.trial })).toBeNull();
    expect(screen.getAllByRole('radio', { name: /من 5/ })).toHaveLength(5);
    expect(screen.getByText(t.feedback.ratingLow)).toBeTruthy();
    expect(screen.getByText(t.feedback.ratingHigh)).toBeTruthy();
  });

  it('refuses to send without a rating and an answer to the recommendation, naming each', () => {
    renderForm();
    fireEvent.click(screen.getByRole('button', { name: t.feedback.submit }));
    expect(screen.getByText(t.feedback.pickRating)).toBeTruthy();
    expect(screen.getByText(t.feedback.pickRecommend)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('a corrected number goes out as E.164; one that is not a number stops the send', async () => {
    fetchMock.mockResolvedValue(reply(204));
    const onDone = renderForm();
    fireEvent.click(screen.getByRole('radio', { name: t.feedback.rowRating.replace('{n}', '4') }));
    fireEvent.click(screen.getByRole('radio', { name: t.enums.feedbackRecommend.no }));
    fireEvent.change(screen.getByLabelText(t.feedback.contact), { target: { value: 'abc' } });
    fireEvent.click(screen.getByRole('button', { name: t.feedback.submit }));
    expect(screen.getByText(t.feedback.phoneInvalid)).toBeTruthy();
    expect(fetchMock).not.toHaveBeenCalled();
    fireEvent.change(screen.getByLabelText(t.feedback.contact), { target: { value: '0551234567' } });
    fireEvent.click(screen.getByRole('button', { name: t.feedback.submit }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith('sent'));
    const init = fetchMock.mock.calls[0]?.[1] as RequestInit;
    expect(JSON.parse(String(init.body)).contactPhone).toBe('+966551234567');
  });

  it('sends rating, recommend, note and phone only — never the kind or the teacher', async () => {
    fetchMock.mockResolvedValue(reply(204));
    const onDone = renderForm();
    fireEvent.click(screen.getByRole('radio', { name: t.feedback.rowRating.replace('{n}', '5') }));
    fireEvent.click(screen.getByRole('radio', { name: t.enums.feedbackRecommend.yes }));
    fireEvent.change(screen.getByLabelText(t.feedback.note), { target: { value: ' ما شاء الله ' } });
    fireEvent.click(screen.getByRole('button', { name: t.feedback.submit }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith('sent'));
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://api.test/public/feedback/tok.sig');
    expect(init.method).toBe('POST');
    expect(JSON.parse(String(init.body))).toEqual({
      rating: 5,
      recommend: 'yes',
      note: 'ما شاء الله',
      contactPhone: '+201001234567',
    });
    expect(new Headers(init.headers).has('Authorization')).toBe(false);
  });

  it('a second send (409) closes on «already sent»; too many tries (429) stays on the form with a line', async () => {
    fetchMock.mockResolvedValueOnce(reply(429, { message: 'x' })).mockResolvedValueOnce(reply(409, { code: 'already_submitted' }));
    const onDone = renderForm();
    fireEvent.click(screen.getByRole('radio', { name: t.feedback.rowRating.replace('{n}', '3') }));
    fireEvent.click(screen.getByRole('radio', { name: t.enums.feedbackRecommend.maybe }));
    fireEvent.click(screen.getByRole('button', { name: t.feedback.submit }));
    expect(await screen.findByText(t.feedback.tooMany)).toBeTruthy();
    expect(onDone).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: t.feedback.submit }));
    await waitFor(() => expect(onDone).toHaveBeenCalledWith('already'));
  });
});
