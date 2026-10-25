import { fireEvent, screen } from '@testing-library/react-native';
import { ApiError } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { renderWithQuery } from '@/test/query';
import { BookTrialScreen } from './BookTrialScreen';
import { booked, SUN_17 } from '../testing/fixtures';
import { fakeBookingApi, seededClient, walkToConfirm } from '../testing/test-utils';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/core/lib/http/api', () => ({
  ...jest.requireActual('@/core/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));
jest.mock('expo-router', () => ({
  router: { back: jest.fn(), canGoBack: () => true, replace: jest.fn(), push: jest.fn() },
  useLocalSearchParams: () => ({ leadId: 'a1' }),
}));

const duplicate = new ApiError(409, {
  code: 'duplicate_student',
  message: 'duplicate_student',
  guardian_id: 'g1',
  candidates: [{ id: 's9', code: 'AB-0100', name: 'يوسف', status: 'active' }],
});
type Body = Record<string, unknown>;
const sent = (n: number) => mockApiSend.mock.calls[n]?.[2] as Body;

beforeEach(() => {
  jest.clearAllMocks();
  mockApiFetch.mockImplementation(fakeBookingApi().fetch);
  mockApiSend.mockRejectedValueOnce(duplicate).mockResolvedValueOnce(booked(SUN_17));
});

async function hitDuplicate() {
  await renderWithQuery(<BookTrialScreen />, seededClient());
  await walkToConfirm();
  await fireEvent.press(screen.getByRole('button', { name: t.booking.submit }));
  expect(await screen.findByText(t.students.duplicateTitle)).toBeTruthy();
  expect(screen.getByText(t.booking.duplicateNote)).toBeTruthy();
  expect(screen.getByText('AB-0100', { exact: false })).toBeTruthy();
}

test('«احجز لهذا الطالب»: books the child on file by id, the lead still converts, same request id', async () => {
  await hitDuplicate();
  await fireEvent.press(screen.getByRole('button', { name: t.booking.bookExisting }));
  expect(await screen.findByText(t.booking.booked)).toBeTruthy();
  expect(sent(1)).toMatchObject({ studentIds: ['s9'], leadId: 'a1', package: 'trial' });
  expect(sent(1)).not.toHaveProperty('newStudent');
  expect(sent(1)['clientRequestId']).toBe(sent(0)['clientRequestId']);
});

test('«لا، هذا طالب جديد»: the same new student, forced', async () => {
  await hitDuplicate();
  await fireEvent.press(screen.getByRole('button', { name: t.booking.newAnyway }));
  expect(await screen.findByText(t.booking.booked)).toBeTruthy();
  expect(sent(1)).toMatchObject({ force: true, newStudent: { name: 'يوسف' }, leadId: 'a1' });
  expect(sent(0)).not.toHaveProperty('force');
});
