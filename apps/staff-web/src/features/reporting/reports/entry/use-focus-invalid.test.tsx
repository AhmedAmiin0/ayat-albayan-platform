import { render, screen } from '@testing-library/react';
import { useRef } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { useFocusInvalid } from './use-focus-invalid';

function Form({ problem }: { problem: string | null }) {
  const ref = useRef<HTMLDivElement>(null);
  useFocusInvalid(ref, problem);
  return (
    <div ref={ref}>
      <input aria-label="ok" />
      <fieldset aria-invalid="true">
        <input type="radio" aria-label="first" />
      </fieldset>
      <textarea aria-label="later" aria-invalid="true" />
    </div>
  );
}

describe('useFocusInvalid', () => {
  it('does nothing without a problem', () => {
    render(<Form problem={null} />);
    expect(document.activeElement).toBe(document.body);
  });

  it('focuses the first invalid field (a group → its first radio) and scrolls to it', () => {
    const scroll = vi.fn();
    Element.prototype.scrollIntoView = scroll;
    render(<Form problem="missing_grades" />);
    expect(document.activeElement).toBe(screen.getByLabelText('first'));
    expect(scroll).toHaveBeenCalledWith({ block: 'center' });
  });
});
