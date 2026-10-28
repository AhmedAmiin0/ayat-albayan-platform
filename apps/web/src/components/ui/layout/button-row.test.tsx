import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { Button } from '../form/button';
import { ButtonRow } from './button-row';

describe('ButtonRow (docs/07 «الأزرار»)', () => {
  it('gives every cell an equal share from a zero basis, never below its one-line label', () => {
    render(
      <ButtonRow label="الحلقة">
        <Button variant="secondary">تغيير الموعد</Button>
        <Button variant="danger-quiet">إلغاء الحلقة</Button>
      </ButtonRow>,
    );
    const row = screen.getByRole('group', { name: 'الحلقة' });
    expect(row.className.split(' ')).toEqual(expect.arrayContaining(['flex', 'flex-wrap', 'gap-2', '*:flex-[1_1_0]', '*:min-w-max']));
    expect(screen.getAllByRole('button')).toHaveLength(2);
  });

  it('is a plain row (no group role) without a label', () => {
    const { container } = render(
      <ButtonRow>
        <Button>حفظ</Button>
      </ButtonRow>,
    );
    expect(container.firstElementChild?.getAttribute('role')).toBeNull();
  });
});
