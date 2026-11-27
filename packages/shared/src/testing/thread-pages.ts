import type { ThreadDelta, ThreadDetail } from '../messaging';

/** An empty chat's newest page, as GET /threads/:phone answers it; override what a test needs. */
export const aThreadDetail = (overrides: Partial<ThreadDetail> = {}): ThreadDetail => ({
  thread: null,
  messages: [],
  has_more: false,
  lessons: [],
  people: { guardian: null, lead: null, students: [] },
  ...overrides,
});

/** A delta that brings nothing new; override what a test needs. */
export const aThreadDelta = (overrides: Partial<ThreadDelta> = {}): ThreadDelta => ({
  messages: [],
  has_more: false,
  pending: [],
  ...overrides,
});
