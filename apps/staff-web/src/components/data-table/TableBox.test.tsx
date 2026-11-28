import { createColumnHelper } from '@tanstack/react-table';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { DataTable, type DataTableFeatures } from './DataTable';
import { TableBox, tableBoxClass } from './TableBox';

type Row = { id: string; name: string };
const col = createColumnHelper<DataTableFeatures, Row>();
const columns = col.columns([col.accessor('name', { header: () => 'name' })]);

describe('TableBox (a fixed-height table box)', () => {
  const classes = tableBoxClass.split(' ');
  const FILL = ['tall:h-0', 'tall:flex-auto', 'tall:min-h-60', 'tall:overflow-auto', 'tall:overscroll-contain'];

  it('on a tall window it takes the rest of the frame and scrolls inside on both axes', () => {
    for (const cls of FILL) expect(classes).toContain(cls);
  });

  it('below tall (phones, short windows) it flows with the page: no box inside the frame scroll', () => {
    const unconditional = classes.filter((c) => /^(?:overflow|min-h|h-0|max-h)/.test(c));
    expect(unconditional).toEqual([]);
  });

  it('centres an empty state in the box', () => {
    render(<TableBox center>لا شيء</TableBox>);
    const box = screen.getByText('لا شيء');
    expect(box.className).toContain('justify-center');
    expect(box.hasAttribute('data-table-box')).toBe(true);
  });

  it('a centred empty state is never a scroller', () => {
    render(<TableBox center>فارغ</TableBox>);
    const box = screen.getByText('فارغ');
    expect(box.className).toContain('tall:overflow-visible');
    expect(box.className).not.toContain('tall:overflow-auto');
  });

  it('DataTable fill wraps the table in the box; without it the table flows as before', () => {
    const { container, rerender } = render(<DataTable fill columns={columns} data={[{ id: '1', name: 'سارة' }]} />);
    expect(container.querySelector('[data-table-box]')?.className).toContain('tall:overflow-auto');
    rerender(<DataTable columns={columns} data={[{ id: '1', name: 'سارة' }]} />);
    expect(container.querySelector('[data-table-box]')).toBeNull();
  });

  it('an empty filled table stretches its one row over the box, so the note sits in the middle', () => {
    const { container } = render(<DataTable fill columns={columns} data={[]} emptyText="لا نتائج" />);
    expect(container.querySelector('table')?.className).toContain('h-full');
    expect(screen.getByText('لا نتائج')).toBeTruthy();
  });
});
