import { createColumnHelper } from '@tanstack/react-table';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DataTable, type DataTableFeatures } from './DataTable';
import { TableBox, tableBoxClass } from './TableBox';

type Row = { id: string; name: string };
const col = createColumnHelper<DataTableFeatures, Row>();
const columns = col.columns([col.accessor('name', { header: () => 'name' })]);

describe('TableBox (a fixed-height table box)', () => {
  it('takes the rest of the frame, never under 320px, and scrolls inside on both axes', () => {
    for (const cls of ['h-0', 'flex-auto', 'min-h-[320px]', 'overflow-auto']) expect(tableBoxClass.split(' ')).toContain(cls);
  });

  it('on phones (stacked card rows) it flows with the page: no scroll box inside the scrolling page', () => {
    for (const cls of ['max-sm:h-auto', 'max-sm:min-h-0', 'max-sm:overflow-visible']) expect(tableBoxClass.split(' ')).toContain(cls);
  });

  it('centres an empty state in the box', () => {
    render(<TableBox center>لا شيء</TableBox>);
    const box = screen.getByText('لا شيء');
    expect(box.className).toContain('justify-center');
    expect(box.hasAttribute('data-table-box')).toBe(true);
  });

  it('DataTable fill wraps the table in the box; without it the table flows as before', () => {
    const { container, rerender } = render(<DataTable fill columns={columns} data={[{ id: '1', name: 'سارة' }]} />);
    expect(container.querySelector('[data-table-box]')?.className).toContain('min-h-[320px]');
    rerender(<DataTable columns={columns} data={[{ id: '1', name: 'سارة' }]} />);
    expect(container.querySelector('[data-table-box]')).toBeNull();
  });

  it('an empty filled table stretches its one row over the box, so the note sits in the middle', () => {
    const { container } = render(<DataTable fill columns={columns} data={[]} emptyText="لا نتائج" />);
    expect(container.querySelector('table')?.className).toContain('h-full');
    expect(screen.getByText('لا نتائج')).toBeTruthy();
  });
});
