import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { findRow, openTab, renderRules } from './rules-test-kit';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', async (orig) => ({ ...(await orig<object>()), Link: (await import('@/features/messaging/inbox/testing/test-utils')).MockLink }));
vi.mock('@/features/people/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: ['notifications.manage'], can: () => true }) }));

const r = t.notificationRules;
const tm = r.timing;
const words = t.notificationCatalogue.entries;
const save = (key: keyof typeof words) => screen.getByRole('button', { name: `${t.common.save}: ${words[key].name}` });
const hour = (row: HTMLElement, n: number) => within(row).getByLabelText(tm.followUpLabel.replace('{n}', String(n)));

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('«الإشعارات»: timing editors (selects and bounded numbers only)', () => {
  it('day before: a select of whole hours, «في موعد الحلقة نفسه» = null; sends send_at_local only', async () => {
    renderRules({ apiFetch });
    const row = await findRow('lesson_reminder_24h');
    const select = within(row).getByLabelText(tm.dayBeforeLabel) as HTMLSelectElement;
    expect(select.value).toBe('');
    expect(within(select).getByRole('option', { name: tm.dayBeforeSame })).toBeTruthy();
    fireEvent.change(select, { target: { value: '20:00' } });
    apiSend.mockResolvedValue(undefined);
    fireEvent.click(save('lesson_reminder_24h'));
    await waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('PATCH', '/admin/notifications/lesson_reminder_24h', { timing: { send_at_local: '20:00' } }),
    );
  });

  it('teacher lead time: «مثل تذكير الأسرة» (null) until unticked, then its own minutes', async () => {
    renderRules({ apiFetch });
    await findRow('lesson_reminder');
    openTab(t.notificationCatalogue.audience.teacher);
    const row = await findRow('teacher_lesson_reminder');
    const same = within(row).getByRole('checkbox', { name: tm.sameAsFamily });
    expect((same as HTMLInputElement).checked).toBe(true);
    expect(within(row).queryByLabelText(tm.minutesLabel)).toBeNull();
    fireEvent.click(same);
    fireEvent.change(within(row).getByLabelText(tm.minutesLabel), { target: { value: '30' } });
    apiSend.mockResolvedValue(undefined);
    fireEvent.click(save('teacher_lesson_reminder'));
    await waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('PATCH', '/admin/notifications/teacher_lesson_reminder', { timing: { minutes_before: 30 } }),
    );
  });

  it('follow-ups: out of order is refused in words; add and remove keep ≤ 5; the whole timing is sent', async () => {
    renderRules({ apiFetch });
    await findRow('lesson_reminder');
    openTab(t.notificationCatalogue.audience.lead);
    const row = await findRow('follow_up_slots');
    expect((hour(row, 1) as HTMLInputElement).value).toBe('24');
    fireEvent.change(hour(row, 1), { target: { value: '80' } });
    expect(within(row).getByText(r.errors.ascending)).toBeTruthy();
    expect(save('follow_up_slots').getAttribute('aria-disabled')).toBe('true');
    fireEvent.change(hour(row, 1), { target: { value: '12' } });
    for (let i = 0; i < 3; i += 1) fireEvent.click(within(row).getByRole('button', { name: tm.followUpAdd }));
    expect(within(row).queryByRole('button', { name: tm.followUpAdd })).toBeNull();
    fireEvent.click(within(row).getByRole('button', { name: tm.followUpRemove.replace('{n}', '5') }));
    fireEvent.click(within(row).getByRole('button', { name: tm.followUpRemove.replace('{n}', '4') }));
    fireEvent.change(within(row).getByLabelText(tm.slotsToLabel), { target: { value: '31' } });
    expect(within(row).getByText(r.errors.slotsTo)).toBeTruthy();
    fireEvent.change(within(row).getByLabelText(tm.slotsToLabel), { target: { value: '10' } });
    apiSend.mockResolvedValue(undefined);
    fireEvent.click(save('follow_up_slots'));
    await waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('PATCH', '/admin/notifications/follow_up_slots', {
        timing: { hours: [12, 72, 96], slots_from_hours: 12, slots_to_days: 10 },
      }),
    );
  });
});
