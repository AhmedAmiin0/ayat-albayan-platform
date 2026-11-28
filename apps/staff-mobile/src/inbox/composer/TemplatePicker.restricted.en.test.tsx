import en from '@ab/shared/i18n/en.json';
import { screen } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { TemplatePicker } from './TemplatePicker';
import { mockCall } from '@ab/testing/mock-call';

jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});
const mockApi = mockCall();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  call: (request: unknown) => mockApi.call(request),
}));

test('an English run: a restricted role with no allowed template reads the English empty note', async () => {
  expect(t).toEqual(en);
  mockApi.onRead(async ({ path }) =>
    path === '/auth/me' ? { id: 'u1', role: 'sales', permissions: ['messages.read'] } : [],
  );
  await renderWithQuery(
    <TemplatePicker visible lessons={[]} teacher={false} onClose={jest.fn()} onSend={jest.fn()} />,
    createTestQueryClient({ meFromApi: true }),
  );
  expect(await screen.findByText('No templates are available to you yet')).toBeTruthy();
});
