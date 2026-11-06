import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { ApiError } from '@/lib/http/api';
import { t } from '@/lib/i18n/i18n';
import { evolutionView } from '@/features/messaging/numbers/numbers.fixture';
import { EvolutionQrDialog } from './EvolutionQrDialog';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const e = t.numbers.evolution;
const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const QR_PATH = '/admin/numbers/num-7/evolution/qr';

async function open(answer: unknown) {
  apiFetch.mockResolvedValue(answer);
  renderWithClient(<EvolutionQrDialog view={evolutionView()} onClose={vi.fn()} />);
  const dialog = screen.getByRole('dialog', { name: e.qrTitle });
  await waitFor(() => expect(apiFetch).toHaveBeenCalledWith(QR_PATH));
  return dialog;
}

afterEach(() => apiFetch.mockReset());

describe('«اربط الرقم بمسح الرمز»', () => {
  it('shows a PNG data URL as the image, the pairing code and how to scan', async () => {
    const dialog = await open({ state: 'connecting', qr: PNG, pairing_code: 'ABCD-1234' });
    const img = await within(dialog).findByRole<HTMLImageElement>('img');
    expect(img.getAttribute('src')).toBe(PNG);
    expect(within(dialog).getByText('ABCD-1234')).toBeTruthy();
    expect(within(dialog).getByText(e.qrHint)).toBeTruthy();
    expect(within(dialog).getByText(e.state.connecting)).toBeTruthy();
  });

  it('never shows a QR that is not a PNG data URL (a link to another host)', async () => {
    const dialog = await open({ state: 'connecting', qr: 'https://evil.example/qr.png', pairing_code: null });
    expect(await within(dialog).findByText(e.qrNone)).toBeTruthy();
    expect(within(dialog).queryByRole('img')).toBeNull();
  });

  it('no QR (already connected): says so; «تحديث الرمز» asks again', async () => {
    const dialog = await open({ state: 'open', qr: null, pairing_code: null });
    expect(await within(dialog).findByText(e.qrNone)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: e.refresh }));
    await waitFor(() => expect(apiFetch).toHaveBeenCalledTimes(2));
  });

  it('a refusal (502 evolution_unreachable) is said in words', async () => {
    apiFetch.mockRejectedValue(new ApiError(502, { code: 'evolution_unreachable' }));
    renderWithClient(<EvolutionQrDialog view={evolutionView()} onClose={vi.fn()} />);
    expect(await screen.findByText(e.failed)).toBeTruthy();
  });
});
