import en from '@ab/shared/i18n/en.json';
import { screen, within } from '@testing-library/react-native';
import { renderWithQuery } from '@/test/query';
import { failed, PHONE } from '@/inbox/shared/thread-fixtures';
import { FailedSheet } from '@/inbox/messages/resend/FailedSheet/FailedSheet';
import { mockCall } from '@ab/testing/mock-call';

// An English run: the native flag is LTR (jest.setup reports RTL, the Arabic default).
jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});
const mockApi = mockCall();
mockApi.onRead(async () => ({}));
mockApi.onWrite(async () => ({}));
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));

test('an LTR run words the failed-send sheet from en.json: the Meta billing reason, by hand only', async () => {
  await renderWithQuery(
    <FailedSheet
      phone={PHONE}
      message={{ ...failed, error_code: '131042' }}
      onClose={jest.fn()}
      onError={jest.fn()}
    />,
  );
  const sheet = screen.getByTestId('failed-sheet');
  expect(within(sheet).getByLabelText(en.messages.failedMenu)).toBeTruthy();
  const s = within(sheet);
  expect(
    s.getByText(en.messages.errorLine.replace('{reason}', en.messages.errors['131042'])),
  ).toBeTruthy();
  expect(s.queryByRole('button', { name: en.messages.retry })).toBeNull();
  expect(s.getByRole('button', { name: en.messages.clickToChat })).toBeTruthy();
  expect(s.getByRole('button', { name: en.common.cancel })).toBeTruthy();
});
