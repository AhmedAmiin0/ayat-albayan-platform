import { ESSENTIAL_OFF_TEXT } from '@ab/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { findRow, openTab, overview, renderRules } from './rules-test-kit';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', async (orig) => ({ ...(await orig<object>()), Link: (await import('@/features/inbox/testing/test-utils')).MockLink }));
vi.mock('@/features/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: ['notifications.manage'], can: () => true }) }));

const r = t.notificationRules;
const words = t.notificationCatalogue.entries;
const switchOf = (row: HTMLElement, key: keyof typeof words) => within(row).getByRole('switch', { name: r.switchName.replace('{name}', words[key].name) });

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('«الإشعارات»: the switch', () => {
  it('a family-facing row ON says whom it reaches first; cancel sends nothing, yes sends { enabled: true }', async () => {
    renderRules({ apiFetch });
    const row = await findRow('lesson_reminder_24h');
    fireEvent.click(switchOf(row, 'lesson_reminder_24h'));
    const title = r.familyOn.title.replace('{name}', words.lesson_reminder_24h.name);
    const dialog = screen.getByRole('dialog', { name: title });
    expect(within(dialog).getByText(r.familyOn.guardian.other.replace('{n}', '12'))).toBeTruthy();
    expect(document.activeElement?.textContent).toBe(t.common.cancel);
    fireEvent.click(within(dialog).getByRole('button', { name: t.common.cancel }));
    expect(apiSend).not.toHaveBeenCalled();
    fireEvent.click(switchOf(row, 'lesson_reminder_24h'));
    apiSend.mockResolvedValue(undefined);
    fireEvent.click(within(screen.getByRole('dialog', { name: title })).getByRole('button', { name: r.familyOn.yes }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PATCH', '/admin/notifications/lesson_reminder_24h', { enabled: true }));
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('a lead row ON counts leads («عميلًا»); a family row OFF asks with a plain dialog', async () => {
    const data = overview();
    const rule = data.entries.find((e) => e.key === 'follow_up_slots')?.rule;
    if (rule) rule.enabled = false;
    renderRules({ apiFetch, data });
    await findRow('lesson_reminder');
    openTab(t.notificationCatalogue.audience.lead);
    fireEvent.click(switchOf(await findRow('follow_up_slots'), 'follow_up_slots'));
    const on = screen.getByRole('dialog', { name: r.familyOn.title.replace('{name}', words.follow_up_slots.name) });
    expect(within(on).getByText(r.familyOn.lead.other.replace('{n}', '25'))).toBeTruthy();
    fireEvent.click(within(on).getByRole('button', { name: t.common.cancel }));
    openTab(t.notificationCatalogue.audience.guardian);
    fireEvent.click(switchOf(await findRow('lesson_reminder'), 'lesson_reminder'));
    expect(screen.getByRole('dialog', { name: r.familyOff.title.replace('{name}', words.lesson_reminder.name) })).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
  });

  it('an essential row OFF needs the typed word: disabled until it matches, then sends confirmText', async () => {
    renderRules({ apiFetch });
    const row = await findRow('report_ready');
    fireEvent.click(switchOf(row, 'report_ready'));
    const dialog = screen.getByRole('dialog', { name: r.essentialOff.title.replace('{name}', words.report_ready.name) });
    const input = within(dialog).getByLabelText(r.essentialOff.label.replace('{word}', ESSENTIAL_OFF_TEXT));
    expect(input.getAttribute('aria-describedby')).toBeTruthy();
    const yes = within(dialog).getByRole('button', { name: r.essentialOff.yes }) as HTMLButtonElement;
    expect(yes.disabled).toBe(true);
    fireEvent.change(input, { target: { value: 'ايقاف' } });
    expect(yes.disabled).toBe(true);
    fireEvent.change(input, { target: { value: ESSENTIAL_OFF_TEXT } });
    expect(yes.disabled).toBe(false);
    apiSend.mockRejectedValueOnce(new ApiError(428, { message: 'confirmation_required' }));
    fireEvent.click(yes);
    expect(await within(dialog).findByText(r.errors.confirmation_required.replace('{word}', ESSENTIAL_OFF_TEXT))).toBeTruthy();
    apiSend.mockResolvedValue(undefined);
    fireEvent.click(yes);
    await waitFor(() =>
      expect(apiSend).toHaveBeenLastCalledWith('PATCH', '/admin/notifications/report_ready', { enabled: false, confirmText: ESSENTIAL_OFF_TEXT }),
    );
    await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull());
  });

  it('a teacher-facing row switches at once (no dialog)', async () => {
    renderRules({ apiFetch });
    await findRow('lesson_reminder');
    openTab(t.notificationCatalogue.audience.teacher);
    const row = await findRow('teacher_new_student');
    apiSend.mockResolvedValue(undefined);
    fireEvent.click(switchOf(row, 'teacher_new_student'));
    expect(screen.queryByRole('dialog')).toBeNull();
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PATCH', '/admin/notifications/teacher_new_student', { enabled: false }));
  });

  it('a locked row says «لا يمكن إيقافه» and has no switch', async () => {
    renderRules({ apiFetch });
    await findRow('lesson_reminder');
    openTab(t.notificationCatalogue.audience.staff);
    const row = await findRow('reminder_failed');
    expect(within(row).getByText(r.locked)).toBeTruthy();
    expect(within(row).queryByRole('switch')).toBeNull();
  });
});
