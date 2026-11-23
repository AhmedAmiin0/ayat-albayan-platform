import { renderHook, waitFor } from '@testing-library/react-native';
import { freshQueryClient, queryWrapper } from '../testing/query';
import { useMarkRead } from './use-mark-read';

const mockApiSend = jest.fn();
jest.mock('../lib/http/api', () => ({
  ...jest.requireActual('../lib/http/api'),
  apiSend: (...mockArgs: unknown[]) => mockApiSend(...mockArgs),
}));

const AT = '2026-10-27T10:05:00.000Z';
const SALES = { audience: 'sales', studentId: 's1' } as const;
const READ_PATH = '/sales/students/s1/channel/read';

beforeEach(() => mockApiSend.mockReset().mockResolvedValue({}));

const mark = (enabled: boolean, at: string | undefined) =>
  renderHook(() => useMarkRead(SALES, { enabled, at }), {
    wrapper: queryWrapper(freshQueryClient()),
  });

test('a writer (mode write) marks the thread read up to the newest message', async () => {
  await mark(true, AT);
  await waitFor(() => expect(mockApiSend).toHaveBeenCalledWith('POST', READ_PATH, { at: AT }));
});

test('not a writer (a monitor or a closed chat): never calls the read endpoint', async () => {
  await mark(false, AT);
  await waitFor(() => expect(mockApiSend).not.toHaveBeenCalled());
});

test('no newest message: nothing to mark', async () => {
  await mark(true, undefined);
  await waitFor(() => expect(mockApiSend).not.toHaveBeenCalled());
});
