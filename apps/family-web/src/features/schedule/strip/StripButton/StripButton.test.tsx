import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { StripButton } from './StripButton';

const S = t.portal.app.schedule;
const day = (count: number, today = false) => ({ day: '2026-11-28', today, count });

describe('StripButton', () => {
  it('a day with lessons names its count and jumps to it', () => {
    const onJump = vi.fn();
    render(<StripButton day={day(2)} selected={false} onJump={onJump} />);
    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-label')).not.toContain(S.noLessons);
    fireEvent.click(button);
    expect(onJump).toHaveBeenCalledWith('2026-11-28');
  });

  it('a day with no lessons says so and is off', () => {
    render(<StripButton day={day(0)} selected={false} onJump={vi.fn()} />);
    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-label')).toContain(S.noLessons);
    expect(button.hasAttribute('disabled')).toBe(true);
  });

  it('today is the current date and the chosen day is pressed', () => {
    render(<StripButton day={day(1, true)} selected onJump={vi.fn()} />);
    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-current')).toBe('date');
    expect(button.getAttribute('aria-pressed')).toBe('true');
  });

  it('another day is neither current nor pressed', () => {
    render(<StripButton day={day(1)} selected={false} onJump={vi.fn()} />);
    const button = screen.getByRole('button');
    expect(button.getAttribute('aria-current')).toBeNull();
    expect(button.getAttribute('aria-pressed')).toBe('false');
  });
});
