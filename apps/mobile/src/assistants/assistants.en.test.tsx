import en from '@ab/shared/i18n/en.json';
import { fireEvent, screen } from '@testing-library/react-native';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { AssistantsScreen } from './AssistantsScreen';
import { ALL, ASSISTANT, routes, statement, termsRowOf } from './fixtures';

jest.mock('react-native/Libraries/ReactNative/I18nManager', () => {
  const actual = jest.requireActual('react-native/Libraries/ReactNative/I18nManager').default;
  const getConstants = () => ({ ...actual.getConstants(), isRTL: false });
  return { __esModule: true, default: { ...actual, isRTL: false, getConstants } };
});
const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({ ...jest.requireActual('@/core/lib/http/api'), apiFetch: (p: string) => mockApiFetch(p) }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() } }));

test('an English run reads en.json: title, tabs, terms and the statement actions', async () => {
  expect(t).toEqual(en);
  mockApiFetch.mockImplementation(routes(ALL, { '/assistant-pay/terms': [termsRowOf(ASSISTANT)], '/assistant-pay/statements': [statement()] }));
  await renderWithQuery(<AssistantsScreen />);
  expect(screen.getByRole('header', { name: en.assistants.title })).toBeTruthy();
  expect(await screen.findByText(new RegExp(en.assistants.commissionPercent.replace('{value}', '10')))).toBeTruthy();
  await fireEvent.press(screen.getByRole('tab', { name: en.assistants.tabs.statements }));
  expect(await screen.findByRole('button', { name: en.payouts.approve })).toBeTruthy();
  expect(screen.getAllByText(en.enums.payoutStatus.draft)).toHaveLength(2); // the status pill and the chip
});
