import { fireEvent, screen, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { renderRoute } from '#/boot/route-states/tests/render-route.tsx';
import { NOT_FOUND_WORDS } from '#/boot/route-states/tests/words.ts';
import { RouteNotFound } from './RouteNotFound';

describe('RouteNotFound', () => {
  it('names the missing page and leads home', async () => {
    const { router } = renderRoute(<RouteNotFound words={NOT_FOUND_WORDS} home="/home" />, '/x');
    const title = await screen.findByRole('heading', { name: NOT_FOUND_WORDS.title });
    expect(title).toBeTruthy();
    expect(screen.getByText(NOT_FOUND_WORDS.body)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: NOT_FOUND_WORDS.home }));
    await waitFor(() => expect(router.state.location.pathname).toBe('/home'));
  });
});
