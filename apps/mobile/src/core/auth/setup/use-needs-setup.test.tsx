import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { renderHook } from '@testing-library/react-native';
import type { ReactNode } from 'react';
import { pathKey } from '@/core/lib/query/query-keys';
import { useNeedsSetup } from './use-needs-setup';

function withMe(me: unknown) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });
  client.setQueryData(pathKey('/auth/me'), me);
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={client}>{children}</QueryClientProvider>
  );
}

test.each([
  ['a teacher on her code-made login', { role: 'teacher', email: 't-1@family.invalid' }, true],
  ['a teacher with her own email', { role: 'teacher', email: 'teacher@example.com' }, false],
  ['a guardian login', { role: 'guardian', email: 'g-1@family.invalid' }, false],
  ['an odd body', 'not json', false],
])('%s → %s', async (_name, me, expected) => {
  const { result } = await renderHook(() => useNeedsSetup(), { wrapper: withMe(me) });
  expect(result.current).toBe(expected);
});
