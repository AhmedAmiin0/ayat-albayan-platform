import en from '@ab/shared/i18n/en.json';
import { screen } from '@testing-library/react-native';
import { renderWithQuery } from '@/test/query';
import { JobApplicantsScreen } from './JobApplicantsScreen';

// An English run: the native flag is LTR (jest.setup reports RTL, the Arabic default).
jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});
const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
}));

test('an LTR run shows the en.json link and filter words', async () => {
  mockApiFetch.mockResolvedValue({
    items: [{ id: 'j1', name: 'Mona', phone_e164: '+201001234567', status: 'interview', cv_url: 'https://x.example/cv', recitation_url: null }],
    total: 1, page: 1, pageSize: 25,
  });
  await renderWithQuery(<JobApplicantsScreen />);
  expect(await screen.findByRole('button', { name: en.mobileLeads.openCv })).toBeTruthy();
  expect(screen.queryByRole('button', { name: en.mobileLeads.openRecitation })).toBeNull();
  expect(screen.getByRole('tab', { name: en.enums.jobApplicantStatus.accepted })).toBeTruthy();
});
