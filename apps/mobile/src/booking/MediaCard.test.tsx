import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import type { ThreadMediaItem } from './contract';
import { MediaCard } from './MediaCard';

const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));

const PHONE = '+966552147730';
const photo: ThreadMediaItem = {
  message_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  created_at: '2026-10-02T10:00:00.000Z',
  mime: 'image/jpeg',
  caption: null,
  expired: false,
};
const signed = { url: 'https://files.test/a.jpg', mime: 'image/jpeg', expires_at: '2026-10-03T12:00:00.000Z' };

beforeEach(() => jest.clearAllMocks());

test('while the thumbnail loads the tile shows a spinner, not an empty box', async () => {
  mockApiFetch.mockReturnValue(new Promise(() => undefined));
  await renderWithQuery(<MediaCard phone={PHONE} item={photo} onPick={jest.fn()} />);
  expect(screen.getByLabelText(t.common.loading)).toBeTruthy();
});

test('a failed thumbnail says so, and a tap asks again instead of picking a blank card', async () => {
  mockApiFetch.mockRejectedValueOnce(new Error('502')).mockResolvedValue(signed);
  const onPick = jest.fn();
  await renderWithQuery(<MediaCard phone={PHONE} item={photo} onPick={onPick} />);
  expect(await screen.findByText(t.booking.invoice.thumbRetry)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button'));
  expect(onPick).not.toHaveBeenCalled();
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledTimes(2));
  await waitFor(() => expect(screen.queryByText(t.booking.invoice.thumbRetry)).toBeNull());
});

test('an expired card keeps full contrast: the short badge, no 50% opacity, no long sentence in the tile', async () => {
  await renderWithQuery(<MediaCard phone={PHONE} item={{ ...photo, expired: true }} onPick={jest.fn()} />);
  expect(screen.getByText(t.booking.invoice.expiredBadge)).toBeTruthy();
  expect(screen.queryByText(t.booking.invoice.expired)).toBeNull();
  expect(JSON.stringify(screen.getByRole('button').props.style)).not.toContain('"opacity"');
  expect(mockApiFetch).not.toHaveBeenCalled();
});

test('a PDF is a file tile with its icon and name, asking for nothing', async () => {
  await renderWithQuery(<MediaCard phone={PHONE} item={{ ...photo, mime: 'application/pdf', caption: 'تحويل.pdf' }} onPick={jest.fn()} />);
  expect(screen.getByText(t.booking.mobile.pdfFile)).toBeTruthy();
  expect(screen.getByText('تحويل.pdf')).toBeTruthy();
  expect(mockApiFetch).not.toHaveBeenCalled();
});
