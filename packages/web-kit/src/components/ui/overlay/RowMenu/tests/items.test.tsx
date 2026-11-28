import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { RowMenu } from '@ab/web-kit/components/ui/overlay/RowMenu';

const open = (name: string) => fireEvent.click(screen.getByRole('button', { name }));

describe('RowMenu items', () => {
  it('no items: no button, so a row never shows an empty menu', () => {
    render(<RowMenu label="إجراءات الدفعة" items={[]} />);
    expect(screen.queryByRole('button')).toBeNull();
  });

  it('a danger item is told apart by more than colour: it is last and keeps its words', () => {
    const remove = vi.fn();
    render(
      <RowMenu
        label="إجراءات الدفعة"
        items={[
          { id: 'del', label: 'حذف', onSelect: remove, danger: true },
          { id: 'edit', label: 'تعديل', onSelect: vi.fn() },
        ]}
      />,
    );
    open('إجراءات الدفعة');
    const items = screen.getAllByRole('menuitem');
    expect(items.map((i) => i.textContent)).toEqual(['تعديل', 'حذف']);
    expect(items[1]?.className).toContain('text-danger');
    fireEvent.click(screen.getByRole('menuitem', { name: 'حذف' }));
    expect(remove).toHaveBeenCalledTimes(1);
  });

  it('Tab leaves the open menu without pulling focus back to the button', () => {
    render(<RowMenu label="خيارات" items={[{ id: 'a', label: 'عرض', onSelect: vi.fn() }]} />);
    open('خيارات');
    fireEvent.keyDown(screen.getByRole('menuitem', { name: 'عرض' }), { key: 'Tab' });
    expect(screen.queryByRole('menu')).toBeNull();
    expect(document.activeElement).not.toBe(screen.getByRole('button', { name: 'خيارات' }));
  });

  it('the button is a 44 px target on phones', () => {
    render(<RowMenu label="خيارات" items={[{ id: 'a', label: 'عرض', onSelect: vi.fn() }]} />);
    expect(screen.getByRole('button', { name: 'خيارات' }).className).toMatch(/size-11|min-h-11/);
  });
});
