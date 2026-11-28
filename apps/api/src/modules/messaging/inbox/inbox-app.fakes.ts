// The inbox HTTP harness's mocks (test-only): the queries, line clients, gate and sender.
import type { ChatListRef, ThreadLesson, ThreadPeople } from '@ab/shared';
import { vi } from 'vitest';
import type { ApprovalRow } from '@/modules/messaging/whatsapp';
import type { FamilyTag } from './people/thread-people.mapper';
import type { ThreadWindow } from './send/send-number';
import type { KnownNumber } from './threads/known-number';

export const NO_PEOPLE: ThreadPeople = { guardian: null, lead: null, students: [] };

export function inboxMocks() {
  return {
    queries: {
      ...{ list: vi.fn(), thread: vi.fn(), messages: vi.fn(), markInboundRead: vi.fn() },
      ...{ enqueue: vi.fn(), get: vi.fn() },
      lessonTeacher: vi.fn(),
      byDedupKey: vi.fn(async (): Promise<object | null> => null),
      numberWindows: vi.fn(async (): Promise<ThreadWindow[]> => []),
      known: vi.fn(async (): Promise<KnownNumber | null> => null),
      lessons: vi.fn(async (): Promise<ThreadLesson[]> => []),
      people: vi.fn(async () => NO_PEOPLE),
      familyTags: vi.fn(async () => new Map<string, FamilyTag>()),
      unsupported: vi.fn(async <T>(rows: T[]) => rows),
    },
    teacher: {
      ...{ teacher: vi.fn(), phones: vi.fn(), unread: vi.fn(), stampRead: vi.fn() },
      ...{ myStudentIds: vi.fn(), guardianStudents: vi.fn() },
    },
    sales: { ownership: vi.fn() },
    lists: {
      ...{ all: vi.fn(), one: vi.fn(), count: vi.fn(), create: vi.fn(), rename: vi.fn() },
      ...{ remove: vi.fn(), add: vi.fn(), drop: vi.fn() },
      listsOf: vi.fn(async (): Promise<ChatListRef[]> => []),
    },
    templates: {
      ...{ all: vi.fn(), get: vi.fn(), update: vi.fn() },
      approvals: vi.fn(async (): Promise<ApprovalRow[]> => []),
    },
    client: { configured: vi.fn(() => true), markRead: vi.fn() },
    chatClient: { configured: vi.fn(() => true), markRead: vi.fn() },
    gate: { open: vi.fn() },
    sender: { kick: vi.fn() },
    audit: { record: vi.fn() },
    reopenRequest: {
      usable: vi.fn(async (): Promise<string | null> => 'template'),
    },
    // Plain functions (vi.resetAllMocks keeps them): no reopen read, the thread as it is.
    reopenPick: { thread: async <T>(view: T): Promise<T> => view, stamp: async () => null },
    hides: { target: vi.fn(), set: vi.fn(async () => true) },
    delta: { newer: vi.fn(), pending: vi.fn() },
    sync: { page: vi.fn(), tombstones: vi.fn() },
    search: { rows: vi.fn() },
    messageSearch: { search: vi.fn() },
    stickers: {
      ...{ recent: vi.fn(), messages: vi.fn(), favourites: vi.fn() },
      ...{ save: vi.fn(), drop: vi.fn() },
    },
  };
}
