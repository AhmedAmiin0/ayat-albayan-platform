import { fireEvent, screen, waitFor, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient } from '@/features/messaging/inbox/testing/test-utils';
import { ApiError, t } from '@ab/web-kit';
import { evolutionView } from '@/features/messaging/numbers/numbers.fixture';
import { EvolutionQrDialog } from './EvolutionQrDialog';
import { mockCall } from '@ab/testing/mock-call';

const mockApi = mockCall();
vi.mock('@ab/web-kit/lib/http/api/api', async (orig) => ({
  ...(await orig<object>()),
  call: (request: unknown) => mockApi.call(request),
}));

const e = t.numbers.evolution;
const PNG = 'data:image/png;base64,iVBORw0KGgo=';
const QR_PATH = '/admin/numbers/num-7/evolution/qr';

async function open(answer: unknown) {
  mockApi.onRead(() => answer);
  renderWithClient(<EvolutionQrDialog view={evolutionView()} onClose={vi.fn()} />);
  const dialog = screen.getByRole('dialog', { name: e.qrTitle });
  await waitFor(() => expect(mockApi.reads()).toContainEqual({ method: 'GET', path: QR_PATH }));
  return dialog;
}

afterEach(() => mockApi.reset('read'));

describe('«اربط الرقم بمسح الرمز»', () => {
  it('shows a PNG data URL as the image, the pairing code and how to scan', async () => {
    const dialog = await open({ state: 'connecting', qr: PNG, pairing_code: 'ABCD-1234' });
    const img = await within(dialog).findByRole<HTMLImageElement>('img');
    expect(img.getAttribute('src')).toBe(PNG);
    expect(within(dialog).getByText('ABCD-1234')).toBeTruthy();
    expect(within(dialog).getByText(e.qrHint)).toBeTruthy();
    expect(within(dialog).getByText(e.state.connecting)).toBeTruthy();
  });

  it('warns first, in words: never link the academy’s main chat number', async () => {
    const dialog = await open({ state: 'connecting', qr: PNG, pairing_code: null });
    expect(e.qrWarning).toBe(
      'لا تربط رقم المحادثات الرئيسي للأكاديمية. الربط غير الرسمي قد يؤدي إلى حظر الرقم.',
    );
    expect(within(dialog).getAllByRole('alert')[0]?.textContent).toBe(e.qrWarning);
  });

  it('never shows a QR that is not a PNG data URL (a link to another host)', async () => {
    const dialog = await open({
      state: 'connecting',
      qr: 'https://evil.example/qr.png',
      pairing_code: null,
    });
    expect(await within(dialog).findByText(e.qrNone)).toBeTruthy();
    expect(within(dialog).queryByRole('img')).toBeNull();
  });

  it('no QR (already connected): says so; «تحديث الرمز» asks again', async () => {
    const dialog = await open({ state: 'open', qr: null, pairing_code: null });
    expect(await within(dialog).findByText(e.qrNone)).toBeTruthy();
    fireEvent.click(within(dialog).getByRole('button', { name: e.refresh }));
    await waitFor(() => expect(mockApi.reads()).toHaveLength(2));
  });

  it('a refusal (502 evolution_unreachable) is said in words', async () => {
    mockApi.onRead(() => Promise.reject(new ApiError(502, { code: 'evolution_unreachable' })));
    renderWithClient(<EvolutionQrDialog view={evolutionView()} onClose={vi.fn()} />);
    expect(await screen.findByText(e.failed)).toBeTruthy();
  });
});
