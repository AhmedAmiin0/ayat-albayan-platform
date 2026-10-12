import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook, waitFor } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { registerPush } from './registerPush';
import { usePushWhenHeld } from './usePushWhenHeld';

jest.mock('./registerPush', () => ({ registerPush: jest.fn(async () => undefined) }));
const mockApiFetch = jest.fn();
jest.mock('@/lib/api', () => ({ ...jest.requireActual('@/lib/api'), apiFetch: (p: string) => mockApiFetch(p) }));

function wrapper({ children }: { children: ReactNode }) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
}

beforeEach(() => jest.clearAllMocks());

test('without notifications.push nothing registers (no OS prompt, no PUT)', async () => {
  mockApiFetch.mockResolvedValue({ role: 'sales', permissions: ['inbox.read', 'self.sales'] });
  await renderHook(usePushWhenHeld, { wrapper });
  await waitFor(() => expect(mockApiFetch).toHaveBeenCalledWith('/auth/me'));
  expect(registerPush).not.toHaveBeenCalled();
});

test('while /auth/me has not answered nothing registers', async () => {
  mockApiFetch.mockReturnValue(new Promise(() => undefined));
  await renderHook(usePushWhenHeld, { wrapper });
  expect(registerPush).not.toHaveBeenCalled();
});

test('a role widened to notifications.push registers once', async () => {
  mockApiFetch.mockResolvedValue({ role: 'assistant', permissions: ['notifications.push'] });
  const { rerender } = await renderHook(usePushWhenHeld, { wrapper });
  await waitFor(() => expect(registerPush).toHaveBeenCalledTimes(1));
  await rerender({});
  expect(registerPush).toHaveBeenCalledTimes(1);
});
