import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { importResult } from '../numbers.fixture';
import { renderPanel } from '../numbers-test-kit';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@/features/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: [], can: () => true }) }));

const im = t.numbers.import;

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

const blocked = importResult({
  roles: [
    {
      role: 'notifications',
      action: 'create',
      number_id: null,
      fields: [
        { field: 'phone_number_id', secret: false, source: 'env', value: '1000000003' },
        { field: 'waba_id', secret: false, source: 'db', value: null },
      ],
      secrets_to_copy: [],
      not_importable: { reason: 'invalid_id', fields: ['waba_id'] },
    },
    { role: 'chat', action: 'create', number_id: null, fields: [], secrets_to_copy: ['access_token'] },
  ],
});

describe('«استيراد الإعداد الحالي» with a role that is not importable', () => {
  it('shows «لا يمكن استيراده» with the field label (no create text); the other role keeps its action', async () => {
    renderPanel(apiFetch);
    await screen.findByRole('article', { name: 'Notifications line' });
    apiSend.mockResolvedValueOnce(blocked);
    fireEvent.click(screen.getByRole('button', { name: im.title }));
    const dialog = await screen.findByRole('dialog', { name: im.preview });
    const notif = within(dialog).getByRole('region', { name: t.numbers.purpose.notifications });
    expect(within(notif).getByText(im.notImportable)).toBeTruthy();
    expect(within(notif).getByText(im.invalidId.replace('{{names}}', t.numbers.fields.waba_id))).toBeTruthy();
    expect(within(notif).queryByText(im.action.create)).toBeNull();
    const chat = within(dialog).getByRole('region', { name: t.numbers.purpose.chat });
    expect(within(chat).getByText(im.action.create)).toBeTruthy();
    expect(within(chat).queryByText(im.notImportable)).toBeNull();
    expect(within(dialog).getByRole('button', { name: im.confirm })).toBeTruthy();
  });
});
