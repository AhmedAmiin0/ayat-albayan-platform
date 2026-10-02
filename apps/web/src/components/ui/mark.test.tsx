import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { Logo, Mark } from './mark';

describe('Mark (the academy emblem, docs/07 §11)', () => {
  it('32px and below shows the Mushaf crop, larger sizes the full emblem', () => {
    const { container, rerender } = render(<Mark size={32} />);
    const img = () => container.querySelector('img') as HTMLImageElement;
    expect(img().dataset['mark']).toBe('small');
    expect(img().getAttribute('src')).toMatch(/brand\/mark-small\.png$/);
    rerender(<Mark size={33} />);
    expect(img().dataset['mark']).toBe('large');
    expect(img().getAttribute('src')).toMatch(/brand\/mark\.png$/);
  });

  it('labelled is an image named «آيات البيان»', () => {
    render(<Mark size={42} labelled />);
    expect(screen.getByRole('img', { name: t.app.brand }).dataset['mark']).toBe('large');
  });

  it('decorative by default: out of the accessibility tree', () => {
    const { container } = render(<Mark />);
    expect(screen.queryByRole('img')).toBeNull();
    expect(container.querySelector('img')?.getAttribute('alt')).toBe('');
  });

  it('sizes a square box and contains the emblem, so callers can resize it by class', () => {
    const { container } = render(<Mark size={64} className="size-16" />);
    const img = container.querySelector('img') as HTMLImageElement;
    expect([img.width, img.height]).toEqual([64, 64]);
    expect(img.className).toContain('object-contain');
    expect(img.className).toContain('size-16');
  });
});

describe('Logo', () => {
  it('pairs the decorative mark with the live wordmark', () => {
    render(<Logo />);
    expect(screen.getByText(t.app.brand)).toBeTruthy();
    expect(screen.getByText(t.app.academy)).toBeTruthy();
    expect(screen.queryByRole('img')).toBeNull();
  });
});
