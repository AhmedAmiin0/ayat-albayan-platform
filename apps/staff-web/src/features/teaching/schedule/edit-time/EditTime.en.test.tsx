import en from '@ab/shared/i18n/en.json';
import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { confirmLine, fakeNow, openEditTime, pick, SAVED, SCHEDULED } from './edit-time-fixture';
import { mockCall } from '@ab/testing/mock-call';

// The form in English (LTR): labels, the day chips, the before → after line and the toast.
vi.mock('@ab/web-kit/lib/i18n/i18n', async (orig) => ({ ...(await orig<object>()), t: en }));
vi.mock('@ab/web-kit/lib/i18n/locale', async (orig) => ({
  ...(await orig<object>()),
  locale: 'en',
}));
const mockApi = mockCall();
mockApi.onRead(async () => []);
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({
  ...(await orig<object>()),
  call: (request: unknown) => mockApi.call(request),
}));

const ARABIC = /[؀-ۿ]/;

describe('«عدّل الوقت» in English', () => {
  fakeNow();
  afterEach(() => mockApi.reset('write'));

  it('reads in English from the button to the toast, with → between old and new', async () => {
    mockApi.onWrite(() => ({ ...SAVED, notified: 1 }));
    const { onDone } = openEditTime(SCHEDULED);
    const form = screen.getByRole('region', { name: en.lessons.timeEdit.title });
    pick.day(/^Monday 5 October/);
    pick.time('18:00');
    pick.duration(60);
    expect(
      confirmLine(
        /Sunday 4 October 17:00 \(45 minutes\) → .*Monday 5 October 18:00 \(60 minutes\)/,
      ),
    ).toBeTruthy();
    expect(screen.getByLabelText(en.lessons.timeEdit.notify)).toBeTruthy();
    expect(form.textContent).not.toMatch(ARABIC);
    pick.save();
    await waitFor(() => expect(onDone).toHaveBeenCalledWith(en.lessons.timeEdit.savedNotified));
  });
});
