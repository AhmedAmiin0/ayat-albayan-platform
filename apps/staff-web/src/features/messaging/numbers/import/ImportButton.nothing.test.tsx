import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@ab/web-kit';
import { importResult } from '@/features/messaging/numbers/numbers.fixture';
import { renderPanel } from '@/features/messaging/numbers/numbers-test-kit';

const apiFetch = vi.hoisted(() => vi.fn());
const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
vi.mock('@ab/web-kit/auth/use-permissions', () => ({ usePermissions: () => ({ permissions: [], can: () => true }) }));

const im = t.numbers.import;

afterEach(() => {
  apiFetch.mockReset();
  apiSend.mockReset();
});

describe('«استيراد الإعداد الحالي» with nothing new', () => {
  it('says so and offers no confirm', async () => {
    renderPanel(apiFetch);
    await screen.findByRole('article', { name: 'Notifications line' });
    apiSend.mockResolvedValueOnce(importResult({ changed: false }));
    fireEvent.click(screen.getByRole('button', { name: im.title }));
    const dialog = await screen.findByRole('dialog', { name: im.preview });
    expect(within(dialog).getByText(im.nothing)).toBeTruthy();
    expect(within(dialog).queryByRole('button', { name: im.confirm })).toBeNull();
    fireEvent.click(within(dialog).getByRole('button', { name: t.numbers.actions.cancel }));
    expect(screen.queryByRole('dialog')).toBeNull();
    expect(apiSend).toHaveBeenCalledTimes(1);
  });
});
