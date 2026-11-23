import type { MaintenanceView } from '@ab/client-core';
import type { AnyRouter } from '@tanstack/react-router';
import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '#/lib/i18n/i18n.ts';
import { MaintenanceGate } from './MaintenanceGate';

const state: { view: MaintenanceView } = vi.hoisted(() => ({ view: 'open' }));
vi.mock('#/boot/maintenance/use-maintenance.ts', () => ({
  useMaintenance: () => ({ view: state.view, checking: false, retry: vi.fn() }),
}));

const router = {} as AnyRouter;
const draw = () =>
  render(
    <MaintenanceGate router={router}>
      <textarea aria-label="draft" defaultValue="unsaved" />
    </MaintenanceGate>,
  );

describe('MaintenanceGate', () => {
  it('open: the app alone, not inert', () => {
    state.view = 'open';
    draw();
    expect(screen.getByLabelText('draft').closest('[inert]')).toBeNull();
    expect(screen.queryByText(t.maintenance.planned.title)).toBeNull();
  });

  it.each([
    { view: 'maintenance', title: t.maintenance.planned.title },
    { view: 'down', title: t.maintenance.outage.title },
  ] as const)('$view: the app stays mounted but inert, the screen on top', ({ view, title }) => {
    state.view = view;
    const { container } = draw();
    expect(container.querySelector('textarea')?.value).toBe('unsaved');
    expect(container.querySelector('textarea')?.closest('[inert]')).not.toBeNull();
    expect(screen.getByText(title)).toBeTruthy();
  });
});
