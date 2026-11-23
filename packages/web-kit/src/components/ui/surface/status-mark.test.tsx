import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { StatusMark } from './status-mark';

describe('StatusMark', () => {
  it.each([
    ['act', 'bg-act-soft'],
    ['bad', 'bg-danger-soft'],
  ] as const)('%s needs the family: a tinted pill', (tone, cls) => {
    render(<StatusMark tone={tone} label="word" />);
    expect(screen.getByText('word').className).toContain(cls);
  });

  it.each(['ok', 'neutral'] as const)('%s is passive: a dot and plain text', (tone) => {
    render(<StatusMark tone={tone} label="word" />);
    expect(screen.getByText('word').className).toContain('text-ink-2');
  });
});
