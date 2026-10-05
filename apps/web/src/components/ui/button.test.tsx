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

  it('secondary carries the 3:1 input border, also as a <Link> class (no transparent border to win)', () => {
    const cls = buttonVariants({ variant: 'secondary' }).split(' ');
    expect(cls).toContain('border-input');
    expect(cls).not.toContain('border-transparent');
  });

  it.each(['sm', 'md'] as const)('size %s is 44px tall on phones (touch floor)', (size) => {
    expect(buttonVariants({ size }).split(' ')).toContain('min-h-11');
  });

  it('danger fills with the solid cinnabar, danger-quiet only outlines', () => {
    expect(buttonVariants({ variant: 'danger' })).toContain('bg-destructive-solid');
    expect(buttonVariants({ variant: 'danger-quiet' })).toContain('border-destructive/45');
  });

  it('is green and white: no gold edge or saffron on any variant (Fresh Green)', () => {
    expect(buttonVariants({ variant: 'primary' }).split(' ')).toContain('border-transparent');
    const all = ['primary', 'secondary', 'ghost', 'danger', 'danger-quiet'] as const;
    for (const variant of all) expect(buttonVariants({ variant })).not.toMatch(/-(gold|act)\b/);
  });

  it('ghost uses the link-green text token, not the fill', () => {
    expect(buttonVariants({ variant: 'ghost' }).split(' ')).toContain('text-lapis');
  });

  it('renders a native button and forwards props', () => {
    render(<Button disabled>حفظ</Button>);
    expect(screen.getByRole('button', { name: 'حفظ' })).toHaveProperty('disabled', true);
  });
});
