import en from '@ab/shared/i18n/en.json';
import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { confirmLine, fakeNow, openEditTime, pick, SAVED, SCHEDULED } from './edit-time-fixture';

// The form in English (LTR): labels, the day chips, the before → after line and the toast.
vi.mock('@ab/web-kit/lib/i18n/i18n', async (orig) => ({ ...(await orig<object>()), t: en }));
vi.mock('@ab/web-kit/lib/i18n/locale', async (orig) => ({ ...(await orig<object>()), locale: 'en' }));
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch: vi.fn(async () => []), apiSend }));

const ARABIC = /[؀-ۿ]/;

describe('«عدّل الوقت» in English', () => {
  fakeNow();
  afterEach(() => apiSend.mockReset());

  it('reads in English from the button to the toast, with → between old and new', async () => {
    apiSend.mockResolvedValue({ ...SAVED, notified: 1 });
    const { onDone } = openEditTime(SCHEDULED);
    const form = screen.getByRole('region', { name: en.lessons.timeEdit.title });
    pick.day(/^Monday 5 October/);
    pick.time('18:00');
    pick.duration(60);
    expect(confirmLine(/Sunday 4 October 5:00 PM \(45 minutes\) → .*Monday 5 October 6:00 PM \(60 minutes\)/)).toBeTruthy();
    expect(screen.getByLabelText(en.lessons.timeEdit.notify)).toBeTruthy();
    expect(form.textContent).not.toMatch(ARABIC);
    pick.save();
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(en.lessons.timeEdit.savedNotified));
  });
});
