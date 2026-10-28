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

  it('md and lg are 48px on phones like the app (docs/07 «الأزرار»); the dense sm keeps the 44px floor', () => {
    expect(buttonVariants({ size: 'md' }).split(' ')).toContain('min-h-12');
    expect(buttonVariants({ size: 'lg' }).split(' ')).toContain('min-h-12');
    expect(buttonVariants({ size: 'sm' }).split(' ')).toContain('min-h-11');
  });

  it('keeps every label on one line', () => {
    expect(buttonVariants().split(' ')).toContain('whitespace-nowrap');
  });

  it('danger fills with the solid cinnabar (confirm only), danger-quiet outlines label and edge in the bad tone', () => {
    expect(buttonVariants({ variant: 'danger' })).toContain('bg-destructive-solid');
    const quiet = buttonVariants({ variant: 'danger-quiet' }).split(' ');
    expect(quiet).toEqual(expect.arrayContaining(['text-destructive', 'border-destructive', 'enabled:hover:bg-danger-soft']));
  });

  it('is green and white: no gold edge or saffron on any variant (Fresh Green)', () => {
    expect(buttonVariants({ variant: 'primary' }).split(' ')).toContain('border-transparent');
    const all = ['primary', 'secondary', 'ghost', 'danger', 'danger-quiet'] as const;
    for (const variant of all) expect(buttonVariants({ variant })).not.toMatch(/-(gold|act)\b/);
  });

  it('presses in by 2% only when motion is welcome and the button is enabled', () => {
    expect(buttonVariants().split(' ')).toContain('motion-safe:active:not-disabled:scale-[0.98]');
  });

  it('ghost uses the link-green text token, not the fill', () => {
    expect(buttonVariants({ variant: 'ghost' }).split(' ')).toContain('text-lapis');
  });

  it('renders a native button and forwards props', () => {
    render(<Button disabled>حفظ</Button>);
    expect(screen.getByRole('button', { name: 'حفظ' })).toHaveProperty('disabled', true);
  });
});
