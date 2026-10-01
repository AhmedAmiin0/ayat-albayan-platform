import { offerText, quote } from '@ab/shared';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { OfferActions } from './OfferActions';

// A server-shaped quote (the shared function the API itself calls), not a client-side price.
const KW = quote({ tier: 'standard', duration: 45, country: 'KW', students: 2, discount: 10 });

afterEach(() => vi.unstubAllGlobals());

describe('OfferActions', () => {
  it('copies the site offer text and says so', async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    vi.stubGlobal('navigator', { clipboard: { writeText } });
    render(<OfferActions quote={KW} />);
    fireEvent.click(screen.getByRole('button', { name: t.pricing.cta }));
    expect(await screen.findByRole('status')).toHaveProperty('textContent', t.pricing.copied);
    expect(writeText).toHaveBeenCalledWith(offerText(KW, t.pricing));
  });

  it('fails gracefully without a clipboard and points to WhatsApp', async () => {
    vi.stubGlobal('navigator', {});
    render(<OfferActions quote={KW} />);
    fireEvent.click(screen.getByRole('button', { name: t.pricing.cta }));
    expect(await screen.findByRole('status')).toHaveProperty('textContent', t.pricing.copyFailed);
  });

  it('opens WhatsApp with the same offer text', () => {
    render(<OfferActions quote={KW} />);
    const link = screen.getByRole('link', { name: t.pricing.sendWhatsapp });
    const text = new URL(link.getAttribute('href') ?? '').searchParams.get('text');
    expect(text).toBe(offerText(KW, t.pricing));
    expect(text).toContain('36 د.ك');
    expect(link.getAttribute('rel')).toContain('noopener');
  });
});
