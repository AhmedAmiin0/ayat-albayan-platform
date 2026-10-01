import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button, buttonVariants } from './button';

describe('Button (docs/07 §6)', () => {
  it('defaults to the lapis primary at 40px', () => {
    const cls = buttonVariants();
    expect(cls).toContain('bg-primary');
    expect(cls).toContain('min-h-10');
  });

  it.each([
    ['sm', 'min-h-8'],
    ['md', 'min-h-10'],
    ['lg', 'min-h-12'],
  ] as const)('size %s → %s', (size, cls) => {
    expect(buttonVariants({ size })).toContain(cls);
  });

  it('secondary carries the 3:1 input border; outline is the same look', () => {
    expect(buttonVariants({ variant: 'secondary' })).toContain('border-input');
    expect(buttonVariants({ variant: 'outline' })).toBe(buttonVariants({ variant: 'secondary' }));
  });

  it('danger fills with the solid cinnabar, danger-quiet only outlines', () => {
    expect(buttonVariants({ variant: 'danger' })).toContain('bg-destructive-solid');
    expect(buttonVariants({ variant: 'danger-quiet' })).toContain('border-destructive/45');
  });

  it('never uses gold or saffron on a button', () => {
    const variants = ['primary', 'secondary', 'ghost', 'danger', 'danger-quiet'] as const;
    for (const variant of variants) expect(buttonVariants({ variant })).not.toMatch(/-(gold|act)\b/);
  });

  it('renders a native button and forwards props', () => {
    render(<Button disabled>حفظ</Button>);
    expect(screen.getByRole('button', { name: 'حفظ' })).toHaveProperty('disabled', true);
  });
});
