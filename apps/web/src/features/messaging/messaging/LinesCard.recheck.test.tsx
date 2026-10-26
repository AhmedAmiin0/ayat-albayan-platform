import type { LineCheckView } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { t } from '@/lib/i18n/i18n';
import { LinesCard } from './LinesCard';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiSend }));

const s = t.templates.settings.lines;
const view = (line: LineCheckView['line']): LineCheckView => ({
  line,
  configured: true,
  phone_number_id: '1111',
  waba_id: '2222',
  app_id: 'ours',
  display_phone_number: null,
  verified_name: null,
  quality_rating: 'GREEN',
  status: 'CONNECTED',
  name_status: null,
  code_verification_status: null,
  subscribed_apps: null,
  errors: [],
  checked_at: '2026-10-10T08:00:00Z',
  provider: 'meta',
  gaps: [],
  duplicate_chat_phone: false,
});
const live = () => {
  const rows = screen.getAllByTestId('line-row');
  return rows[0]?.parentElement;
};

afterEach(() => apiSend.mockReset());

describe('LinesCard re-check (review W3, W5)', () => {
  it('W3: a failed re-check keeps the last good result and its checked time', async () => {
    apiSend.mockResolvedValueOnce([view('notifications'), view('chat')]);
    renderWithClient(<LinesCard />);
    fireEvent.click(screen.getByRole('button', { name: s.check }));
    expect(await screen.findAllByText('CONNECTED')).toHaveLength(2);
    const checked = screen.getAllByText(new RegExp(s.checkedAt.replace('{time}', ''))).map((e) => e.textContent);
    apiSend.mockRejectedValueOnce(new Error('network'));
    fireEvent.click(screen.getByRole('button', { name: s.check }));
    expect((await screen.findByRole('status')).textContent).toContain(s.checkFailed);
    expect(screen.getAllByText('CONNECTED')).toHaveLength(2);
    expect(screen.queryByText(s.notChecked)).toBeNull();
    expect(screen.getAllByText(new RegExp(s.checkedAt.replace('{time}', ''))).map((e) => e.textContent)).toEqual(checked);
  });

  it('W5: the rows are a polite live region, busy while checking, with no role', async () => {
    let answer: (v: LineCheckView[]) => void = () => undefined;
    apiSend.mockReturnValueOnce(new Promise<LineCheckView[]>((r) => (answer = r)));
    renderWithClient(<LinesCard />);
    const region = live();
    expect(region?.getAttribute('aria-live')).toBe('polite');
    expect(region?.getAttribute('role')).toBeNull();
    expect(region?.getAttribute('aria-busy')).toBe('false');
    fireEvent.click(screen.getByRole('button', { name: s.check }));
    await waitFor(() => expect(live()?.getAttribute('aria-busy')).toBe('true'));
    answer([view('notifications'), view('chat')]);
    await waitFor(() => expect(live()?.getAttribute('aria-busy')).toBe('false'));
    expect(screen.queryAllByRole('status')).toHaveLength(0);
  });
});
