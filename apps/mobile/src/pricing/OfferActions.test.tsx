import { offerText } from '@ab/shared';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Linking, Share } from 'react-native';
import { t } from '@/lib/i18n';
import { bulkSa, starterUsd } from './fixtures';
import { OfferActions } from './OfferActions';

const p = t.pricing;

// jest-expo's Linking.openURL is already a jest.fn: spying on it again keeps earlier calls.
beforeEach(() => jest.clearAllMocks());
afterEach(() => jest.restoreAllMocks());

test('«أرسله على واتساب» opens wa.me with the site’s offer text', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  await render(<OfferActions quote={bulkSa} stale={false} />);
  await fireEvent.press(screen.getByRole('button', { name: p.sendWhatsapp }));
  const url = String(open.mock.calls[0]?.[0]);
  expect(url).toBe(`https://wa.me/?text=${encodeURIComponent(offerText(bulkSa, p))}`);
  const text = decodeURIComponent(url.split('?text=')[1] ?? '');
  expect(text.split('\n')).toEqual([
    `${p.waIntro} ${p.packages.bulk.name} (${p.packages.bulk.sessions} - ${p.durations['45']} ${p.perCircle})`,
    `${p.studentsLabel}: 2`,
    `${p.total}: 770 ${p.currencies.SAR}`,
    `${p.discountLabel}: 10%`,
    `${p.afterDiscount}: 693 ${p.currencies.SAR}`,
    p.trialNote,
  ]);
});

test('«انسخ العرض للعميل» opens the share sheet (it has Copy) with the same text', async () => {
  const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
  await render(<OfferActions quote={starterUsd} stale={false} />);
  await fireEvent.press(screen.getByRole('button', { name: p.cta }));
  expect(share).toHaveBeenCalledWith({ message: offerText(starterUsd, p) });
  expect(offerText(starterUsd, p)).toContain(`32 ${p.currencies.USD}`);
});

test('while the card still shows the previous choice nothing can be sent', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  const share = jest.spyOn(Share, 'share').mockResolvedValue({ action: Share.sharedAction });
  await render(<OfferActions quote={bulkSa} stale />);
  await fireEvent.press(screen.getByRole('button', { name: p.sendWhatsapp }));
  await fireEvent.press(screen.getByRole('button', { name: p.cta }));
  expect(open).not.toHaveBeenCalled();
  expect(share).not.toHaveBeenCalled();
});
