import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { Toast } from './toast';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('Toast', () => {
  it('is a status message that dismisses itself after 5s', () => {
    const onDismiss = vi.fn();
    render(<Toast message={t.students.created} onDismiss={onDismiss} />);
    expect(screen.getByRole('status').textContent).toBe(t.students.created);
    act(() => vi.advanceTimersByTime(4999));
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onDismiss).toHaveBeenCalledOnce();
  });

  it('stays while hovered and runs its action', () => {
    const onDismiss = vi.fn();
    const onClick = vi.fn();
    render(<Toast message={t.common.error} tone="error" onDismiss={onDismiss} action={{ label: t.common.back, onClick }} />);
    fireEvent.mouseEnter(screen.getByRole('status'));
    act(() => vi.advanceTimersByTime(10_000));
    expect(onDismiss).not.toHaveBeenCalled();
    fireEvent.click(screen.getByRole('button', { name: t.common.back }));
    expect(onClick).toHaveBeenCalledOnce();
  });
});
