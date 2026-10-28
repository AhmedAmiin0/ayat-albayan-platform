import en from '@ab/shared/i18n/en.json';
import { fireEvent, screen } from '@testing-library/react-native';
import { renderWithQuery } from '@/test/query';
import { LeadsList } from './LeadsList';
import { leadsBackend } from './leads-fixtures';

// An English run: the native flag is LTR (jest.setup reports RTL, the Arabic default).
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
jest.mock('expo-router', () => ({ router: { push: jest.fn() } }));

test('an LTR run shows the en.json filter, owner and bulk words', async () => {
  mockApiFetch.mockImplementation(leadsBackend(['leads.assign']));
  await renderWithQuery(<LeadsList switcher={null} />);
  expect(await screen.findByText(new RegExp('Owner: Sara|Owner: سارة'))).toBeTruthy();
  await fireEvent.press(screen.getByRole('button', { name: en.mobileLeads.filter }));
  expect(screen.getByText(en.mobileLeads.filterTitle)).toBeTruthy();
  // The bulk assignment sits in the sheet under the owners (owner 2026-10-28: one compact top).
  expect(screen.getByRole('button', { name: en.sales.assign.assignAll })).toBeTruthy();
  expect(screen.getByRole('radio', { name: en.leads.sort.newest })).toBeTruthy();
});
