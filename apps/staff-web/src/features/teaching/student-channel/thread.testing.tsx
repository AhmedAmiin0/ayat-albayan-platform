// Test helpers for the student channel thread (test-only).
import type { ChannelAudience } from '@ab/client-core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { ChannelThread } from './ChannelThread';

/** Renders one thread (no retries) and hands back its query client. */
export function showThread(audience: ChannelAudience = 'portal') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const view = render(
    <QueryClientProvider client={client}>
      <ChannelThread refs={{ audience, studentId: 's1' }} tz="Asia/Riyadh" />
    </QueryClientProvider>,
  );
  return { client, ...view };
}
