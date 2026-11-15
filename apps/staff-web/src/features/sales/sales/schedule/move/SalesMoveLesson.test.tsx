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
const slots = { teacher_tz: 'Africa/Cairo', step_min: 30, slots: [FREE] };

function open(lesson = TRIAL) {
  renderWithQuery(<SalesLessonDrawer lesson={lesson} now={NOW} onClose={vi.fn()} />);
  return screen.getByRole('dialog', { name: 'سهيلة' });
}

beforeEach(() => {
  granted.keys = ['lessons.reschedule'];
  vi.useFakeTimers({ toFake: ['Date'] });
  vi.setSystemTime(NOW);
  apiFetch.mockImplementation(async (path: string) => (path.includes('/slots') ? slots : {}));
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
  apiSend.mockReset();
  apiFetch.mockReset();
});

describe('the assistant\'s «تغيير الموعد» in the /sales drawer (owner 2026-11-02)', () => {
  it('with lessons.reschedule on an open lesson: the button, no «للاطلاع فقط»', () => {
    const drawer = open();
    expect(within(drawer).getByRole('button', { name: a.reschedule })).toBeTruthy();
    expect(within(drawer).queryByText(t.lessons.sheet.readOnly)).toBeNull();
  });

  it.each([
    ['without the key', [], TRIAL],
    ['on an ended lesson', ['lessons.reschedule'], { ...TRIAL, ends_at: '2026-10-12T13:00:00.000Z' }],
    // A running lesson stays read-only with «ادخل الحلقة» only (e2e sales-double-role).
    ['on a running lesson', ['lessons.reschedule'], {
      ...TRIAL, starts_at: '2026-10-12T13:45:00.000Z', ends_at: '2026-10-12T14:30:00.000Z',
    }],
  ])('hidden %s', (_case, keys, lesson) => {
    granted.keys = keys;
    const drawer = open(lesson);
    expect(within(drawer).queryByRole('button', { name: a.reschedule })).toBeNull();
    expect(within(drawer).getByText(t.lessons.sheet.readOnly)).toBeTruthy();
  });

  it('her scoped slots naming the lesson, then her move route, then «تم»', async () => {
    apiSend.mockResolvedValue({ id: 'new', starts_at: FREE.starts_at, status: 'scheduled' });
    const drawer = open();
    fireEvent.click(within(drawer).getByRole('button', { name: a.reschedule }));
    fireEvent.click(await within(drawer).findByRole('button', { name: /17:00/ }));
    const url = apiFetch.mock.calls.map((c) => String(c[0])).find((u) => u.includes('/slots')) ?? '';
    expect(url).toMatch(/^\/sales\/booking\/slots\?teacherId=tc1&.*studentIds=s1.*&lessonId=l-7/);
    fireEvent.click(within(drawer).getByRole('button', { name: t.lessons.rescheduleSubmit }));
    const body = { startsAt: FREE.starts_at };
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/sales/lessons/l-7/reschedule', body));
    expect(await within(drawer).findByText(t.lessons.rescheduled)).toBeTruthy();
  });

  it('the optional move reason goes in the body (docs/47)', async () => {
    apiSend.mockResolvedValue({ id: 'new', starts_at: FREE.starts_at, status: 'scheduled' });
    const drawer = open();
    fireEvent.click(within(drawer).getByRole('button', { name: a.reschedule }));
    fireEvent.click(await within(drawer).findByRole('button', { name: /17:00/ }));
    const field = within(drawer).getByLabelText(t.reschedule.reason);
    expect(within(drawer).getByText(t.reschedule.reasonHint)).toBeTruthy();
    fireEvent.change(field, { target: { value: ' سفر الأسرة ' } });
    fireEvent.click(within(drawer).getByRole('button', { name: t.lessons.rescheduleSubmit }));
    const body = { startsAt: FREE.starts_at, reason: 'سفر الأسرة' };
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/sales/lessons/l-7/reschedule', body));
  });
});
