// Test helpers for the channel bubble's edit / delete (test-only).
import type { ChannelAudience } from '@ab/client-core';
import type { ChannelMessageView } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { ChannelBubble } from '@ab/web-kit/components/channel/ChannelBubble';
import { channelMessage } from '@ab/web-kit/components/channel/channel.fixtures';

const MIN = 60_000;

/** A message written `minutesAgo` ago (mine by default). */
export const msg = (
  minutesAgo: number,
  over: Partial<ChannelMessageView> = {},
): ChannelMessageView =>
  channelMessage({
    body: 'See you tomorrow',
    sender_role: 'teacher',
    sender_name: 'Abrar',
    mine: true,
    created_at: new Date(Date.now() - minutesAgo * MIN).toISOString(),
    ...over,
  });

export function showBubble(
  message: ChannelMessageView,
  audience: ChannelAudience = 'teacher',
  mode: 'write' | 'read' = audience === 'admin' ? 'read' : 'write',
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  render(
    <QueryClientProvider client={client}>
      <ol>
        <ChannelBubble
          message={message}
          tz="Asia/Riyadh"
          refs={{ audience, studentId: 's1' }}
          now={new Date()}
          mode={mode}
        />
      </ol>
    </QueryClientProvider>,
  );
  return client;
}
