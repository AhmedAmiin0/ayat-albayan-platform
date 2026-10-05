import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { ListSkeleton, Skeleton } from './skeleton';

describe('Skeleton', () => {
  it('is a hidden shimmering bar', () => {
    const { container } = render(<Skeleton className="w-1/2" />);
    const bar = container.firstElementChild;
    expect(bar?.getAttribute('aria-hidden')).toBe('true');
    expect(bar?.className).toContain('animate-shimmer');
    expect(bar?.className).toContain('w-1/2');
  });
});

describe('ListSkeleton', () => {
  it('announces loading as a busy status and still says the words', () => {
    render(<ListSkeleton />);
    const status = screen.getByRole('status');
    expect(status.getAttribute('aria-busy')).toBe('true');
    expect(screen.getByText(t.common.loading)).toBeTruthy();
  });

  it('draws the asked number of rows', () => {
    const { container } = render(<ListSkeleton rows={6} label="x" />);
    expect(container.querySelectorAll('[role=status] > span[aria-hidden]')).toHaveLength(6);
  });
});
