import { render, screen, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { fullTime } from '../../format';
import { message, PHONE } from '../../testing/inbox-fixture';
import { MessageLog } from './MessageLog';
import { locale } from '@/lib/i18n/locale';

/** The cycle the suite reads times in (test-setup saves 24 h). */
const C24 = { cycle: '24', locale } as const;

// Day separators at every width; each bubble shows the clock only, the full date in its tooltip (W10).
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch: vi.fn(), apiSend: vi.fn() }));

const base = { phone: PHONE, hasMore: false, loadingOlder: false, onOlder: vi.fn(), waitingKeys: new Set<string>() };
const NOW = new Date(2026, 9, 19, 15, 0);
const at = (day: number, hour: number) => new Date(2026, 9, day, hour, 5).toISOString();
const Y = message({ id: 'y', body: 'من الأمس', created_at: at(18, 9) });
const T1 = message({ id: 't1', body: 'صباح اليوم', created_at: at(19, 8) });
const T2 = message({ id: 't2', body: 'ظهر اليوم', created_at: at(19, 13) });

describe('MessageLog day separators (W10)', () => {
  beforeEach(() => {
    vi.useFakeTimers({ toFake: ['Date'] });
    vi.setSystemTime(NOW);
  });
  afterEach(() => vi.useRealTimers());

  it('fill shell: «أمس» then «اليوم», each before its day', () => {
    render(<MessageLog {...base} messages={[Y, T1, T2]} fill="shell" />);
    const rows = [...screen.getByRole('log').querySelectorAll('ol > li')].map((li) => li.textContent ?? '');
    expect(rows[0]).toBe(t.inbox.dayYesterday);
    expect(rows[1]).toContain('من الأمس');
    expect(rows[2]).toBe(t.inbox.dayToday);
    expect(rows.slice(3).join(' ')).toContain('ظهر اليوم');
    expect(rows).toHaveLength(5);
  });

  it('the bubbles show «HH:MM» without a date; the title and a screen-reader line hold the full date', () => {
    render(<MessageLog {...base} messages={[Y, T1]} fill="shell" />);
    const times = screen.getAllByRole('article').map((a) => {
      const time = a.querySelector('time');
      if (!time) throw new Error('no time');
      return time;
    });
    const shown = (x: Element) => x.querySelector('[aria-hidden="true"]')?.textContent;
    expect(times.map(shown)).toEqual(['09:05', '08:05']);
    expect(times[0]?.getAttribute('title')).toBe(fullTime(Y.created_at, C24));
    // The day separators are aria-hidden: the date is read from the bubble's own <time>.
    expect(times[0]?.querySelector('.sr-only')?.textContent).toBe(fullTime(Y.created_at, C24));
    const visible = within(screen.getAllByRole('article')[0] as HTMLElement).queryAllByText(/أكتوبر|Oct/);
    expect(visible.every((el) => el.classList.contains('sr-only'))).toBe(true);
  });
});
