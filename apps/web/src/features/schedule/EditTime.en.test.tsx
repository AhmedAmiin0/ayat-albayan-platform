import en from '@ab/shared/i18n/en.json';
import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fakeNow, openEditTime, pick, SAVED, SCHEDULED } from './edit-time-fixture';

// The form in English (LTR): labels, the day chips, the before → after line and the toast.
vi.mock('@/lib/i18n', async (orig) => ({ ...(await orig<object>()), t: en }));
vi.mock('@/lib/locale', async (orig) => ({ ...(await orig<object>()), locale: 'en' }));
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch: vi.fn(async () => []), apiSend }));

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
    expect(screen.getByText(/Sunday 4 October 17:00 \(45 minutes\) → .*Monday 5 October 18:00 \(60 minutes\)/)).toBeTruthy();
    expect(screen.getByLabelText(en.lessons.timeEdit.notify)).toBeTruthy();
    expect(form.textContent).not.toMatch(ARABIC);
    pick.save();
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(en.lessons.timeEdit.savedNotified));
  });
});
