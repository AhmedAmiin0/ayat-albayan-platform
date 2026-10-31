import { permissionGroups, type Permission } from '@ab/shared';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { PermissionMatrix } from './PermissionMatrix';

const group = permissionGroups().find((g) => g.keys.length > 1);
if (!group) throw new Error('a permission area with two keys');
const areas: Record<string, string> = t.permissions.areas;
const selectAll = () =>
  screen.getByLabelText<HTMLInputElement>(
    `${t.permissions.page.selectAll}: ${areas[group.area] ?? group.area}`,
  );

function show(value: readonly Permission[]) {
  return <PermissionMatrix value={value} onToggle={vi.fn()} onToggleGroup={vi.fn()} />;
}

describe('PermissionMatrix «تحديد الكل»', () => {
  it('is indeterminate while only part of the area is held, and follows the value', () => {
    const view = render(show([group.keys[0] as Permission]));
    expect(selectAll().indeterminate).toBe(true);
    expect(selectAll().checked).toBe(false);
    view.rerender(show(group.keys));
    expect(selectAll().indeterminate).toBe(false);
    expect(selectAll().checked).toBe(true);
    view.rerender(show([]));
    expect(selectAll().indeterminate).toBe(false);
    expect(selectAll().checked).toBe(false);
  });
});
