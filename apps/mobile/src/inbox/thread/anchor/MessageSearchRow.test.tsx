import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@/core/lib/i18n/i18n';
import { MessageSearchRow } from './MessageSearchRow';
import { takeSearchRequest } from './search-request';

// docs/37 NEW 2: the student's details opened from a chat (`?phone=`) offer «بحث في الرسائل».

const mockParams = jest.fn((): { phone?: string } => ({}));
jest.mock('expo-router', () => ({
  useLocalSearchParams: () => mockParams(),
  router: { back: jest.fn() },
}));

const PHONE = '+966500000123';

beforeEach(() => jest.clearAllMocks());

test('opened from the chat: the row asks that chat to open its search, then goes back', async () => {
  mockParams.mockReturnValue({ phone: PHONE });
  await render(<MessageSearchRow />);
  await fireEvent.press(screen.getByRole('button', { name: t.inbox.chatSearch.fromProfile }));
  expect(router.back).toHaveBeenCalledTimes(1);
  expect(takeSearchRequest(PHONE)).toBe(true);
});

test('opened from elsewhere (no phone, or not a number): no row', async () => {
  mockParams.mockReturnValue({});
  await render(<MessageSearchRow />);
  expect(screen.queryByText(t.inbox.chatSearch.fromProfile)).toBeNull();
  mockParams.mockReturnValue({ phone: 'abc' });
  await render(<MessageSearchRow />);
  expect(screen.queryByText(t.inbox.chatSearch.fromProfile)).toBeNull();
});
