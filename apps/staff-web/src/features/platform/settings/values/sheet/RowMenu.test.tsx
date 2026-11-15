import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RowMenu } from './RowMenu';

function setup() {
  const a = vi.fn();
  const b = vi.fn();
  render(
    <RowMenu
      label="خيارات"
      items={[
        { id: 'a', label: 'الأول', onSelect: a },
        { id: 'b', label: 'الثاني', detail: 'key_b', onSelect: b },
      ]}
    />,
  );
  return { a, b, trigger: screen.getByRole('button', { name: 'خيارات' }) };
}

describe('RowMenu', () => {
  it('opens on click with focus on the first item; arrows move, Home/End jump', () => {
    const { trigger } = setup();
    expect(trigger.getAttribute('aria-haspopup')).toBe('menu');
    fireEvent.click(trigger);
    expect(trigger.getAttribute('aria-expanded')).toBe('true');
    const items = screen.getAllByRole('menuitem');
    expect(document.activeElement).toBe(items[0]);
    fireEvent.keyDown(items[0] as HTMLElement, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items[1]);
    fireEvent.keyDown(items[1] as HTMLElement, { key: 'ArrowDown' });
    expect(document.activeElement).toBe(items[0]);
    fireEvent.keyDown(items[0] as HTMLElement, { key: 'End' });
    expect(document.activeElement).toBe(items[1]);
    expect(screen.getByText('key_b')).toBeTruthy();
  });

  it('ArrowDown on the button opens it; Esc closes and returns focus', () => {
    const { trigger } = setup();
    fireEvent.keyDown(trigger, { key: 'ArrowDown' });
    expect(screen.getByRole('menu')).toBeTruthy();
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).toBe(trigger);
  });

  it('a pick closes the menu and runs the item', () => {
    const { trigger, b } = setup();
    fireEvent.click(trigger);
    fireEvent.click(screen.getByRole('menuitem', { name: /الثاني/ }));
    expect(b).toHaveBeenCalled();
    expect(screen.queryByRole('menu')).toBeNull();
  });
});
