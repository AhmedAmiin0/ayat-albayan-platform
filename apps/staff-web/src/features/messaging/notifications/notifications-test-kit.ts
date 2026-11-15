import type { NotificationItem, NotificationsPage } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { createElement, type ReactElement } from 'react';

// Shared by the bell tests (not a test itself): fixtures and a render wrapper.

export const STUDENT_ID = '0b0c53a6-6f0e-4f56-9d5d-0d6a3a0e6a11';

export const ITEM: NotificationItem = {
  id: 'n1',
  kind: 'report_submitted',
  title: 'Report submitted',
  body: 'Lesson report for AB-0007',
  data: { studentId: STUDENT_ID },
  created_at: '2026-10-12T09:00:00Z',
  read_at: null,
};
export const READ_ITEM: NotificationItem = { ...ITEM, id: 'n2', title: 'Older one', read_at: '2026-10-12T10:00:00Z' };

export const page = (items: NotificationItem[], unread = items.filter((i) => !i.read_at).length): NotificationsPage => ({
  items,
  total: items.length,
  page: 1,
  pageSize: 20,
  unread,
});

export function renderWithClient(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return { client, ...render(createElement(QueryClientProvider, { client }, ui)) };
}
