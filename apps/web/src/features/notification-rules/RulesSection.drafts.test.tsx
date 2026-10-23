import { counted } from '@ab/shared';
import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { failureText } from './rule-text';
import { findRow, openTab, renderRules } from './rules-test-kit';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', async (orig) => ({ ...(await orig<object>()), Link: (await import('@/features/inbox/test-utils')).MockLink }));
vi.mock('@/features/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: ['notifications.manage'], can: () => true }) }));

const r = t.notificationRules;
const audience = t.notificationCatalogue.audience;
const name = t.notificationCatalogue.entries.lesson_reminder.name;
const minutesOf = (row: HTMLElement) => within(row).getByLabelText(r.timing.minutesLabel) as HTMLInputElement;
const live = () => screen.getByTestId('rules-live');

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('«الإشعارات»: unsaved drafts', () => {
  it('a draft survives an audience-tab switch; the head counts it and leads back to its tab', async () => {
    renderRules({ apiFetch });
    fireEvent.change(minutesOf(await findRow('lesson_reminder')), { target: { value: '45' } });
    const count = counted(r.unsavedCount, 1);
    expect(screen.getByRole('button', { name: count })).toBeTruthy();
    openTab(audience.teacher);
    expect(document.querySelector('[data-key="lesson_reminder"]')).toBeNull();
    expect(screen.getByRole('button', { name: count })).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: count }));
    expect(minutesOf(await findRow('lesson_reminder')).value).toBe('45');
    expect(document.querySelector('[data-unsaved="lesson_reminder"]')).not.toBeNull();
  });

  it('«تراجع» drops the draft and the count', async () => {
    renderRules({ apiFetch });
    fireEvent.change(minutesOf(await findRow('lesson_reminder')), { target: { value: '45' } });
    fireEvent.click(screen.getByRole('button', { name: `${r.undo}: ${name}` }));
    expect(screen.queryByRole('button', { name: counted(r.unsavedCount, 1) })).toBeNull();
  });

  it('one polite region, mounted and empty before any save, announces a failed save with the row', async () => {
    renderRules({ apiFetch });
    const row = await findRow('lesson_reminder');
    expect(live().getAttribute('aria-live')).toBe('polite');
    expect(live().textContent).toBe('');
    fireEvent.change(minutesOf(row), { target: { value: '90' } });
    apiSend.mockRejectedValue(new Error('offline'));
    fireEvent.click(screen.getByRole('button', { name: `${t.common.save}: ${name}` }));
    await waitFor(() => expect(live().textContent).toBe(`${name}: ${failureText('failed')}`));
    // The line under the row is plain text (not a second, late-mounted live region).
    expect(screen.getByText(failureText('failed')).closest('[aria-live]')).toBeNull();
  });

  it('the state strip shows the queued count from GET /messages/gate', async () => {
    renderRules({ apiFetch, queued: 3 });
    const strip = await screen.findByRole('group', { name: r.strip.label });
    await waitFor(() => expect(strip.textContent).toContain(counted(r.strip.queued, 3)));
  });
});
