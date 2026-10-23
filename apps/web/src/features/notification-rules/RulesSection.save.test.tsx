import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { findRow, overview, renderRules } from './rules-test-kit';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', async (orig) => ({ ...(await orig<object>()), Link: (await import('@/features/inbox/test-utils')).MockLink }));
vi.mock('@/features/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: ['settings.read', 'notifications.manage'], can: () => true }) }));

const r = t.notificationRules;
const name = t.notificationCatalogue.entries.lesson_reminder.name;
const saveName = `${t.common.save}: ${name}`;

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('«الإشعارات»: a row saves on its own', () => {
  it('an edited lead time shows «لم يُحفظ: … بدلًا من …»; «حفظ» sends only the timing, then the toast', async () => {
    const onSaved = vi.fn();
    renderRules({ apiFetch, onSaved });
    const row = await findRow('lesson_reminder');
    const minutes = within(row).getByLabelText(r.timing.minutesLabel);
    expect((minutes as HTMLInputElement).value).toBe('60');
    expect(screen.queryByRole('button', { name: saveName })).toBeNull();
    fireEvent.change(minutes, { target: { value: '45' } });
    const unsaved = document.querySelector('[data-unsaved="lesson_reminder"]') as HTMLElement;
    expect(unsaved.textContent).toContain(r.timing.minutesText.replace('{n}', '45'));
    expect(unsaved.textContent).toContain(r.timing.minutesText.replace('{n}', '60'));
    const updated = overview().entries.find((e) => e.key === 'lesson_reminder');
    apiSend.mockResolvedValue(updated);
    fireEvent.click(screen.getByRole('button', { name: saveName }));
    await waitFor(() =>
      expect(apiSend).toHaveBeenCalledWith('PATCH', '/admin/notifications/lesson_reminder', { timing: { minutes_before: 45 } }),
    );
    await waitFor(() => expect(onSaved).toHaveBeenCalledWith(r.saved));
    expect(apiSend).toHaveBeenCalledTimes(1);
  });

  it('a number change sends only number_id; «تراجع» puts the row back and nothing is sent', async () => {
    renderRules({ apiFetch });
    const row = await findRow('lesson_reminder');
    const select = await within(row).findByLabelText(r.numberLabel.replace('{name}', name));
    await within(select).findByRole('option', { name: 'Spare line' });
    fireEvent.change(select, { target: { value: 'num-2' } });
    fireEvent.click(screen.getByRole('button', { name: `${r.undo}: ${name}` }));
    expect((select as HTMLSelectElement).value).toBe('');
    expect(document.querySelector('[data-unsaved="lesson_reminder"]')).toBeNull();
    fireEvent.change(select, { target: { value: 'num-2' } });
    apiSend.mockResolvedValue(undefined);
    fireEvent.click(screen.getByRole('button', { name: saveName }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PATCH', '/admin/notifications/lesson_reminder', { number_id: 'num-2' }));
  });

  it('out of bounds: the reason under the box, «حفظ» aria-disabled, nothing sent', async () => {
    renderRules({ apiFetch });
    const row = await findRow('lesson_reminder');
    const minutes = within(row).getByLabelText(r.timing.minutesLabel);
    fireEvent.change(minutes, { target: { value: '3' } });
    expect(within(row).getByText(r.errors.minutes)).toBeTruthy();
    expect(minutes.getAttribute('aria-invalid')).toBe('true');
    const save = screen.getByRole('button', { name: saveName });
    expect(save.getAttribute('aria-disabled')).toBe('true');
    fireEvent.click(save);
    expect(apiSend).not.toHaveBeenCalled();
  });

  it('a 422 from the server is said in words under the row; the edit stays', async () => {
    renderRules({ apiFetch });
    const row = await findRow('lesson_reminder');
    fireEvent.change(within(row).getByLabelText(r.timing.minutesLabel), { target: { value: '90' } });
    const { ApiError } = await import('@/lib/api');
    apiSend.mockRejectedValue(new ApiError(422, { message: 'invalid' }));
    fireEvent.click(screen.getByRole('button', { name: saveName }));
    expect(await screen.findByText(r.errors.invalid)).toBeTruthy();
    expect((within(row).getByLabelText(r.timing.minutesLabel) as HTMLInputElement).value).toBe('90');
  });
});
