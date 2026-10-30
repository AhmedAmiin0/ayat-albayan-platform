import { HttpException } from '@nestjs/common';
import { vi } from 'vitest';
import type { StorageService } from '../../../../../common/storage/storage.service';
import type { MediaMessage } from '../../../whatsapp';
import type { ThreadMediaService } from '../thread-media.service';
import type { PdfDoc, PdfPreviewQueries } from './pdf-preview.queries';
import { PdfPreviewService } from './pdf-preview.service';

// Test helper (not a test): PdfPreviewService over an in-memory bucket and messages table. The tests
// mock ./pdf-render's poppler calls (vi.mock) before importing this.

const PHONE = '+966552147730';
export const PDF_BYTES = new TextEncoder().encode('%PDF-1.4 fake');
export const ask = (page: number, messageId = 'm1') => ({ phone: PHONE, messageId, page });
/** What a fake pdftoppm returns for a range. */
export const jpgs = (range: { first: number; last: number }) =>
  Array.from({ length: range.last - range.first + 1 }, (_, i) => ({ page: range.first + i, jpg: new Uint8Array([0xff, 0xd8, i]) }));

/** `objects`: wa-media by path (a message's PDF is `{id}.pdf`); `docs`: messages.media_pages / media_bytes by id. */
export function setup() {
  const objects = new Map<string, Uint8Array>();
  const docs = new Map<string, PdfDoc>();
  const media = {
    bubbleObject: vi.fn(async (input: { messageId: string }) => ({
      msg: { id: input.messageId } as MediaMessage,
      file: { bucket: 'wa-media' as const, path: `${input.messageId}.pdf`, mime: 'application/pdf' },
    })),
  };
  const storage = {
    exists: vi.fn(async (ref: { path: string }) => objects.has(ref.path)),
    download: vi.fn(async (ref: { path: string }) => objects.get(ref.path) ?? null),
    upload: vi.fn(async (ref: { path: string; body: Uint8Array }) => void objects.set(ref.path, ref.body)),
    signedDownload: vi.fn(async (ref: { path: string }) => ({ url: `https://signed/${ref.path}`, expires_at: '2026-10-29T13:00:00.000Z' })),
  };
  const queries = {
    doc: vi.fn(async (id: string) => docs.get(id) ?? null),
    setDoc: vi.fn(async (id: string, doc: PdfDoc) => void (docs.has(id) || docs.set(id, doc))),
  };
  const service = new PdfPreviewService(
    media as unknown as ThreadMediaService,
    storage as unknown as StorageService,
    queries as unknown as PdfPreviewQueries,
  );
  return { service, media, storage, queries, objects, docs };
}

/** The HTTP status and body a call failed with. */
export const status = async (p: Promise<unknown>) => {
  const e: unknown = await p.catch((err: unknown) => err);
  if (!(e instanceof HttpException)) throw new Error('expected an HttpException');
  return { status: e.getStatus(), body: e.getResponse() };
};
