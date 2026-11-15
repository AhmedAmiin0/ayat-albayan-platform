import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { fakeNow, HELD, openEditTime, pick, SAVED } from './edit-time-fixture';
import { lesson } from '@/features/teaching/schedule/lesson/lesson-fixture';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (importOriginal) => ({ ...(await importOriginal<object>()), apiFetch: vi.fn(async () => []), apiSend }));

const LOCKED = new ApiError(409, { code: 'payout_locked', message: 'payout_locked', month: '2026-09', status: 'approved' });
const SAVE = () => screen.getByRole('button', { name: t.lessons.timeEdit.submit }) as HTMLButtonElement;

describe('«عدّل الوقت» in a closed payout month (E3, R-SCH-11)', () => {
  fakeNow();
  afterEach(() => apiSend.mockReset());

  it('names the month, drops the payout warning, blocks the same save and offers the old length back', async () => {
    apiSend.mockRejectedValueOnce(LOCKED);
    openEditTime(HELD);
    pick.duration(60);
    pick.reason('الحلقة خدت ساعة');
    expect(screen.getByText(t.lessons.timeEdit.payoutWarn)).toBeTruthy();
    pick.save();
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain('2026');
    expect(alert.textContent).toContain(t.enums.payoutStatus.approved);
    expect(alert.textContent).toContain(t.lessons.timeEdit.startOnly);
    expect(screen.queryByText(t.lessons.timeEdit.payoutWarn)).toBeNull();
    expect(SAVE().disabled).toBe(true);
    expect(apiSend).toHaveBeenCalledTimes(1);
  });

  it('«رجّع المدة» puts the recorded length back and a start-only fix then saves', async () => {
    apiSend.mockRejectedValueOnce(LOCKED).mockResolvedValueOnce(SAVED);
    const { onDone } = openEditTime(HELD);
    pick.duration(60);
    pick.time('09:45');
    pick.reason('الساعة غلط');
    pick.save();
    fireEvent.click(await screen.findByRole('button', { name: t.lessons.timeEdit.restoreLength.replace('{len}', t.enums.duration['45']) }));
    expect((screen.getByLabelText(t.lessons.timeEdit.duration) as HTMLSelectElement).value).toBe('45');
    await waitFor(() => expect(SAVE().disabled).toBe(false));
    pick.save();
    await waitFor(() => expect(onDone).toHaveBeenCalled());
    expect(apiSend).toHaveBeenLastCalledWith('PATCH', '/lessons/l-9/time', expect.objectContaining({ durationMin: 45 }));
  });

  it('a migrated 40-minute lesson shows «40 دقيقة» and asks for a valid length before saving', () => {
    openEditTime(lesson({ id: 'l-40', minutes: 40, time_edit_mode: 'move' }));
    const odd = t.lessons.timeEdit.durationOther.replace('{n}', '40');
    const select = screen.getByLabelText(t.lessons.timeEdit.duration) as HTMLSelectElement;
    expect(select.selectedOptions[0]?.textContent).toBe(odd);
    expect(select.getAttribute('aria-invalid')).toBe('true');
    expect(screen.getByText(t.lessons.timeEdit.pickLength)).toBeTruthy();
    expect(SAVE().disabled).toBe(true);
    pick.duration(45);
    expect(select.getAttribute('aria-invalid')).toBeNull();
  });
});
