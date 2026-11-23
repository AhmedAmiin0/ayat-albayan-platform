import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { HighlightDiff } from './highlight-diff';

describe('HighlightDiff', () => {
  it('keeps the name in one run and wraps only the differing letter', () => {
    const { container } = render(<HighlightDiff text="سهيلة محمد" against="سهيله محمد" />);
    const run = container.firstElementChild as HTMLElement;
    expect(container.childElementCount).toBe(1);
    expect(run.textContent).toBe('سهيلة محمد');
    const marks = run.querySelectorAll('[data-diff]');
    expect([...marks].map((m) => m.textContent)).toEqual(['ة']);
    expect(marks[0]?.className).not.toMatch(/\b(p[xyse]?|m[xyse]?|border|bg)-/);
  });

  it('renders plain text when the names match', () => {
    const { container } = render(<HighlightDiff text="جودي" against="جودي" />);
    expect(container.querySelectorAll('[data-diff]')).toHaveLength(0);
    expect(container.textContent).toBe('جودي');
  });
});
