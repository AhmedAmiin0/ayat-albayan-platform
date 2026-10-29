import { fireEvent, screen } from '@testing-library/react-native';
import { Linking, Platform } from 'react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { PHONE } from '../testing/fixtures';
import { paymentLink } from '../testing/link-fixtures';
import { LinkCreated } from './LinkCreated';
import { linkMessage } from './link-text';

jest.mock('./flag', () => ({ STRIPE_FEATURE: true }));

const link = paymentLink({ url: `https://api.example.test/pay/${'k'.repeat(32)}` });
const openURL = jest.spyOn(Linking, 'openURL');
const show = () => renderWithQuery(<LinkCreated link={link} phone={PHONE} onSent={jest.fn()} />);

beforeEach(() => {
  jest.clearAllMocks();
  openURL.mockReset().mockResolvedValue(true);
});

test('«افتح الرابط» opens the page marked as from the app (?from=<platform>), so Stripe brings her back here', async () => {
  await show();
  await fireEvent.press(screen.getByRole('button', { name: t.studentLists.openLink }));
  expect(openURL).toHaveBeenCalledWith(`${link.url}?from=${Platform.OS}`);
  // What «إرسال في المحادثة» / «نسخ» give the family stays unmarked (PaymentLinkScreen.test: the box gets it).
  expect(linkMessage(link)).toContain(link.url);
  expect(linkMessage(link)).not.toContain('from=');
});

test('a page the phone cannot open says so, never a crash', async () => {
  openURL.mockRejectedValue(new Error('no browser'));
  await show();
  await fireEvent.press(screen.getByRole('button', { name: t.studentLists.openLink }));
  expect(await screen.findByText(t.common.error)).toBeTruthy();
});
