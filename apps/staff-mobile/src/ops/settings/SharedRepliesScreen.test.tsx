import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { PRICES, REPLIES, WELCOME } from '@/inbox/saved-replies/testing/fixtures';
import { renderWithQuery } from '@/test/query';
import { SharedRepliesScreen } from './SharedRepliesScreen';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn() },
}));

const name = (s: string, title: string) => s.replace('{title}', title);

beforeEach(() => {
  jest.clearAllMocks();
  mockApi.onRead(() => REPLIES);
  mockApi.onWrite(() => REPLIES);
});

test('lists the shared replies only, with up/down (none past the ends) and delete', async () => {
  await renderWithQuery(<SharedRepliesScreen />);
  expect(await screen.findByRole('button', { name: /^الأسعار/ })).toBeTruthy();
  expect(screen.queryByRole('button', { name: 'متابعة' })).toBeNull();
  expect(
    screen.getByRole('button', { name: name(t.savedReplies.moveUp, PRICES.title) }).props
      .accessibilityState,
  ).toEqual({ disabled: true });
  expect(
    screen.getByRole('button', { name: name(t.savedReplies.moveDown, WELCOME.title) }).props
      .accessibilityState,
  ).toEqual({ disabled: true });
  await fireEvent.press(
    screen.getByRole('button', { name: name(t.savedReplies.moveUp, WELCOME.title) }),
  );
  expect(mockApi.writes()).toContainEqual({
    method: 'POST',
    path: `/saved-replies/${WELCOME.id}/move`,
    body: { direction: 'up' },
  });
});

test('«رد جديد» adds a shared reply; a tap edits one', async () => {
  mockApi.onWrite(() => WELCOME);
  await renderWithQuery(<SharedRepliesScreen />);
  await fireEvent.press(await screen.findByRole('button', { name: t.savedReplies.add }));
  await fireEvent.changeText(screen.getByLabelText(t.savedReplies.fieldTitle), 'مواعيد');
  await fireEvent.changeText(screen.getByLabelText(t.savedReplies.fieldBody), 'المواعيد مرفقة');
  await fireEvent.press(screen.getByRole('button', { name: t.common.save }));
  expect(mockApi.writes()).toContainEqual({
    method: 'POST',
    path: '/saved-replies',
    body: { scope: 'shared', title: 'مواعيد', body: 'المواعيد مرفقة', attachment: null },
  });
  await fireEvent.press(await screen.findByRole('button', { name: 'ترحيب' }));
  expect(screen.getByText(t.savedReplies.editTitle)).toBeTruthy();
});
