import { act, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { UndoToast } from './UndoToast';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

describe('UndoToast', () => {
  it('goes after 10 s, but not while focus or the pointer is inside', () => {
    const onDismiss = vi.fn();
    render(<UndoToast message={t.settingsValues.saved} onUndo={vi.fn()} onDismiss={onDismiss} />);
    const undo = screen.getByRole('button', { name: t.settingsValues.undo });
    fireEvent.focus(undo);
    act(() => vi.advanceTimersByTime(20_000));
    expect(onDismiss).not.toHaveBeenCalled();
    fireEvent.blur(undo);
    const toast = screen.getByText(t.settingsValues.saved).closest('[data-undo-toast]') as HTMLElement;
    // Not a second live region: the page announces the save once.
    expect(screen.queryByRole('status')).toBeNull();
    fireEvent.mouseEnter(toast);
    act(() => vi.advanceTimersByTime(20_000));
    expect(onDismiss).not.toHaveBeenCalled();
    fireEvent.mouseLeave(toast);
    act(() => vi.advanceTimersByTime(9_999));
    expect(onDismiss).not.toHaveBeenCalled();
    act(() => vi.advanceTimersByTime(1));
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });

  it('«تراجع» calls onUndo', () => {
    const onUndo = vi.fn();
    render(<UndoToast message="x" onUndo={onUndo} onDismiss={vi.fn()} />);
    fireEvent.click(screen.getByRole('button', { name: t.settingsValues.undo }));
    expect(onUndo).toHaveBeenCalled();
    expect(screen.getByRole('button', { name: t.settingsValues.undo }).className).toContain('min-h-11');
  });
});
