import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ABRAR } from '@/features/booking/wizard-fixture';
import { t } from '@/lib/i18n';
import { renderWithClient } from '../test-utils';
import { ContinueChoice } from './ContinueChoice';
import { RENEWAL_VIEW } from './course-fixture';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const NOW = '2026-10-03T09:00:00.000Z';
const open = () =>
  renderWithClient(
    <ContinueChoice view={RENEWAL_VIEW} draft={{ program: 'quran', genderPref: null }} now={NOW} onContinue={vi.fn()} onOther={vi.fn()} />,
  );
const same = () => screen.getByRole('button', { name: t.booking.courseChange.continueSameDays });

describe('«تابِع بنفس الأيام» while the previous teacher is read', () => {
  afterEach(() => apiFetch.mockReset());

  it('still loading: the status line says so, «تابِع» disabled, nothing said about her yet', async () => {
    apiFetch.mockReturnValue(new Promise(() => undefined));
    open();
    expect((await screen.findByRole('status')).textContent).toBe(t.common.loading);
    expect(same().hasAttribute('disabled')).toBe(true);
    expect(screen.queryByText(t.booking.courseChange.teacherUnavailable)).toBeNull();
  });

  it('the read failed: the error with a retry, never «unavailable»; the retry brings «تابِع» back', async () => {
    apiFetch.mockRejectedValueOnce(new Error('offline')).mockResolvedValue([ABRAR]);
    open();
    expect(await screen.findByText(t.common.error, { exact: false })).toBeTruthy();
    expect(screen.queryByText(t.booking.courseChange.teacherUnavailable)).toBeNull();
    expect(same().hasAttribute('disabled')).toBe(true);
    fireEvent.click(screen.getByRole('button', { name: t.sales.retry }));
    await waitFor(() => expect(same().hasAttribute('disabled')).toBe(false));
    expect(screen.queryByRole('status')).toBeNull();
  });
});
