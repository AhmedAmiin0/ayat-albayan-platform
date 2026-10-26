import { act, fireEvent, screen, within } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { useBelowShell } from '@/components/ui/layout/use-narrow';
import { ABRAR } from '@/features/teaching/booking/wizard-fixture';
import { t } from '@/lib/i18n/i18n';
import { thread } from '../testing/inbox-fixture';
import { InboxModeContext } from '../shared/mode';
import { renderWithClient, routeFetch } from '../testing/test-utils';
import { SalesChatFrame } from './SalesChatFrame';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@tanstack/react-router', async () => ({ Link: (await import('../testing/test-utils')).MockLink }));
vi.mock('@/features/people/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: [], can: () => true }) }));

/** A real 900px media query: the change event flips useBelowShell, like a window resize. */
function stubMedia() {
  const listeners = new Set<() => void>();
  const media = { narrow: false };
  vi.stubGlobal('matchMedia', (q: string) => ({
    get matches() {
      return q.includes('56.24rem') && media.narrow;
    },
    addEventListener: (_: string, fn: () => void) => listeners.add(fn),
    removeEventListener: (_: string, fn: () => void) => listeners.delete(fn),
  }));
  return (narrow: boolean) =>
    act(() => {
      media.narrow = narrow;
      for (const fn of listeners) fn();
    });
}

/** ThreadPane's switch: the phone header and the wide header put the buttons in different trees. */
function Pane() {
  const narrow = useBelowShell();
  return (
    <SalesChatFrame thread={thread()} compact={narrow}>
      {(actions: ReactNode) => (narrow ? <header>{actions}</header> : <section><div>{actions}</div></section>)}
    </SalesChatFrame>
  );
}

afterEach(() => {
  vi.unstubAllGlobals();
  apiFetch.mockReset();
});

describe('SalesChatFrame on a lead chat: crossing 900px keeps its dialogs (round 2 B)', () => {
  it('«تسجيل طالب جديد» with a typed name and the registration check both stay open', async () => {
    const resize = stubMedia();
    routeFetch(apiFetch, [
      ['/settings', {}],
      ['/sales/booking/teachers', [ABRAR]],
      ['/sales/registration-check', { found: false, more: false, matches: [] }],
    ]);
    renderWithClient(
      <InboxModeContext.Provider value="sales">
        <Pane />
      </InboxModeContext.Provider>,
    );
    fireEvent.click(screen.getByRole('button', { name: t.inbox.registerNew }));
    const register = screen.getByRole('dialog', { name: t.inbox.registerNew });
    const name = within(register).getByRole<HTMLInputElement>('textbox', { name: (n) => n.startsWith(t.guardians.name) });
    fireEvent.change(name, { target: { value: 'أم جود' } });
    fireEvent.click(screen.getByRole('button', { name: t.common.more }));
    fireEvent.click(screen.getByRole('button', { name: t.registrationCheck.action }));
    const check = screen.getByRole('dialog', { name: t.registrationCheck.title });

    resize(true);
    expect(screen.getByRole('dialog', { name: t.inbox.registerNew })).toBe(register);
    expect(screen.getByRole('dialog', { name: t.registrationCheck.title })).toBe(check);
    expect(name.value).toBe('أم جود');
    // The phone header got the icon button (no visible text).
    expect(screen.getByRole('button', { name: t.inbox.registerNew }).textContent).toBe('');

    resize(false);
    expect(screen.getByRole('dialog', { name: t.inbox.registerNew })).toBe(register);
    expect(screen.getByRole('dialog', { name: t.registrationCheck.title })).toBe(check);
  });
});
