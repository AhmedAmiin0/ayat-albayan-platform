import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { PlayerButtons } from './PlayerButtons';

const P = t.audioPlayer;
const controls = () => ({
  toggle: vi.fn(),
  skip: vi.fn(),
  setSpeed: vi.fn(),
  seek: vi.fn(),
  startOver: vi.fn(),
});

describe('PlayerButtons', () => {
  it('skips back and forward ten seconds and toggles the play', () => {
    const c = controls();
    render(<PlayerButtons controls={c} speed={1} playing={false} />);
    fireEvent.click(screen.getByRole('button', { name: P.back }));
    fireEvent.click(screen.getByRole('button', { name: P.forward }));
    fireEvent.click(screen.getByRole('button', { name: P.play }));
    expect(c.skip.mock.calls).toEqual([[-1], [1]]);
    expect(c.toggle).toHaveBeenCalledOnce();
  });

  it('while playing the button is named pause and the play face is hidden', () => {
    render(<PlayerButtons controls={controls()} speed={1} playing />);
    const button = screen.getByRole('button', { name: P.pause });
    const hidden = button.querySelector(':scope > span > span[aria-hidden="true"]');
    expect(hidden?.textContent).toBe(P.play);
    expect(hidden?.className).toContain('opacity-0');
  });

  it('shows the current speed checked and reports a new speed as a number', () => {
    const c = controls();
    render(<PlayerButtons controls={c} speed={1.5} playing={false} />);
    expect(screen.getByRole<HTMLInputElement>('radio', { name: '1.5×' }).checked).toBe(true);
    fireEvent.click(screen.getByRole('radio', { name: '2×' }));
    expect(c.setSpeed).toHaveBeenCalledWith(2);
  });

  it('two players name their speed groups apart', () => {
    render(<PlayerButtons controls={controls()} speed={1} playing={false} />);
    render(<PlayerButtons controls={controls()} speed={1} playing={false} />);
    const [a, b] = screen.getAllByRole<HTMLInputElement>('radio', { name: '1×' });
    expect(a?.name).toMatch(/^speed-/);
    expect(a?.name).not.toBe(b?.name);
  });
});
