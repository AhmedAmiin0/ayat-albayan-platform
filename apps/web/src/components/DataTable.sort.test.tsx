import { createColumnHelper } from '@tanstack/react-table';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { DataTable, type DataTableFeatures } from './DataTable';

type Row = { id: string; name: string; lessons: number };

const col = createColumnHelper<DataTableFeatures, Row>();
const columns = col.columns([
  col.accessor('name', { header: () => t.students.name, meta: { sortKey: 'name' } }),
  col.accessor('lessons', { header: () => t.students.code }),
  col.display({ id: 'actions', header: () => t.common.actions, cell: () => null }),
]);
const DATA: Row[] = [
  { id: 'a', name: 'هدى', lessons: 12 },
  { id: 'b', name: 'أحمد', lessons: 8 },
  { id: 'c', name: 'بلال', lessons: 28 },
];

const head = (name: string) => screen.getByRole('columnheader', { name });
const firstCells = () => screen.getAllByRole('row').slice(1).map((r) => r.querySelector('td')?.textContent);

describe('DataTable sort (server mode)', () => {
  it('only meta.sortKey columns get a button; aria-sort follows the sort prop', () => {
    const onChange = vi.fn();
    const { rerender } = render(<DataTable columns={columns} data={DATA} sort={{ onChange }} />);
    expect(head(t.students.name).getAttribute('aria-sort')).toBe('none');
    expect(head(t.students.code).getAttribute('aria-sort')).toBeNull();
    expect(screen.getAllByRole('button')).toHaveLength(1);

    rerender(<DataTable columns={columns} data={DATA} sort={{ key: 'name', onChange }} />);
    expect(head(t.students.name).getAttribute('aria-sort')).toBe('ascending');
    rerender(<DataTable columns={columns} data={DATA} sort={{ key: 'name', dir: 'desc', onChange }} />);
    expect(head(t.students.name).getAttribute('aria-sort')).toBe('descending');
    // Server rows keep the order they came in.
    expect(firstCells()).toEqual(['هدى', 'أحمد', 'بلال']);
  });

  it('a click reports the next step of asc → desc → none', () => {
    const onChange = vi.fn();
    const { rerender } = render(<DataTable columns={columns} data={DATA} sort={{ onChange }} />);
    const button = () => screen.getByRole('button', { name: t.students.name });
    fireEvent.click(button());
    expect(onChange).toHaveBeenLastCalledWith({ key: 'name', dir: 'asc' });
    rerender(<DataTable columns={columns} data={DATA} sort={{ key: 'name', onChange }} />);
    fireEvent.click(button());
    expect(onChange).toHaveBeenLastCalledWith({ key: 'name', dir: 'desc' });
    rerender(<DataTable columns={columns} data={DATA} sort={{ key: 'name', dir: 'desc', onChange }} />);
    fireEvent.click(button());
    expect(onChange).toHaveBeenLastCalledWith({});
  });

  it('the button carries the i18n hint', () => {
    render(<DataTable columns={columns} data={DATA} sort={{ key: 'name', onChange: vi.fn() }} />);
    expect(screen.getByRole('button', { name: t.students.name }).getAttribute('title')).toBe(t.table.sortAsc);
  });
});

describe('DataTable sort (clientSort)', () => {
  it('every accessor column sorts locally: asc → desc → none', () => {
    render(<DataTable clientSort columns={columns} data={DATA} getRowId={(r) => r.id} />);
    expect(head(t.common.actions).getAttribute('aria-sort')).toBeNull();
    const name = screen.getByRole('button', { name: t.students.name });
    fireEvent.click(name);
    expect(head(t.students.name).getAttribute('aria-sort')).toBe('ascending');
    expect(firstCells()).toEqual(['أحمد', 'بلال', 'هدى']);
    fireEvent.click(name);
    expect(head(t.students.name).getAttribute('aria-sort')).toBe('descending');
    expect(firstCells()).toEqual(['هدى', 'بلال', 'أحمد']);
    fireEvent.click(name);
    expect(head(t.students.name).getAttribute('aria-sort')).toBe('none');
    expect(firstCells()).toEqual(['هدى', 'أحمد', 'بلال']);
  });

  it('numbers sort numerically, ascending first; one column at a time', () => {
    render(<DataTable clientSort columns={columns} data={DATA} getRowId={(r) => r.id} />);
    fireEvent.click(screen.getByRole('button', { name: t.students.name }));
    fireEvent.click(screen.getByRole('button', { name: t.students.code }));
    expect(head(t.students.name).getAttribute('aria-sort')).toBe('none');
    expect(head(t.students.code).getAttribute('aria-sort')).toBe('ascending');
    expect(firstCells()).toEqual(['أحمد', 'هدى', 'بلال']);
  });

  it('without sort props no header is a button', () => {
    render(<DataTable columns={columns} data={DATA} />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    expect(head(t.students.name).getAttribute('aria-sort')).toBeNull();
  });
});
