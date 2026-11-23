import { act, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '#/lib/i18n/i18n.ts';
import { ConnectionBar } from './ConnectionBar';

const words = t.mobile.connection;
let online = true;

const go = (next: boolean) =>
  act(() => {
    online = next;
    window.dispatchEvent(new Event(next ? 'online' : 'offline'));
  });

beforeEach(() => {
  online = true;
  vi.spyOn(navigator, 'onLine', 'get').mockImplementation(() => online);
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe('the chat connecting bar (S23 on the web)', () => {
  it('nothing online; «جارٍ الاتصال…» offline, the hint after 10 s, «تم الاتصال» then gone', () => {
    render(<ConnectionBar />);
    expect(screen.queryByRole('status')).toBeNull();
    go(false);
    expect(screen.getByRole('status').textContent).toBe(words.connecting);
    act(() => void vi.advanceTimersByTime(10_000));
    expect(screen.getByText(words.checkInternet)).toBeTruthy();
    go(true);
    expect(screen.getByRole('status').textContent).toBe(words.connected);
    act(() => void vi.advanceTimersByTime(2_000));
    expect(screen.queryByRole('status')).toBeNull();
  });
});
