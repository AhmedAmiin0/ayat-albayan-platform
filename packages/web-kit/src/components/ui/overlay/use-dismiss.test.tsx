import { fireEvent, render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useDismiss } from './use-dismiss';

function Box({ open, onDismiss }: { open: boolean; onDismiss: () => void }) {
  const ref = useRef<HTMLDivElement>(null);
  useDismiss(ref, { open, onDismiss });
  return (
    <>
      <div ref={ref}>
        <button type="button">inside</button>
      </div>
      <button type="button">outside</button>
    </>
  );
}

describe('useDismiss', () => {
  it('dismisses on a pointerdown outside and on Esc, not on one inside', () => {
    const onDismiss = vi.fn();
    render(<Box open onDismiss={onDismiss} />);
    fireEvent.pointerDown(screen.getByText('inside'));
    expect(onDismiss).not.toHaveBeenCalled();
    fireEvent.pointerDown(screen.getByText('outside'));
    expect(onDismiss).toHaveBeenCalledTimes(1);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(onDismiss).toHaveBeenCalledTimes(2);
    fireEvent.keyDown(document, { key: 'Enter' });
    expect(onDismiss).toHaveBeenCalledTimes(2);
  });

  it('does not listen while closed, and stops listening once closed', () => {
    const onDismiss = vi.fn();
    const { rerender } = render(<Box open={false} onDismiss={onDismiss} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    rerender(<Box open onDismiss={onDismiss} />);
    rerender(<Box open={false} onDismiss={onDismiss} />);
    fireEvent.pointerDown(screen.getByText('outside'));
    expect(onDismiss).not.toHaveBeenCalled();
  });

  it('calls the latest onDismiss without re-subscribing', () => {
    const first = vi.fn();
    const second = vi.fn();
    const { rerender } = render(<Box open onDismiss={first} />);
    rerender(<Box open onDismiss={second} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(first).not.toHaveBeenCalled();
    expect(second).toHaveBeenCalledTimes(1);
  });
});
