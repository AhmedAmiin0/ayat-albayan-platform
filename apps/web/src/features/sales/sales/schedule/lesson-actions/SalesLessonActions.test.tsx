import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { scheduleLesson } from '@/features/sales/sales/academy.fixtures';
import { renderWithQuery } from '@/features/sales/sales/academy.test-utils';
import { SalesLessonDrawer } from '@/features/sales/sales/schedule/SalesLessonDrawer';

const apiSend = vi.hoisted(() => vi.fn());
const apiFetch = vi.hoisted(() => vi.fn());
const granted = vi.hoisted(() => ({ keys: [] as string[] }));
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiSend, apiFetch }));
vi.mock('@/features/people/auth/use-permissions', () => ({
  usePermissions: () => ({
    permissions: granted.keys,
    can: (p: string) => granted.keys.includes(p),
  }),
}));

const NOW = new Date('2026-10-12T14:00:00.000Z');
const a = t.sales.lessonActions;
// The owner's screenshot (2026-11-02): a confirmed trial, another family's, not over yet.
const TRIAL = scheduleLesson({ id: 'l-7', status: 'confirmed', trial: true });
const FREE = { starts_at: '2026-10-13T14:00:00.000Z', ends_at: '2026-10-13T14:30:00.000Z', conflicts: [] };

function open(lesson = TRIAL) {
  renderWithQuery(<SalesLessonDrawer lesson={lesson} now={NOW} onClose={vi.fn()} />);
  return screen.getByRole('dialog', { name: 'سهيلة' });
}

beforeEach(() => {
  granted.keys = ['lessons.cancel', 'lessons.reschedule'];
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  apiSend.mockReset();
  apiFetch.mockReset();
});

describe('the assistant\'s «تغيير الموعد» / «إلغاء الحلقة» in the /sales drawer (owner 2026-11-02)', () => {
  it('a confirmed trial with both keys: both actions, no «للاطلاع فقط»', () => {
    const drawer = open();
    expect(within(drawer).getByRole('button', { name: a.cancel })).toBeTruthy();
    expect(within(drawer).getByRole('button', { name: a.reschedule })).toBeTruthy();
    expect(within(drawer).queryByText(t.lessons.sheet.readOnly)).toBeNull();
  });

  it.each([
    ['no key', [], null],
    ['lessons.cancel only', ['lessons.cancel'], a.cancel],
    ['lessons.reschedule only', ['lessons.reschedule'], a.reschedule],
  ])('%s: only what the role holds', (_case, keys, shown) => {
    granted.keys = keys;
    const drawer = open();
    for (const label of [a.cancel, a.reschedule]) {
      expect(within(drawer).queryByRole('button', { name: label }) !== null).toBe(label === shown);
    }
    expect(within(drawer).queryByText(t.lessons.sheet.readOnly) !== null).toBe(shown === null);
  });

  it('an ended lesson: nothing but «للاطلاع فقط»', () => {
    const drawer = open({ ...TRIAL, ends_at: '2026-10-12T13:00:00.000Z' });
    expect(within(drawer).queryByRole('button', { name: a.cancel })).toBeNull();
    expect(within(drawer).getByText(t.lessons.sheet.readOnly)).toBeTruthy();
  });

  it('cancel: the admin\'s form (who cancelled, why), one lesson only, posted to her route', async () => {
    apiSend.mockResolvedValue({ id: 'l-7', status: 'excused' });
    const drawer = open();
    fireEvent.click(within(drawer).getByRole('button', { name: a.cancel }));
    expect(within(drawer).getByRole('radio', { name: t.lessons.scope.rule })).toHaveProperty('disabled', true);
    fireEvent.click(within(drawer).getByRole('radio', { name: t.lessons.by.student }));
    fireEvent.change(within(drawer).getByLabelText(t.lessons.reason), { target: { value: ' سفر ' } });
    fireEvent.click(within(drawer).getByRole('button', { name: t.lessons.cancelSubmit }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/sales/lessons/l-7/cancel', { by: 'student', reason: 'سفر' }));
    expect(await within(drawer).findByText(t.lessons.cancelled)).toBeTruthy();
  });

  it('reschedule: her scoped slots naming the lesson, then her move route', async () => {
    apiFetch.mockImplementation(async (path: string) =>
      path.includes('/slots') ? { teacher_tz: 'Africa/Cairo', step_min: 30, slots: [FREE] } : {});
    apiSend.mockResolvedValue({ id: 'new', starts_at: FREE.starts_at, status: 'scheduled' });
    const drawer = open();
    fireEvent.click(within(drawer).getByRole('button', { name: a.reschedule }));
    fireEvent.click(await within(drawer).findByRole('button', { name: /17:00/ }));
    const url = apiFetch.mock.calls.map((c) => String(c[0])).find((u) => u.includes('/slots')) ?? '';
    expect(url).toMatch(/^\/sales\/booking\/slots\?teacherId=tc1&.*studentIds=s1.*&lessonId=l-7/);
    fireEvent.click(within(drawer).getByRole('button', { name: t.lessons.rescheduleSubmit }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/sales/lessons/l-7/reschedule', { startsAt: FREE.starts_at }));
    expect(await within(drawer).findByText(t.lessons.rescheduled)).toBeTruthy();
  });
});
