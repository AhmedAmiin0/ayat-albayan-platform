import { vi } from 'vitest';
import type { ApiClient } from '../../../../core/http';

// Answers of the chat routes for the call file tests (test-only); made-up names.

export const STUDENT = '00000000-0000-4000-8000-000000000001';
export const MESSAGE = '00000000-0000-4000-8000-000000000002';
export const BEFORE = '2026-10-27T10:00:00.000Z';

export const message = {
  id: MESSAGE,
  kind: 'text',
  body: 'السلام عليكم',
  attachment: null,
  reply_to: null,
  sender_name: 'خالد',
  sender_role: 'guardian',
  mine: false,
  client_id: null,
  read_by_all: false,
  edited: false,
  deleted: false,
  created_at: BEFORE,
};

export const page = {
  student_name: 'سالم',
  messages: [message],
  has_more: false,
  read_only: false,
  open: true,
  closed_reason: null,
  channel_id: 'c1',
  participants: [],
  my_last_read_at: null,
};

export const presence = { enabled: true, peers: [] };
export const reads = { read: [], unread: [{ name: 'سالم', role: 'student' }] };

const answering = (answer: unknown) => vi.fn((..._ask: unknown[]) => Promise.resolve(answer));

interface Answering {
  client: ApiClient;
  apiFetch: ReturnType<typeof answering>;
  apiSend: ReturnType<typeof answering>;
}

export function clientAnswering(answer: unknown): Answering {
  const apiFetch = answering(answer);
  const apiSend = answering(answer);
  return { client: { apiFetch, apiSend }, apiFetch, apiSend };
}
