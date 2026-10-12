import { fireEvent, screen } from '@testing-library/react-native';
import { ApiError } from '@/lib/api';
import { t } from '@/lib/i18n';
import { renderWithQuery } from '@/test/query';
import { StudentScreen } from './StudentScreen';
import { profile } from './test-data';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
jest.mock('expo-router', () => ({
  router: { push: jest.fn(), back: jest.fn(), canGoBack: () => true },
  useLocalSearchParams: () => ({ id: 's1' }),
}));

const selected = () => screen.getByRole('radio', { checked: true });
const pill = (name: string) => screen.getByRole('radio', { name });

beforeEach(() => {
  mockApiFetch.mockReset().mockResolvedValue(profile);
  mockApiSend.mockReset();
});

test('every student status is offered; the current one is selected', async () => {
  await renderWithQuery(<StudentScreen />);
  await screen.findByRole('header', { name: 'هدى' });
  expect(screen.getAllByRole('radio')).toHaveLength(5);
  expect(pill(t.enums.studentStatus.pending_renewal)).toBeTruthy(); // the admin may set it by hand
  expect(selected()).toBe(pill(t.enums.studentStatus.active));
});

test('a tap shows the new status at once and PATCHes /students/:id', async () => {
  mockApiSend.mockReturnValue(new Promise(() => undefined));
  await renderWithQuery(<StudentScreen />);
  await screen.findByRole('header', { name: 'هدى' });
  await fireEvent.press(pill(t.enums.studentStatus.paused));
  expect(await screen.findByRole('radio', { checked: true, name: t.enums.studentStatus.paused })).toBeTruthy();
  expect(mockApiSend).toHaveBeenCalledWith('PATCH', '/students/s1', { status: 'paused' });
});

test('a refused change rolls back and says so', async () => {
  mockApiSend.mockRejectedValue(new ApiError(400));
  await renderWithQuery(<StudentScreen />);
  await screen.findByRole('header', { name: 'هدى' });
  await fireEvent.press(pill(t.enums.studentStatus.churned));
  expect(await screen.findByRole('alert')).toHaveTextContent(t.common.error);
  expect(selected()).toBe(pill(t.enums.studentStatus.active));
});

test('tapping the current status sends nothing', async () => {
  await renderWithQuery(<StudentScreen />);
  await screen.findByRole('header', { name: 'هدى' });
  await fireEvent.press(pill(t.enums.studentStatus.active));
  expect(mockApiSend).not.toHaveBeenCalled();
});
