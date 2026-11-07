import { fireEvent, screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { StorageProbeButton } from './StorageProbeButton';

const apiSend = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiSend }));

const s = t.integrations.storageProbe;

function renderButton() {
  const onNote = vi.fn();
  renderWithClient(<StorageProbeButton onNote={onNote} />);
  return { onNote };
}

afterEach(() => apiSend.mockReset());

describe('«اختبار الاتصال» (MinIO, docs/45)', () => {
  it('click → POST /settings/integrations/storage-probe, then the success note', async () => {
    apiSend.mockResolvedValue({ data: { ok: true, ms: 42 } });
    const { onNote } = renderButton();
    expect(screen.getByText(s.hint)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: s.button }));
    await waitFor(() => expect(onNote).toHaveBeenCalledExactlyOnceWith(s.done));
    expect(apiSend).toHaveBeenCalledWith('POST', '/settings/integrations/storage-probe');
  });

  it.each(['storage_not_configured', 'storage_probe_failed'] as const)('%s has its own words', async (code) => {
    apiSend.mockRejectedValue(new ApiError(409, { message: code }));
    const { onNote } = renderButton();
    fireEvent.click(screen.getByRole('button', { name: s.button }));
    expect((await screen.findByRole('alert')).textContent).toContain(s.errors[code]);
    expect(onNote).not.toHaveBeenCalled();
  });

  it('anything else is «try again»', async () => {
    apiSend.mockRejectedValue(new Error('network'));
    renderButton();
    fireEvent.click(screen.getByRole('button', { name: s.button }));
    expect((await screen.findByRole('alert')).textContent).toContain(s.errors.unknown);
  });
});
