import { cleanup, fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { scheduleLesson } from '../academy.fixtures';
import { renderWithQuery } from '../academy.test-utils';
import { canConfirmLesson } from './SalesConfirmLesson';
import { SalesLessonDrawer } from './SalesLessonDrawer';

const apiSend = vi.hoisted(() => vi.fn());
const granted = vi.hoisted(() => ({ confirm: true }));
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiSend }));
vi.mock('@/features/people/auth/use-permissions', () => ({
  usePermissions: () => ({ permissions: [], can: (p: string) => p === 'lessons.confirm' && granted.confirm }),
}));

const NOW = new Date('2026-10-12T14:00:00.000Z');
const a = t.sales.lessonActions;
// Another family's lesson (owner 2026-10-28: any lesson), scheduled, 15:00–15:30Z.
const LESSON = scheduleLesson({ id: 'l-9', status: 'scheduled' });

function open(lesson = LESSON) {
  renderWithQuery(<SalesLessonDrawer lesson={lesson} now={NOW} onClose={vi.fn()} />);
  return screen.getByRole('dialog', { name: 'سهيلة' });
}

beforeEach(() => {
  granted.confirm = true;
});
afterEach(() => {
  cleanup();
  apiSend.mockReset();
});

describe('sales «تأكيد الحلقة» in the lesson drawer', () => {
  it('scheduled, not ended, with lessons.confirm: confirms, then reads «مؤكدة»', async () => {
    apiSend.mockResolvedValue({ id: 'l-9', starts_at: LESSON.starts_at, status: 'confirmed' });
    const drawer = open();
    expect(within(drawer).queryByText(t.lessons.sheet.readOnly)).toBeNull();
    fireEvent.click(within(drawer).getByRole('button', { name: a.confirm }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/sales/lessons/l-9/confirm'));
    expect(await within(drawer).findByText(a.confirmed)).toBeTruthy();
    expect(within(drawer).getByText(t.enums.lessonStatus.confirmed)).toBeTruthy();
    expect(within(drawer).queryByRole('button', { name: a.confirm })).toBeNull();
  });

  it.each([
    ['a confirmed lesson', scheduleLesson({ status: 'confirmed' }), true],
    ['an ended lesson', { ...LESSON, ends_at: '2026-10-12T13:00:00.000Z' }, true],
    ['no lessons.confirm', LESSON, false],
  ])('hidden for %s (still «للاطلاع فقط»)', (_case, lesson, holds) => {
    granted.confirm = holds;
    const drawer = open(lesson);
    expect(within(drawer).queryByRole('button', { name: a.confirm })).toBeNull();
    expect(within(drawer).getByText(t.lessons.sheet.readOnly)).toBeTruthy();
  });

  it.each([
    ['lesson_ended', a.confirmEnded],
    ['invalid_transition', a.confirmInvalid],
  ])('a %s refusal reads in the confirm\'s words', async (code, text) => {
    apiSend.mockRejectedValue(new ApiError(409, { code }));
    const drawer = open();
    fireEvent.click(within(drawer).getByRole('button', { name: a.confirm }));
    expect(await within(drawer).findByText(text)).toBeTruthy();
    expect(within(drawer).queryByText(a.confirmed)).toBeNull();
  });

  it('canConfirmLesson: any scheduled lesson before its end, only with the key', () => {
    expect(canConfirmLesson(LESSON, { now: NOW, holds: true })).toBe(true);
    expect(canConfirmLesson(LESSON, { now: NOW, holds: false })).toBe(false);
    expect(canConfirmLesson(LESSON, { now: new Date(LESSON.ends_at), holds: true })).toBe(false);
  });
});
