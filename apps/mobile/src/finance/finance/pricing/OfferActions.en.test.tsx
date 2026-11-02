import { offerText } from '@ab/shared';
import ar from '@ab/shared/i18n/ar.json';
import en from '@ab/shared/i18n/en.json';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { Linking } from 'react-native';
import { bulkSa } from './fixtures';
import { OfferActions } from './OfferActions';

// The UI in English: the buttons are English, the offer the guardian receives stays Arabic.
jest.mock('@/core/lib/i18n/i18n', () => ({
  ...jest.requireActual<object>('@/core/lib/i18n/i18n'),
  t: jest.requireActual<object>('@ab/shared/i18n/en.json'),
}));

afterEach(() => jest.restoreAllMocks());

test('sends the Arabic offer text from an English UI', async () => {
  const open = jest.spyOn(Linking, 'openURL').mockResolvedValue(true);
  await render(<OfferActions quote={bulkSa} stale={false} />);
  await fireEvent.press(screen.getByRole('button', { name: en.pricing.sendWhatsapp }));
  const text = decodeURIComponent(String(open.mock.calls[0]?.[0]).split('?text=')[1] ?? '');
  expect(text).toBe(offerText(bulkSa, ar.pricing));
  expect(text).toContain(ar.pricing.waIntro);
});
