import { formatPhone } from '@ab/shared';
import { fireEvent, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { t } from '@/core/lib/i18n/i18n';
import { fakeNow } from '@/test/fake-now';
import { renderWithQuery } from '@/test/query';
import { details } from './fixtures';
import { SalesStudentScreen } from './SalesStudentScreen';

const mockApiFetch = jest.fn();
jest.mock('@/core/lib/http/api', () => ({ ...jest.requireActual('@/core/lib/http/api'), apiFetch: (mockPath: string) => mockApiFetch(mockPath) }));
jest.mock('expo-router', () => ({ router: { push: jest.fn(), back: jest.fn() }, useLocalSearchParams: () => ({ id: 'st1' }) }));
jest.mock('@/core/lib/clock/device-clock', () => ({ deviceUses24: () => true }));

const f = t.students.family;
const sibling = { id: 'st2', code: 'AB-0184', name: 'مريم أحمد', status: 'paused' as const };
const family = { guardian_name: 'ولي أمر يوسف', contact_is_self: false, siblings: [sibling] };

beforeEach(() => {
  mockApiFetch.mockReset();
  jest.mocked(router.push).mockReset();
  fakeNow(new Date('2026-10-27T10:00:00Z'));
});
afterEach(() => jest.useRealTimers());

test('a student who is their own contact says so; no phone (no chats): the guardian row has no tap', async () => {
  const own = { ...family, guardian_name: null, contact_is_self: true, siblings: [] };
  const student = { ...details().student, guardian_phone: null };
  mockApiFetch.mockResolvedValue(details({ family: own, student }));
  const view = await renderWithQuery(<SalesStudentScreen />);
  expect(await screen.findByText(f.contactIsSelf)).toBeTruthy();
  await fireEvent.press(screen.getByText(f.noGuardianName));
  expect(router.push).not.toHaveBeenCalled();
  await view.unmount();
});

test('an old cache without `family`: no «العائلة» block', async () => {
  mockApiFetch.mockResolvedValue(details());
  await renderWithQuery(<SalesStudentScreen />);
  expect(await screen.findByText(t.sales.student.current)).toBeTruthy();
  expect(screen.queryByText(f.title)).toBeNull();
});

test('«العائلة»: the guardian (name, phone) opens the family chat; a sibling opens that student', async () => {
  mockApiFetch.mockResolvedValue(details({ family }));
  const view = await renderWithQuery(<SalesStudentScreen />);
  expect(await screen.findByText(f.title)).toBeTruthy();
  await fireEvent.press(screen.getByText('ولي أمر يوسف'));
  expect(router.push).toHaveBeenLastCalledWith(expect.stringContaining(encodeURIComponent('+201001112223')));
  expect(screen.getAllByText(formatPhone('+201001112223'), { exact: false }).length).toBeGreaterThan(0);
  expect(screen.getByText(t.enums.studentStatus.paused)).toBeTruthy();
  await fireEvent.press(screen.getByText('مريم أحمد'));
  expect(router.push).toHaveBeenLastCalledWith('/students/st2');
  expect(screen.queryByText(f.contactIsSelf)).toBeNull();
  await view.unmount();
});
