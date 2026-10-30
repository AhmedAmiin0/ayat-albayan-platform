import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { message, PHONE } from '@/features/messaging/inbox/testing/inbox-fixture';
import { MessageLog } from './MessageLog';

vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch: vi.fn(), apiSend: vi.fn() }));

const base = {
  phone: PHONE, hasMore: false, loadingOlder: false, onOlder: vi.fn(),
  waitingKeys: new Set<string>(),
};
const EVENING = message({ id: 'e', body: 'مساء الأمس', created_at: new Date(2026, 9, 19, 23, 0).toISOString() });
const NIGHT = message({ id: 'n', body: 'بعد منتصف الليل', created_at: new Date(2026, 9, 20, 0, 0, 20).toISOString() });

beforeEach(() => {
  vi.useFakeTimers({ now: new Date(2026, 9, 19, 23, 59, 30), toFake: ['Date', 'setInterval', 'clearInterval'] });
});
afterEach(() => vi.useRealTimers());

it('compiled: a row landing in the minute after midnight, before the tick, opens «اليوم»', () => {
  const { rerender } = render(<MessageLog {...base} messages={[EVENING]} fill="shell" />);
  const days = () => [...screen.getByRole('log').querySelectorAll('ol > li[aria-hidden="true"]')].map((li) => li.textContent);
  expect(days()).toEqual([t.inbox.dayToday]);
  // 00:00:20: the minute timer has not fired yet (its clock still says 23:59:30).
  vi.setSystemTime(new Date(2026, 9, 20, 0, 0, 20));
  rerender(<MessageLog {...base} messages={[EVENING, NIGHT]} fill="shell" />);
  expect(days()).toEqual([t.inbox.dayYesterday, t.inbox.dayToday]);
});
