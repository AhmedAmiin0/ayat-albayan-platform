import { vi } from 'vitest';

/** The renderer and storage of the price list PDF, for tests without Chromium or a bucket. */
export function pdfFakes() {
  const bytes = new TextEncoder().encode('%PDF-1.7 fake');
  return {
    bytes,
    renderer: {
      render: vi.fn(async (_html: string) => bytes),
      close: vi.fn(async () => undefined),
    },
    storage: {
      upload: vi.fn(async (ref: { path: string }) => ref.path),
      signedDownload: vi.fn(async () => ({ url: 'https://files.test/p', expires_at: 'x' })),
    },
  };
}
