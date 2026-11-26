import type { ThreadView } from '@ab/shared';
import { fireEvent, screen } from '@testing-library/react';
import { type Mock, vi } from 'vitest';
import { QuoteDialog } from '@/features/messaging/inbox/composer/quote/QuoteDialog';
import { thread } from '@/features/messaging/inbox/testing/inbox-fixture';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';

// Shared by the quote sheet's component tests (not app code).

/** The sheet over a Saudi chat inside its 24 h window, once the first offer shows. */
export async function showSheet(patch: Partial<ThreadView> = {}) {
  const done = { onClose: vi.fn(), onFilled: vi.fn() };
  const chat = thread({ phone_e164: '+966501234567', session_open: true, ...patch });
  const client = renderWithClient(<QuoteDialog thread={chat} {...done} />);
  await screen.findByTestId('quote-text');
  return { ...done, client };
}

export const button = (name: string) => screen.getByRole('button', { name });
export const press = (name: string) => fireEvent.click(button(name));
export const isPressed = (name: string) => button(name).getAttribute('aria-pressed') === 'true';
export const isOff = (name: string) => button(name).hasAttribute('disabled');
export const shownText = () => screen.getByTestId('quote-text').textContent;

/** Every request made to `route` (`/pricing/quote` or `/pricing/list`), oldest first. */
export function askedOf(apiFetch: Mock, route: string): string[] {
  const paths = apiFetch.mock.calls.map(([path]) => String(path));
  return paths.filter((path) => path.startsWith(`${route}?`));
}

/** The last request made to `route`; an empty string before the first. */
export const lastAsked = (apiFetch: Mock, route: string): string =>
  askedOf(apiFetch, route).at(-1) ?? '';

/** A request's query as an object, so a test does not depend on the parameters' order. */
export const queryOf = (path: string): Record<string, string> =>
  Object.fromEntries(new URL(path, 'http://api.test').searchParams);
