import type { MaintenanceView } from '@ab/client-core';
import type { AnyRouter } from '@tanstack/react-router';
import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { MaintenanceGate } from './MaintenanceGate';

const state: { view: MaintenanceView; checking: boolean } = vi.hoisted(() => ({
  view: 'open',
  checking: false,
}));
const retry = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/boot/maintenance/use-maintenance', () => ({
  useMaintenance: () => ({ view: state.view, checking: state.checking, retry }),
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

  it('the cover retries through the watch and says when it is checking', () => {
    state.view = 'down';
    state.checking = false;
    const { rerender } = draw();
    fireEvent.click(screen.getByRole('button', { name: t.maintenance.retry }));
    expect(retry).toHaveBeenCalledTimes(1);
    state.checking = true;
    rerender(
      <MaintenanceGate router={router}>
        <textarea aria-label="draft" defaultValue="unsaved" />
      </MaintenanceGate>,
    );
    const busy = screen.getByRole('button', { name: t.maintenance.checking });
    expect(busy.getAttribute('aria-busy')).toBe('true');
  });
});
