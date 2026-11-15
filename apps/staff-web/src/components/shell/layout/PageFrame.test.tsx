import { render } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { PageFrame, SCROLL } from './PageFrame';

describe('PageFrame', () => {
  it('the scroll box has 4px of inline room for a focus ring (2px outline + 2px offset), net zero layout', () => {
    expect(SCROLL).toContain('-mx-1');
    expect(SCROLL).toContain('px-1');
    expect(SCROLL).not.toMatch(/\b(?:ml|mr|pl|pr)-/);
  });

  it('the work page scrolls inside data-page-scroll, never the document', () => {
    const { container } = render(<PageFrame>x</PageFrame>);
    const box = container.querySelector('[data-page-scroll]');
    expect(box?.textContent).toBe('x');
    expect(box?.className).toContain('overflow-y-auto');
  });
});
