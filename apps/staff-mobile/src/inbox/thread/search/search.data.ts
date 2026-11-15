import { message } from '@/inbox/shared/thread-fixtures';

// The chat search tests' messages (test-only data, kept out of .tsx: no Arabic literal there).

export const TITLE = 'أم سهيلة';
const id = (n: number) => `b0000000-0000-4000-8000-00000000000${n}`;
export const NEW = message({ id: id(2), body: 'درس الإسلام اليوم', created_at: '2026-10-01T10:00:00Z' });
export const MID = message({ id: id(3), body: 'شكرًا', created_at: '2026-10-01T11:00:00Z' });
export const OLD = message({ id: id(1), body: 'بداية الاسلام', created_at: '2026-09-01T10:00:00Z' });
