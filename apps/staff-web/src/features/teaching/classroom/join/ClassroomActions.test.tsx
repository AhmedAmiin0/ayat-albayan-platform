import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { lesson } from '@/features/teaching/schedule/lesson/lesson-fixture';
import { t } from '@/lib/i18n/i18n';
import { ClassroomActions } from './ClassroomActions';

vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch: vi.fn(async () => []), apiSend: vi.fn() }));

const L = lesson({ id: 'l-7', status: 'scheduled', starts_at: '2026-10-03T16:00:00.000Z', minutes: 60 });

/** docs/07 «الأزرار»: no shrink-wrapped multi-word button; each fills the drawer's column. */
describe('ClassroomActions buttons fill the drawer width', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(new Date('2026-10-03T14:00:00.000Z'));
  });
  afterEach(() => vi.useRealTimers());

  it('join, open-now, copy and send are never start-aligned to their label width', () => {
    render(
      <QueryClientProvider client={new QueryClient()}>
        <ClassroomActions lesson={L} />
      </QueryClientProvider>,
    );
    const names = [t.classroom.enter, t.classroom.openNow, t.classroom.copyLink, t.classroom.sendLink];
    for (const name of names) {
      const b = screen.getByRole('button', { name });
      expect(b.className).not.toContain('justify-self-start');
      expect(b.parentElement?.className).not.toContain('justify-items-start');
    }
  });
});
