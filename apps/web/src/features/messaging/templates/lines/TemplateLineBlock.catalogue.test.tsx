import { SETTING_DEFAULTS } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient, routeFetch } from '@/features/messaging/inbox/testing/test-utils';
import { RulesSection } from '@/features/messaging/notification-rules/RulesSection';
import { t } from '@/lib/i18n/i18n';
import { lineSync, lineView } from './template-lines-fixture';
import { TemplateLineBlock } from './TemplateLineBlock';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@tanstack/react-router', async (orig) => ({ ...(await orig<object>()), Link: (await import('@/features/messaging/inbox/testing/test-utils')).MockLink }));

const p = t.templates.perNumber;
const catalogueCalls = () => apiFetch.mock.calls.filter(([path]) => path === '/admin/notifications').length;

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('a template sync refetches «الإشعارات» on the same page (#134 item 10)', () => {
  it('after a successful sync the catalogue is fetched again', async () => {
    routeFetch(apiFetch, [
      ['/admin/notifications', { entries: [], lines: [] }],
      ['/settings/integrations', []],
      ['/settings', SETTING_DEFAULTS],
      ['/admin/numbers', []],
      ['/messages/gate', { open: false, reason: 'switch_off', queued: 0 }],
    ]);
    renderWithClient(
      <>
        <RulesSection onSaved={vi.fn()} />
        <TemplateLineBlock line="notifications" facts={lineView('notifications')} phone={undefined} onNotice={vi.fn()} />
      </>,
    );
    await waitFor(() => expect(catalogueCalls()).toBe(1));
    apiSend.mockResolvedValue({ lines: [lineSync({ synced: 2 })], templates: [] });
    fireEvent.click(screen.getByRole('button', { name: p.syncFor.replace('{line}', t.enums.waLine.notifications) }));
    await waitFor(() => expect(apiSend).toHaveBeenCalledWith('POST', '/messaging/templates/health', { line: 'notifications' }));
    await waitFor(() => expect(catalogueCalls()).toBe(2));
  });
});
