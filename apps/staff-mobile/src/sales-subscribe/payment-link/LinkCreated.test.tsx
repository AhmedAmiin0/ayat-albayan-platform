import { fireEvent, screen } from '@testing-library/react-native';
import { Linking, Platform } from 'react-native';
import { t } from '@ab/mobile-kit';
import { renderWithQuery } from '@/test/query';
import { PHONE } from '@/sales-subscribe/testing/fixtures';
import { paymentLink } from '@/sales-subscribe/testing/link-fixtures';
import { LinkCreated } from './LinkCreated';
import { linkMessage } from './link-text';

jest.mock('./flag', () => ({ STRIPE_FEATURE: true }));
const mockPush = jest.fn();
jest.mock('expo-router', () => ({ router: { push: (h: unknown) => mockPush(h) } }));

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
  // The text sent to the family stays unmarked; only the in-app open is marked as from the app.
  expect(linkMessage(link)).toContain(link.url);
  expect(linkMessage(link)).not.toContain('from=');
});

test('a page the phone cannot open says so, never a crash', async () => {
  openURL.mockRejectedValue(new Error('no browser'));
  await show();
  await fireEvent.press(screen.getByRole('button', { name: t.studentLists.openLink }));
  expect(await screen.findByText(t.common.error)).toBeTruthy();
});

test('«اختر أيام الحلقات» (owner 2026-11-06): the course wizard pushed over the link (its picks kept until paid)', async () => {
  await show();
  await fireEvent.press(screen.getByRole('button', { name: t.courseDraft.pick }));
  expect(mockPush).toHaveBeenCalledWith({ pathname: '/inbox/sales-course', params: { studentId: link.student.id } });
});
