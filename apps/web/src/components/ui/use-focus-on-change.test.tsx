import { render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { describe, expect, it } from 'vitest';
import { useFocusOnChange } from './use-focus-on-change';

function Panel({ step }: { step: string }) {
  const ref = useRef<HTMLElement>(null);
  useFocusOnChange(ref, step);
  return (
    <>
      <button type="button">outside</button>
      <section ref={ref} tabIndex={-1} aria-label={step}>
        {step}
      </section>
    </>
  );
}

describe('useFocusOnChange', () => {
  it('leaves focus alone on the first render, then moves it to the panel on every change', () => {
    const { rerender } = render(<Panel step="a" />);
    screen.getByRole('button', { name: 'outside' }).focus();
    rerender(<Panel step="a" />);
    expect(document.activeElement).toBe(screen.getByRole('button', { name: 'outside' }));
    rerender(<Panel step="b" />);
    expect(document.activeElement).toBe(screen.getByRole('region', { name: 'b' }));
  });
});
