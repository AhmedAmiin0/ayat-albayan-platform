import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderRoute } from '@ab/web-kit/boot/route-states/tests/render-route';
import { ERROR_WORDS } from '@ab/web-kit/boot/route-states/tests/words';
import { RouteError } from './RouteError';

describe('RouteError', () => {
  it('shows the given words, never the raw error, with a retry and the way home', async () => {
    renderRoute(<RouteError words={ERROR_WORDS} home="/home" />);
    const alert = await screen.findByRole('alert');
    expect(alert.textContent).toContain(ERROR_WORDS.title);
    expect(alert.textContent).toContain(ERROR_WORDS.body);
    expect(screen.queryByText(/something went wrong/i)).toBeNull();
    expect(screen.getByRole('button', { name: ERROR_WORDS.retry })).toBeTruthy();
  });

  it('retry re-runs the route loads', async () => {
    const { router } = renderRoute(<RouteError words={ERROR_WORDS} home="/home" />);
    const invalidate = vi.spyOn(router, 'invalidate');
    fireEvent.click(await screen.findByRole('button', { name: ERROR_WORDS.retry }));
    expect(invalidate).toHaveBeenCalledTimes(1);
  });

  it('home goes to the given page', async () => {
    const { router } = renderRoute(<RouteError words={ERROR_WORDS} home="/home" />, '/x');
    fireEvent.click(await screen.findByRole('button', { name: ERROR_WORDS.home }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/home'));
  });
});
