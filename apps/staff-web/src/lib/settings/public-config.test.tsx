import { PUBLIC_SETTING_DEFAULTS } from '@ab/shared';
import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { EnterButton } from '@/features/teaching/classroom/join/JoinButton';
import { receiptProblem } from '@/features/finance/payments/attachments/ReceiptField';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { t } from '@/lib/i18n/i18n';
import { publicConfigQuery, usePublicConfig } from './public-config';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

afterEach(() => apiFetch.mockReset());

function Probe() {
  const c = usePublicConfig();
  return <p data-testid="probe">{`${c.join_opens_before_min}|${c.upload_max_mb}`}</p>;
}

describe('usePublicConfig (GET /settings/public)', () => {
  it('keeps the cache key and the 5-minute stale time the admin save invalidates', () => {
    expect(publicConfigQuery.queryKey).toEqual(['settings', 'public']);
    expect(publicConfigQuery.staleTime).toBe(300_000);
  });

  it('shows the registry defaults until the API answers, then the academy values', async () => {
    let answer: (v: unknown) => void = () => undefined;
    apiFetch.mockImplementation(() => new Promise((r) => (answer = r)));
    renderWithClient(<Probe />);
    expect(screen.getByTestId('probe').textContent).toBe(`${PUBLIC_SETTING_DEFAULTS.join_opens_before_min}|10`);
    answer({ ...PUBLIC_SETTING_DEFAULTS, join_opens_before_min: 60, upload_max_mb: 2 });
    await waitFor(() => expect(screen.getByTestId('probe').textContent).toBe('60|2'));
    expect(apiFetch).toHaveBeenCalledWith('/settings/public');
  });

  it('a wider join window from the settings enables «ادخل الحلقة» earlier', async () => {
    const lesson = { id: 'l1', starts_at: new Date(Date.now() + 40 * 60_000).toISOString(), ends_at: new Date(Date.now() + 85 * 60_000).toISOString() };
    apiFetch.mockResolvedValue({ ...PUBLIC_SETTING_DEFAULTS, join_opens_before_min: 60 });
    renderWithClient(<EnterButton lesson={lesson} />);
    expect(screen.getByRole('button', { name: t.classroom.enter })).toHaveProperty('disabled', true);
    expect(await screen.findByRole('link', { name: t.classroom.enter })).toBeTruthy();
  });

  it('a lower upload limit refuses a receipt the default would take', () => {
    const file = new File([new Uint8Array(3 * 1024 * 1024)], 'r.png', { type: 'image/png' });
    expect(receiptProblem(file)).toBeNull();
    expect(receiptProblem(file, 2 * 1024 * 1024)).toBe('receipt_too_large');
  });
});
