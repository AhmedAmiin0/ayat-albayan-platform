import en from '@ab/shared/i18n/en.json';
import { screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { TemplatePicker } from './TemplatePicker';

jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});
const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));

test('an English run: a restricted role with no allowed template reads the English empty note', async () => {
  expect(t).toEqual(en);
  mockApiFetch.mockImplementation(async (path: string) => (path === '/auth/me' ? { id: 'u1', role: 'sales', permissions: ['messages.read'] } : []));
  await renderWithQuery(<TemplatePicker visible lessons={[]} teacher={false} onClose={jest.fn()} onSend={jest.fn()} />);
  expect(await screen.findByText('No templates are available to you yet')).toBeTruthy();
});
