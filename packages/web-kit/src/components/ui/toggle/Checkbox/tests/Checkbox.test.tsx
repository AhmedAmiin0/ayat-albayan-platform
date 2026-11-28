import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { Checkbox } from '@ab/web-kit/components/ui/toggle/Checkbox';

describe('Checkbox', () => {
  it('is a checkbox named by its visible label; the whole label toggles it', () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox label="حضر" checked={false} onCheckedChange={onCheckedChange} />);
    expect(screen.getByRole('checkbox', { name: 'حضر' })).toHaveProperty('checked', false);
    fireEvent.click(screen.getByText('حضر'));
    expect(onCheckedChange).toHaveBeenCalledWith(true);
  });

  it('reports unticking', () => {
    const onCheckedChange = vi.fn();
    render(<Checkbox label="حضر" checked onCheckedChange={onCheckedChange} />);
    fireEvent.click(screen.getByRole('checkbox'));
    expect(onCheckedChange).toHaveBeenCalledWith(false);
  });

  it('is natively disabled, so the browser refuses presses and keys, and looks it', () => {
    const { container } = render(
      <Checkbox label="حضر" checked disabled onCheckedChange={vi.fn()} />,
    );
    expect(screen.getByRole('checkbox')).toHaveProperty('disabled', true);
    expect(container.querySelector('label')?.className).toMatch(/has-disabled:opacity-45/);
  });

  it('has a 44 px hit area and lays out by logical sides for RTL and LTR', () => {
    const { container } = render(<Checkbox label="x" checked onCheckedChange={vi.fn()} />);
    const label = container.querySelector('label');
    expect(label?.className).toMatch(/min-h-11/);
    expect(label?.className).not.toMatch(/\b(ml|mr|pl|pr|left|right)-/);
  });

  it('can carry a hint that describes the box', () => {
    render(<Checkbox label="حضر" hint="يحسب في الأجر" checked onCheckedChange={vi.fn()} />);
    const box = screen.getByRole('checkbox', { description: 'يحسب في الأجر' });
    expect(box).toBeTruthy();
  });
});
