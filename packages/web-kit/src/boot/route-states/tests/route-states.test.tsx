import {
  createMemoryHistory,
  createRootRoute,
  createRoute,
  createRouter,
  RouterProvider,
} from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { notFoundState, routeStates } from '@ab/web-kit/boot/route-states/route-states';
import { ERROR_WORDS, NOT_FOUND_WORDS } from './words';

function routerAt(path: string) {
  const root = createRootRoute();
  const boom = createRoute({
    getParentRoute: () => root,
    path: '/boom',
    component: () => {
      throw new Error('render failed');
    },
  });
  return createRouter({
    routeTree: root.addChildren([boom]),
    history: createMemoryHistory({ initialEntries: [path] }),
    ...routeStates({ words: ERROR_WORDS, home: '/' }),
    ...notFoundState({ words: NOT_FOUND_WORDS, home: '/' }),
  });
}

describe('routeStates and notFoundState (router defaults)', () => {
  it('a throwing route shows the error card with a retry', async () => {
    render(<RouterProvider router={routerAt('/boom')} />);
    expect((await screen.findByRole('alert')).textContent).toContain(ERROR_WORDS.title);
    expect(screen.getByRole('button', { name: ERROR_WORDS.retry })).toBeTruthy();
    expect(screen.queryByText('render failed')).toBeNull();
  });

  it('an unknown path shows not-found', async () => {
    render(<RouterProvider router={routerAt('/nowhere')} />);
    expect(await screen.findByRole('heading', { name: NOT_FOUND_WORDS.title })).toBeTruthy();
  });
});
