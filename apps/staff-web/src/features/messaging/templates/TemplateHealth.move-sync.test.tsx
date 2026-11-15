import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { template } from '@/features/messaging/inbox/testing/inbox-fixture';
import { renderWithClient, routeFetch } from '@/features/messaging/inbox/testing/test-utils';
import { t } from '@/lib/i18n/i18n';
import { LINES, lineSync, lineView } from './lines/template-lines-fixture';
import { TemplateHealth } from './TemplateHealth';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

// A move re-syncs the row on its new number: that result is read, never dropped behind «نُقل».

const WELCOME = template({ key: 'academy_welcome', meta_name: 'academy_welcome', line: 'chat', status: 'missing' });
const MOVED = { ...WELCOME, line: 'notifications' as const, status: 'not_submitted' as const };
const notificationsBlock = () => screen.getAllByTestId('template-line').find((b) => b.getAttribute('data-line') === 'notifications');

async function move(sync: ReturnType<typeof lineSync>) {
  routeFetch(apiFetch, [
    ['/messaging/templates/lines', LINES],
    ['/messaging/templates', [WELCOME]],
  ]);
  renderWithClient(<TemplateHealth headingId="h" />);
  await screen.findAllByText('academy_welcome');
  routeFetch(apiFetch, [
    ['/messaging/templates/lines', [lineView('notifications', { last_sync: sync }), lineView('chat')]],
    ['/messaging/templates', [MOVED, template({ key: 'imported_one', meta_name: 'imported_one' })]],
  ]);
  apiSend.mockResolvedValue({ template: MOVED, sync });
  fireEvent.click(screen.getByRole('button', { name: t.templates.moveFor.replace('{name}', 'academy_welcome') }));
  fireEvent.click(screen.getByRole('button', { name: t.templates.moveYes }));
  await waitFor(() => expect(apiSend).toHaveBeenCalledWith('PATCH', '/messaging/templates/academy_welcome/line', { line: 'notifications' }));
}

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('move → the new number’s re-sync', () => {
  it('a failed re-sync is the error toast (syncFailed), never only «نُقل»', async () => {
    await move(lineSync({ ok: false, error: 'meta_error', message: 'Invalid OAuth access token' }));
    const error = t.templates.error.meta_error.replace('{message}', 'Invalid OAuth access token');
    const text = t.templates.perNumber.syncFailed.replace('{line}', t.enums.waLine.notifications).replace('{error}', error);
    expect((await screen.findByRole('status')).textContent).toContain(text);
    expect(screen.queryByText(t.templates.moved.replace('{line}', t.enums.waLine.notifications))).toBeNull();
  });

  it('an ok re-sync says «نُقل», refetches the registry (imported rows show) and the lines (its result shows)', async () => {
    await move(lineSync({ meta_count: 4, synced: 2, imported: ['imported_one'] }));
    expect((await screen.findByRole('status')).textContent).toContain(t.templates.moved.replace('{line}', t.enums.waLine.notifications));
    expect(await screen.findAllByText('imported_one')).not.toHaveLength(0);
    await waitFor(() => expect(notificationsBlock()?.textContent).toContain(t.templates.perNumber.metaCount));
  });
});
