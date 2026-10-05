import type { Permission } from '@ab/shared';
import { fireEvent, render, screen } from '@testing-library/react';
import { useState } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { PermissionMatrix } from './PermissionMatrix';

function Harness({ start = [], onChange = vi.fn() }: { start?: Permission[]; onChange?: (p: Permission[]) => void }) {
  const [value, setValue] = useState<Permission[]>(start);
  return <PermissionMatrix value={value} onChange={(p) => { setValue(p); onChange(p); }} />;
}
const cell = (module: 'leads' | 'students', action: 'view' | 'manage') => screen.getByRole('checkbox', { name: t.roles.perm[module][action] }) as HTMLInputElement;

describe('PermissionMatrix', () => {
  it('has a labelled checkbox for every permission cell, plus module, column and overall boxes', () => {
    render(<Harness />);
    expect(screen.getAllByRole('checkbox')).toHaveLength(23 * 2 + 23 + 2 + 1);
    expect(screen.getByRole('table')).toBeTruthy();
  });

  it('manage turns view on, view off turns manage off', () => {
    render(<Harness />);
    fireEvent.click(cell('leads', 'manage'));
    expect(cell('leads', 'view').checked).toBe(true);
    fireEvent.click(cell('leads', 'view'));
    expect(cell('leads', 'manage').checked).toBe(false);
  });

  it('the module box selects both cells and shows a mixed state for one', () => {
    render(<Harness />);
    const box = screen.getByRole('checkbox', { name: t.roles.matrix.selectModule.replace('{module}', t.roles.module.leads) }) as HTMLInputElement;
    fireEvent.click(cell('leads', 'view'));
    expect(box.indeterminate).toBe(true);
    fireEvent.click(box);
    expect(cell('leads', 'manage').checked).toBe(true);
    expect(box.indeterminate).toBe(false);
    fireEvent.click(box);
    expect(cell('leads', 'view').checked).toBe(false);
  });

  it('the column and overall boxes select everything they cover', () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.click(screen.getByRole('checkbox', { name: t.roles.matrix.selectColumn.replace('{column}', t.roles.matrix.view) }));
    expect(cell('students', 'view').checked).toBe(true);
    expect(cell('students', 'manage').checked).toBe(false);
    fireEvent.click(screen.getByRole('checkbox', { name: t.roles.matrix.selectAll }));
    expect(onChange.mock.lastCall?.[0]).toHaveLength(46);
    expect(cell('students', 'manage').checked).toBe(true);
  });

  it('counts the granted cells', () => {
    render(<Harness start={['leads.view']} />);
    expect(screen.getByText(t.roles.matrix.selected.replace('{count}', '1').replace('{total}', '46'))).toBeTruthy();
  });

  it('is keyboard operable: a checkbox is focusable and Space-toggle is native', () => {
    render(<Harness />);
    const box = cell('leads', 'view');
    box.focus();
    expect(document.activeElement).toBe(box);
    expect(box.tabIndex).toBeGreaterThanOrEqual(0);
  });

  it('the wildcard shows everything granted and disables editing', () => {
    render(<Harness start={['*']} />);
    expect(cell('students', 'manage').checked).toBe(true);
    expect(cell('students', 'manage').disabled).toBe(true);
    expect(screen.getByText(t.roles.matrix.wildcardHint)).toBeTruthy();
  });
});
