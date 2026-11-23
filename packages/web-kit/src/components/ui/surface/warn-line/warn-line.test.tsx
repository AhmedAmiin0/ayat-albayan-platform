import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { WarnLine } from './warn-line';

describe('WarnLine', () => {
  it('a caution beside a choice: its text in a polite status, on the gold-soft rule', () => {
    render(<WarnLine message="خارج الأوقات" />);
    const line = screen.getByRole('status');
    expect(line.textContent).toBe('خارج الأوقات');
    expect(line.className).toContain('border-gold-soft');
  });
});
