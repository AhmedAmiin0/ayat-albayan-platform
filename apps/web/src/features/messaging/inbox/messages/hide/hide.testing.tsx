// Test helpers for «حذف من المنصة» (test-only): the open chat's log as a given staff member.
import type { MessageView, Permission, UserRole } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { vi } from 'vitest';
import { type Me, meQuery } from '@/features/people/auth';
import { MessageLog } from '@/features/messaging/inbox/messages/components/MessageLog';
import { ChatActionsProvider } from '@/features/messaging/inbox/shared/ChatActionsProvider';
import { PHONE, thread } from '@/features/messaging/inbox/testing/inbox-fixture';

const base = {
  phone: PHONE,
  hasMore: false,
  loadingOlder: false,
  onOlder: vi.fn(),
  waitingKeys: new Set<string>(),
};

/** Who is signed in: role and permissions as /auth/me answers. */
export function showLog(m: MessageView, who: { role: UserRole; permissions: Permission[] }) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false }, mutations: { retry: false } },
  });
  const me: Me = { id: 'p1', email: null, ...who };
  client.setQueryData(meQuery.queryKey, me);
  render(
    <QueryClientProvider client={client}>
      <ChatActionsProvider thread={thread()} enabled>
        <MessageLog {...base} messages={[m]} />
      </ChatActionsProvider>
    </QueryClientProvider>,
  );
}

export const ADMIN = {
  role: 'admin' as const,
  permissions: ['inbox.read', 'inbox.send'] as Permission[],
};
export const SALES = {
  role: 'sales' as const,
  permissions: ['inbox.read', 'inbox.send'] as Permission[],
};
export const TEACHER = {
  role: 'teacher' as const,
  permissions: ['inbox.read', 'inbox.send'] as Permission[],
};
