import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Switch } from '@ab/web-kit/components/ui/toggle/Switch';

const WORDS = { on: 'مفعّل', off: 'متوقف' };

describe('Switch', () => {
  it('is a named switch that reports the next state', () => {
    const onCheckedChange = vi.fn();
    render(
      <Switch label="الرسائل" words={WORDS} checked={false} onCheckedChange={onCheckedChange} />,
    );
    const sw = screen.getByRole('switch', { name: 'الرسائل' });
    expect(sw).toHaveProperty('checked', false);
    expect(sw.getAttribute('aria-checked')).toBe('false');
    fireEvent.click(sw);
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('can be named by a row label instead of its own', () => {
    render(
      <>
        <span id="row">التذكيرات</span>
        <Switch labelledBy="row" words={WORDS} checked onCheckedChange={vi.fn()} />
      </>,
    );
    expect(screen.getByRole('switch', { name: 'التذكيرات' })).toBeTruthy();
  });

  it('prints the state as a word, not by colour alone, and hides it from the switch name', () => {
    const { rerender } = render(
      <Switch label="x" words={WORDS} checked onCheckedChange={vi.fn()} />,
    );
    const word = screen.getByText(WORDS.on);
    expect(word.getAttribute('aria-hidden')).toBe('true');
    rerender(<Switch label="x" words={WORDS} checked={false} onCheckedChange={vi.fn()} />);
    expect(screen.getByText(WORDS.off)).toBeTruthy();
  });

  it('is natively disabled, so the browser refuses presses and keys, and looks it', () => {
    const { container } = render(
      <Switch label="x" words={WORDS} checked disabled onCheckedChange={vi.fn()} />,
    );
    expect(screen.getByRole('switch')).toHaveProperty('disabled', true);
    expect(container.querySelector('input')?.className).toMatch(/disabled:cursor-not-allowed/);
  });

  it('has a 44 px hit area and a knob that slides to the inline end in RTL and LTR', () => {
    const { container } = render(
      <Switch label="x" words={WORDS} checked onCheckedChange={vi.fn()} />,
    );
    const hit = container.querySelector('[data-switch-hit]');
    expect(hit?.className).toMatch(/min-h-11/);
    expect(hit?.className).toMatch(/min-w-11/);
    const knob = container.querySelector('[data-switch-knob]');
    expect(knob?.className).toMatch(/rtl:peer-checked:-translate-x-5/);
    expect(knob?.className).toMatch(/ltr:peer-checked:translate-x-5/);
  });
});
