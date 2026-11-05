import { fireEvent, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { ALL, renderActions } from './people-edit.test-kit';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const E = t.peopleEdit;

describe('PeopleEditActions (owner 2026-11-02)', () => {
  it('shows the three actions to a role holding the three keys', async () => {
    renderActions(apiFetch, { permissions: ALL });
    for (const name of [E.editData, E.attach, E.convert])
      expect(await screen.findByRole('button', { name })).toBeTruthy();
  });

  it('shows only what the role holds; nothing without people.edit', async () => {
    renderActions(apiFetch, { permissions: ['people.edit'] });
    expect(await screen.findByRole('button', { name: E.editData })).toBeTruthy();
    expect(screen.queryByRole('button', { name: E.attach })).toBeNull();
    expect(screen.queryByRole('button', { name: E.convert })).toBeNull();
  });

  it('a role without people.edit sees no action (the edit view is people.edit)', async () => {
    renderActions(apiFetch, { permissions: ['students.attach_guardian', 'people.switch_role'] });
    expect(screen.queryByRole('button')).toBeNull();
    expect(apiFetch).not.toHaveBeenCalled();
  });

  it('loads the edit view only when a dialog opens', async () => {
    renderActions(apiFetch, { permissions: ALL });
    fireEvent.click(await screen.findByRole('button', { name: E.editData }));
    expect(await screen.findByDisplayValue('أم سهيلة')).toBeTruthy();
    expect(apiFetch).toHaveBeenCalledWith('/people/students/s1');
  });
});
