import { offerText, quote } from '@ab/shared';
import ar from '@ab/shared/i18n/ar.json';
import en from '@ab/shared/i18n/en.json';
import { render, screen } from '@testing-library/react';
import { expect, it, vi } from 'vitest';
import { OfferActions } from './OfferActions';

// The UI in English: the buttons are English, the offer the guardian receives stays Arabic.
vi.mock('@/lib/i18n/i18n', async (orig) => ({ ...(await orig<object>()), t: en }));

it('sends the Arabic offer text from an English UI', () => {
  const KW = quote({ tier: 'standard', duration: 45, country: 'KW', students: 2, discount: 10 });
  render(<OfferActions quote={KW} stale={false} />);
  const link = screen.getByRole('link', { name: en.pricing.sendWhatsapp });
  const text = new URL(link.getAttribute('href') ?? '').searchParams.get('text');
  expect(text).toBe(offerText(KW, ar.pricing));
  expect(text).toContain(ar.pricing.waIntro);
});
