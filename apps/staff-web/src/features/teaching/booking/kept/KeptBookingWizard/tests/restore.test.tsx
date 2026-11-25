import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { BookingPage } from '@/features/teaching/booking/BookingPage';
import { ABRAR, next, respond, STUDENT_ID } from '@/features/teaching/booking/wizard-fixture';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (importOriginal) => ({
  ...(await importOriginal<object>()),
  apiFetch,
}));
vi.mock('@tanstack/react-router', () => ({ Link: () => null }));

function open(onUnfinished = vi.fn()) {
  apiFetch.mockImplementation(respond);
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  const view = render(
    <QueryClientProvider client={client}>
      <BookingPage
        search={{ studentId: STUDENT_ID }}
        onOpenStudent={vi.fn()}
        onUnfinished={onUnfinished}
      />
    </QueryClientProvider>,
  );
  return { unmount: view.unmount, onUnfinished };
}

afterEach(() => {
  sessionStorage.clear();
  apiFetch.mockReset();
});

describe('the admin booking draft across a visit elsewhere (R-SCH-06)', () => {
  it('navigating away and back opens the wizard where it was left', async () => {
    const first = open();
    fireEvent.click(await screen.findByRole('checkbox', { name: /جود/ }));
    next();
    expect(
      await screen.findByRole('radio', { name: new RegExp(ABRAR.display_name_ar) }),
    ).toBeTruthy();
    expect(first.onUnfinished).toHaveBeenLastCalledWith(true);
    first.unmount();

    const back = open();
    expect(
      await screen.findByRole('radio', { name: new RegExp(ABRAR.display_name_ar) }),
    ).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: t.booking.back }));
    expect(await screen.findByRole('checkbox', { name: /جود/ })).toHaveProperty('checked', true);
    expect(back.onUnfinished).toHaveBeenLastCalledWith(true);
  });

  it('an untouched wizard keeps nothing and asks nothing', async () => {
    const { onUnfinished } = open();
    expect(await screen.findByRole('checkbox', { name: /جود/ })).toBeTruthy();
    expect(onUnfinished).toHaveBeenLastCalledWith(false);
    expect(sessionStorage.length).toBe(0);
  });
});
