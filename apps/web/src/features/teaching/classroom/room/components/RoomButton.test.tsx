import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { RoomButton } from './RoomButton';

describe('RoomButton', () => {
  it('keeps the words as the accessible name, visually hidden on phones, with a 44px floor', () => {
    render(<RoomButton icon="mic" label="Mic" on />);
    const btn = screen.getByRole('button', { name: 'Mic' });
    expect(btn.getAttribute('aria-pressed')).toBe('true');
    expect(btn.className).toContain('min-h-11');
    expect(btn.className).toContain('min-w-11');
    expect(screen.getByText('Mic').className).toContain('max-sm:sr-only');
    expect(btn.querySelector('svg[data-icon="mic"]')).toBeTruthy();
  });

  it('a plain action has no pressed state', () => {
    render(<RoomButton icon="people" label="People" />);
    expect(screen.getByRole('button', { name: 'People' }).hasAttribute('aria-pressed')).toBe(false);
  });
});
