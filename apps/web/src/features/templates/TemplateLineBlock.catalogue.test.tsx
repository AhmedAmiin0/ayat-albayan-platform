import { SETTING_DEFAULTS } from '@ab/shared';
import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient, routeFetch } from '@/features/inbox/test-utils';
import { CatalogueSection } from '@/features/notification-catalogue/CatalogueSection';
import { t } from '@/lib/i18n';
import { lineSync, lineView } from './template-lines-fixture';
import { TemplateLineBlock } from './TemplateLineBlock';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));

const p = t.templates.perNumber;
const catalogueCalls = () => apiFetch.mock.calls.filter(([path]) => path === '/admin/notifications').length;

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('a template sync refetches «ماذا يُرسل ومتى» on the same page (#134 item 10)', () => {
  it('after a successful sync the catalogue is fetched again', async () => {
    routeFetch(apiFetch, [
      ['/admin/notifications', { entries: [], lines: [] }],
      ['/settings/integrations', []],
      ['/settings', SETTING_DEFAULTS],
    ]);
    renderWithClient(
      <>
        <CatalogueSection />
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
