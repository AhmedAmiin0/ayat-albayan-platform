import { describe, expect, it } from 'vitest';
import { cn } from './utils';

describe('cn — our type-scale tokens are font sizes, not colours', () => {
  it.each(['2xs', 'body', 'h1', 'h2', 'h3', 'h4', 'display', 'hero'])('text-%s keeps the text colour', (size) => {
    expect(cn('bg-primary text-primary-foreground', `text-${size}`)).toBe(`bg-primary text-primary-foreground text-${size}`);
  });

  it('a colour after a size keeps the size (dialog description)', () => {
    expect(cn('text-body', 'text-ink-2')).toBe('text-body text-ink-2');
  });

  it('two sizes still merge to the last one', () => {
    expect(cn('text-sm', 'text-body')).toBe('text-body');
    expect(cn('text-h3', 'text-lg')).toBe('text-lg');
  });
});
