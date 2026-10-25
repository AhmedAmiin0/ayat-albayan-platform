import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { ChatMediaSheet } from './ChatMediaSheet';
import type { ThreadMediaItem } from './contract';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));

const PHONE = '+966552147730';
const base = '/threads/%2B966552147730/media';
const photo: ThreadMediaItem = {
  message_id: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',
  created_at: '2026-10-02T10:00:00.000Z',
  mime: 'image/jpeg',
  caption: null,
  expired: false,
};
const pdf: ThreadMediaItem = { ...photo, message_id: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb', mime: 'application/pdf', caption: 'تحويل بنكي' };
const old: ThreadMediaItem = { ...photo, message_id: 'cccccccc-cccc-4ccc-8ccc-cccccccccccc', created_at: '2026-09-05T10:00:00.000Z', expired: true };

const asked = () => mockApiFetch.mock.calls.map((c: unknown[]) => String(c[0]));

function serve(items: ThreadMediaItem[]) {
  mockApiFetch.mockImplementation((path: string) => {
    if (path === base) return Promise.resolve(items);
    return Promise.resolve({ url: `https://files.test${path}`, mime: 'image/jpeg', expires_at: '2026-10-03T12:00:00.000Z' });
  });
}

beforeEach(() => jest.clearAllMocks());

test('an image asks for its thumbnail as it shows; a PDF is a file tile and asks for nothing', async () => {
  serve([photo, pdf]);
  await renderWithQuery(<ChatMediaSheet phone={PHONE} onPick={jest.fn()} onClose={jest.fn()} />);
  expect(await screen.findByText('تحويل بنكي')).toBeTruthy();
  expect(screen.getByText(t.booking.mobile.pdfFile)).toBeTruthy();
  await waitFor(() => expect(asked()).toContain(`${base}/${photo.message_id}`));
  expect(asked()).not.toContain(`${base}/${pdf.message_id}`);
});

test('picking a card hands over the file with the thumbnail the API signed', async () => {
  serve([photo]);
  const onPick = jest.fn();
  await renderWithQuery(<ChatMediaSheet phone={PHONE} onPick={onPick} onClose={jest.fn()} />);
  const card = await screen.findByRole('button', { name: /أكتوبر/ });
  await waitFor(() => expect(asked()).toContain(`${base}/${photo.message_id}`));
  // The thumbnail's answer lands a tick later; press once it has.
  await waitFor(async () => {
    await fireEvent.press(card);
    expect(onPick.mock.calls.at(-1)?.[1]).toBe(`https://files.test${base}/${photo.message_id}`);
  });
  expect(onPick.mock.calls.at(-1)?.[0]).toEqual(photo);
});

test('a file past WhatsApp’s 30 days is disabled and says to ask again; nothing is fetched for it', async () => {
  serve([old]);
  const onPick = jest.fn();
  await renderWithQuery(<ChatMediaSheet phone={PHONE} onPick={onPick} onClose={jest.fn()} />);
  const card = await screen.findByRole('button', { name: new RegExp(t.booking.invoice.expiredBadge) });
  // the one long sentence sits above the grid, not cut off inside a 104pt card
  expect(screen.getByText(t.booking.invoice.expired)).toBeTruthy();
  expect(card.props.accessibilityState).toMatchObject({ disabled: true });
  await fireEvent.press(card);
  expect(onPick).not.toHaveBeenCalled();
  expect(mockApiFetch.mock.calls.map((c: unknown[]) => String(c[0]))).toEqual([base]);
});

test('nothing in 30 days: the empty line; a failed list can retry; «إلغاء» closes', async () => {
  serve([]);
  const onClose = jest.fn();
  await renderWithQuery(<ChatMediaSheet phone={PHONE} onPick={jest.fn()} onClose={onClose} />);
  expect(await screen.findByText(t.booking.invoice.chatEmpty)).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: t.common.cancel }));
  expect(onClose).toHaveBeenCalledTimes(1);
});

test('a failed list shows the error with a retry (a teacher would get 403 the same way)', async () => {
  mockApiFetch.mockRejectedValue(new Error('403'));
  await renderWithQuery(<ChatMediaSheet phone={PHONE} onPick={jest.fn()} onClose={jest.fn()} />);
  expect(await screen.findByText(t.common.error)).toBeTruthy();
});
