import { createColumnHelper } from '@tanstack/react-table';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { DataTable, hamishMeta, type DataTableFeatures } from './DataTable';

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

  it('stacked: rows stack under 640px, head stays sr-only (not hidden); scroll box is relative', () => {
    const { container, rerender } = render(<DataTable columns={columns} data={DATA} />);
    const box = container.firstElementChild as HTMLElement;
    expect(box.className).toContain('relative');
    expect(box.className).not.toContain('max-sm:[&_tbody_tr]:flex');
    rerender(<DataTable stacked columns={columns} data={DATA} />);
    expect(box.className).toContain('max-sm:[&_tbody_tr]:flex');
    expect(box.className).toContain('max-sm:[&_thead]:sr-only');
    expect(screen.getAllByRole('row')).toHaveLength(3);
  });

  it('scopes header cells; meta className styles cells, headClassName the head', () => {
    const withMeta = col.columns([
      col.accessor('name', { header: () => t.students.name, meta: { className: 'text-ink-2' } }),
      col.accessor('code', { header: () => t.students.hamish, meta: hamishMeta }),
    ]);
    render(<DataTable columns={withMeta} data={DATA} />);
    const th = screen.getByRole('columnheader', { name: t.students.hamish });
    expect(th.getAttribute('scope')).toBe('col');
    expect(th.className).toContain('border-s-rule');
    expect(screen.getByText('AB-0183').className).toContain('@max-[940px]:hidden');
    // The head ink stays ink-3 in every column (cell classes never leak into <th>).
    for (const head of screen.getAllByRole('columnheader')) {
      expect(head.className).toContain('text-ink-3');
      expect(head.className).not.toContain('text-ink-2');
    }
    expect(screen.getByText('سهيلة').className).toContain('text-ink-2');
  });
});
