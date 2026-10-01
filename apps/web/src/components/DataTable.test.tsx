import { createColumnHelper } from '@tanstack/react-table';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { DataTable, type DataTableFeatures } from './DataTable';

type Row = {
  id: string;
  code: string;
  name: string;
};

const col = createColumnHelper<DataTableFeatures, Row>();
const columns = col.columns([
  col.accessor('code', { header: () => t.students.code }),
  col.accessor('name', { header: () => t.students.name, cell: (c) => <b>{c.getValue()}</b> }),
]);
const DATA: Row[] = [
  { id: 's1', code: 'AB-0183', name: 'سهيلة' },
  { id: 's2', code: 'AB-0184', name: 'جودي' },
];

describe('DataTable', () => {
  it('renders headers from i18n and one row per item', () => {
    render(<DataTable columns={columns} data={DATA} getRowId={(r) => r.id} />);
    expect(screen.getByRole('columnheader', { name: t.students.code })).toBeTruthy();
    expect(screen.getAllByRole('row')).toHaveLength(3);
    expect(screen.getByText('سهيلة').tagName).toBe('B');
  });

  it('shows the Arabic empty state', () => {
    render(<DataTable columns={columns} data={[]} />);
    expect(screen.getByText(t.common.empty)).toBeTruthy();
  });

  it('calls onRowClick with the original row', () => {
    const onRowClick = vi.fn();
    render(<DataTable columns={columns} data={DATA} onRowClick={onRowClick} />);
    fireEvent.click(screen.getByText('جودي'));
    expect(onRowClick).toHaveBeenCalledWith(DATA[1]);
  });
});
