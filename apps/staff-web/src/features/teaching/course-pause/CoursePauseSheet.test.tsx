import { coursePausePreviewText } from '@ab/client-core';
import { addDays, daysBefore, riyadhToday } from '@ab/shared';
import { fireEvent, screen, within } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { CoursePauseSheet } from './CoursePauseSheet';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const today = riyadhToday();
const words = t.coursePause;

function open() {
  // The preview counts 2 lessons with an until, 5 open-ended.
  apiFetch.mockImplementation(async (path: string) => ({ from_date: today, until_date: null, lessons: path.includes('until=') ? 2 : 5 }));
  const onDone = vi.fn();
  renderWithClient(<CoursePauseSheet studentId="s1" onClose={vi.fn()} onDone={onDone} />);
  const dialog = within(screen.getByRole('dialog', { name: words.title }));
  const set = (label: string, value: string) => fireEvent.change(dialog.getByLabelText(label), { target: { value } });
  const confirm = () => dialog.getByRole('button', { name: words.confirm }) as HTMLButtonElement;
  return { dialog, set, confirm, onDone };
}

describe('CoursePauseSheet', () => {
  beforeEach(() => {
    apiFetch.mockReset();
    apiSend.mockReset();
  });

  it('starts today, open-ended; the preview line follows the dates; the no-message note', async () => {
    const { dialog, set } = open();
    expect((dialog.getByLabelText(words.from) as HTMLInputElement).value).toBe(today);
    expect(dialog.getByLabelText(words.from).getAttribute('min')).toBe(today);
    expect(await dialog.findByText(coursePausePreviewText(words.preview, 5))).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith(`/students/s1/course-pause/preview?from=${today}`);
    set(words.until, addDays(today, 7));
    expect(await dialog.findByText(words.preview.two)).toBeTruthy();
    expect(dialog.getByText(words.noMessage)).toBeTruthy();
  });

  it('a past start or an end before the start is blocked before sending', async () => {
    const { dialog, set, confirm } = open();
    set(words.from, daysBefore(today, 1));
    expect(dialog.getByText(words.errors.date_in_past)).toBeTruthy();
    expect(confirm().disabled).toBe(true);
    set(words.from, addDays(today, 5));
    set(words.until, addDays(today, 2));
    expect(dialog.getByText(words.errors.invalid_range)).toBeTruthy();
    expect(confirm().disabled).toBe(true);
    expect(apiSend).not.toHaveBeenCalled();
  });

  it('submits the dates and the trimmed reason, then «أُوقفت الدورة مؤقتًا»', async () => {
    const { set, confirm, onDone } = open();
    set(words.until, addDays(today, 10));
    set(words.reason, '  سفر الأسرة ');
    apiSend.mockResolvedValue({ pause: {}, cancelled: 2, left: 0, reopened: 0, conflicts: 0 });
    fireEvent.click(confirm());
    await vi.waitFor(() => expect(onDone).toHaveBeenCalledWith(words.done));
    expect(apiSend).toHaveBeenCalledWith('POST', '/students/s1/course-pause', {
      fromDate: today,
      untilDate: addDays(today, 10),
      reason: 'سفر الأسرة',
    });
  });

  it('a 409 already_paused reads in Arabic and the sheet stays', async () => {
    const { dialog, confirm, onDone } = open();
    apiSend.mockRejectedValue(new ApiError(409, { code: 'already_paused' }));
    fireEvent.click(confirm());
    expect(await dialog.findByText(words.errors.already_paused)).toBeTruthy();
    expect(apiSend).toHaveBeenCalledWith('POST', '/students/s1/course-pause', { fromDate: today, untilDate: null });
    expect(onDone).not.toHaveBeenCalled();
  });
});
