import en from '@ab/shared/i18n/en.json';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { FeedbackForm } from './FeedbackForm';

// The same form in English (LTR): every title and option reads English, no Arabic left.
vi.mock('@/lib/i18n/i18n', async (orig) => ({ ...(await orig<object>()), t: en }));
vi.mock('@/lib/i18n/locale', async (orig) => ({ ...(await orig<object>()), locale: 'en' }));

it('shows the form in English with the scale ends and the options', () => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <FeedbackForm token="t" form={{ teacherName: 'Abrar', kind: 'subscription', contactPhone: '', alreadySubmitted: false }} onDone={vi.fn()} />
    </QueryClientProvider>,
  );
  for (const text of [
    en.feedback.rating,
    en.feedback.ratingLow,
    en.feedback.ratingHigh,
    en.feedback.recommend,
    en.enums.feedbackKind.subscription,
    en.enums.feedbackRecommend.maybe,
  ]) {
    expect(screen.getByText(text)).toBeTruthy();
  }
  expect(screen.getByRole('button', { name: en.feedback.submit })).toBeTruthy();
  expect(document.body.textContent).not.toMatch(/[؀-ۿ]/);
});
