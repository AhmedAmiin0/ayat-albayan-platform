// Test helpers for the channel bubble's edit / delete (test-only).
import type { ChannelAudience } from '@ab/client-core';
import type { ChannelMessageView } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { ChannelBubble } from '@/features/teaching/student-channel/ChannelBubble';

const MIN = 60_000;

/** A message written `minutesAgo` ago (mine by default). */
export const msg = (
  minutesAgo: number,
  over: Partial<ChannelMessageView> = {},
): ChannelMessageView => ({
  id: 'm1',
  body: 'See you tomorrow',
  sender_role: 'teacher',
  sender_name: 'Abrar',
  mine: true,
  created_at: new Date(Date.now() - minutesAgo * MIN).toISOString(),
  edited: false,
  deleted: false,
  ...over,
});

export function showBubble(message: ChannelMessageView, audience: ChannelAudience = 'teacher') {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <ol>
        <ChannelBubble message={message} tz="Asia/Riyadh" refs={{ audience, studentId: 's1' }} />
      </ol>
    </QueryClientProvider>,
  );
  return client;
}
