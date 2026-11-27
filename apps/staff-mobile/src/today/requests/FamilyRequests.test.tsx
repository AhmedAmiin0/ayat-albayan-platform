import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@ab/mobile-kit';
import { confirmingQueryClient, renderWithQuery } from '@/test/query';
import { answered } from '@/today/testing/answered';
import { lesson } from '@/today/testing/fixtures';
import { FamilyRequests } from './FamilyRequests';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@ab/mobile-kit/lib/http/api', () => ({
  ...jest.requireActual('@ab/mobile-kit/lib/http/api'),
  apiFetch: (mockPath: string) => mockApiFetch(mockPath),
  apiSend: (...args: unknown[]) => mockApiSend(...args),
}));

const uuid = (n: number) => `00000000-0000-4000-8000-${String(n).padStart(12, '0')}`;
const REQUEST = {
  id: uuid(1),
  lesson_id: uuid(2),
  starts_at: '2026-11-17T16:30:00.000Z',
  ends_at: '2026-11-17T17:15:00.000Z',
  status: 'scheduled',
  proposed_starts_at: '2026-11-18T15:30:00.000Z',
  note: 'لدى يوسف اختبار مساء الإثنين',
  created_at: '2026-11-16T10:00:00.000Z',
  teacher: { id: uuid(3), display_name_ar: 'فاطمة', display_name_en: null, tz: 'Africa/Cairo' },
  students: [{ id: uuid(4), code: 'AB-0147', name: 'يوسف أحمد', tz: 'Africa/Cairo' }],
};
const MOVED = answered(lesson({ id: 'l2', starts_at: REQUEST.proposed_starts_at }));
const P = t.lessons.proposal;

beforeEach(() => {
  mockApiFetch.mockReset();
  mockApiSend.mockReset();
  mockApiFetch.mockImplementation(async (path: string) =>
    path === '/family-requests' ? [REQUEST] : [],
  );
  mockApiSend.mockResolvedValue(MOVED);
});

const openRequest = async (slotsPath?: string) => {
  await renderWithQuery(<FamilyRequests slotsPath={slotsPath} />, confirmingQueryClient());
  expect(await screen.findByText(`${P.familyRequests} · 1`)).toBeTruthy();
  await fireEvent.press(screen.getByText('يوسف أحمد AB-0147'));
};

test('«طلبات الأسر · 1»: the row opens the answer with the family’s ask and note', async () => {
  await openRequest();
  expect(screen.getByText(P.familyNote.replace('{note}', REQUEST.note))).toBeTruthy();
  expect(screen.getByText(new RegExp(P.familyPending.split(':')[0] ?? ''))).toBeTruthy();
});

test('«وافق على الموعد» approves the asked time', async () => {
  await openRequest();
  await fireEvent.press(screen.getByRole('button', { name: P.approve }));
  await waitFor(() =>
    expect(mockApiSend).toHaveBeenCalledWith('POST', `/family-requests/${REQUEST.id}/approve`, {}),
  );
});

test('«ارفض الطلب» asks for the note the family reads, then declines with it', async () => {
  await openRequest();
  await fireEvent.press(screen.getByRole('button', { name: P.rejectRequest }));
  expect(screen.getByPlaceholderText(P.decisionNotePlaceholder)).toBeTruthy();
  await fireEvent.changeText(screen.getByLabelText(P.decisionNote), 'لا يتوفر وقت آخر');
  await fireEvent.press(screen.getByRole('button', { name: P.rejectRequest }));
  await waitFor(() =>
    expect(mockApiSend).toHaveBeenCalledWith('POST', `/family-requests/${REQUEST.id}/reject`, {
      note: 'لا يتوفر وقت آخر',
    }),
  );
});

test('«اختر موعدًا آخر» reads the assistant’s own slot grid in her tree', async () => {
  await openRequest('/sales/booking/slots');
  await fireEvent.press(screen.getByRole('button', { name: P.pickOther }));
  await waitFor(() =>
    expect(mockApiFetch).toHaveBeenCalledWith(expect.stringMatching(/^\/sales\/booking\/slots\?/)),
  );
});

test('nothing waiting: no section', async () => {
  mockApiFetch.mockResolvedValue([]);
  await renderWithQuery(<FamilyRequests />, confirmingQueryClient());
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith('/family-requests'));
  expect(screen.queryByText(P.familyRequests, { exact: false })).toBeNull();
});
