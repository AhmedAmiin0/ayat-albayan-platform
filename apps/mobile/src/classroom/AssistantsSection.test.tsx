import { fireEvent, screen, waitFor } from '@testing-library/react-native';
import { t } from '@/lib/i18n';
import { pathKey } from '@/lib/query-keys';
import { createTestQueryClient, renderWithQuery } from '@/test/query';
import { AssistantsSection, freeAssistants } from './AssistantsSection';

const mockApiFetch = jest.fn();
const mockApiSend = jest.fn();
jest.mock('@/lib/api', () => ({
  ...jest.requireActual('@/lib/api'),
  apiFetch: (...args: unknown[]) => mockApiFetch(...args),
  apiSend: (...args: unknown[]) => mockApiSend(...args),
}));

const A = t.classroom.assistants;
const sara = { profile_id: 'p1', full_name: 'سارة' };
const huda = { profile_id: 'p2', full_name: 'هدى' };
let mine = [sara];

beforeEach(() => {
  jest.clearAllMocks();
  mine = [sara];
  mockApiFetch.mockImplementation(async (path: string) => (path === '/assistants' ? [sara, huda] : mine));
});

test('freeAssistants offers only those not yet on the student', () => {
  expect(freeAssistants([sara, huda], [sara])).toEqual([huda]);
  expect(freeAssistants([sara], [sara])).toEqual([]);
});

test('lists the assigned assistants; «إزالة» deletes one and refreshes the list', async () => {
  await renderWithQuery(<AssistantsSection studentId="s-1" />);
  expect(await screen.findByText('سارة')).toBeTruthy();
  mockApiSend.mockImplementation(async () => {
    mine = [];
    return mine;
  });
  await fireEvent.press(screen.getByRole('button', { name: `${A.remove} سارة` }));
  expect(mockApiSend).toHaveBeenCalledWith('DELETE', '/students/s-1/assistants/p1');
  expect(await screen.findByText(A.none)).toBeTruthy();
});

test('«أضف مساعدًا/ة» opens the picker of the free ones; a tap assigns', async () => {
  await renderWithQuery(<AssistantsSection studentId="s-1" />);
  await fireEvent.press(await screen.findByRole('button', { name: A.add }));
  expect(screen.queryAllByText('سارة')).toHaveLength(1);
  mockApiSend.mockResolvedValue([sara, huda]);
  await fireEvent.press(screen.getByRole('button', { name: 'هدى' }));
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('POST', '/students/s-1/assistants', { profileId: 'p2' }));
});

test('every assistant already assigned says there is nobody left to add', async () => {
  mine = [sara, huda];
  await renderWithQuery(<AssistantsSection studentId="s-1" />);
  expect(await screen.findByText(A.noneAvailable)).toBeTruthy();
  expect(screen.queryByRole('button', { name: A.add })).toBeNull();
});

test('a failed read with nothing cached leaves the section out (offline: the profile stays quiet)', async () => {
  mockApiFetch.mockRejectedValue(new Error('x'));
  await renderWithQuery(<AssistantsSection studentId="s-1" />);
  await waitFor(() => expect(screen.queryByRole('header', { name: A.title })).toBeNull());
});

test('a refused change shows the error line', async () => {
  await renderWithQuery(<AssistantsSection studentId="s-1" />);
  mockApiSend.mockRejectedValue(new Error('x'));
  await fireEvent.press(await screen.findByRole('button', { name: `${A.remove} سارة` }));
  expect(await screen.findByText(t.common.error)).toBeTruthy();
});

test('without assistants.read nothing is fetched for the student', async () => {
  mockApiFetch.mockImplementation(async (path: string) => (path === '/auth/me' ? { permissions: [] } : mine));
  const client = createTestQueryClient();
  client.setQueryData(pathKey('/auth/me'), { permissions: [] }); // the signed-in session already knows its role
  await renderWithQuery(<AssistantsSection studentId="s1" />, client);
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith('/auth/me'));
  expect(mockApiFetch).not.toHaveBeenCalledWith('/students/s1/assistants');
  expect(screen.queryByText(A.title)).toBeNull();
});
