import type { MessageView, ThreadPdfPage } from '@ab/shared';
import { message } from '../../shared/thread-fixtures';

// The photo and PDF tests' shared rows and answers (PhotoPreview, PhotoViewer, PdfPreview, PdfViewer).
export const PATH = '/threads/%2B966552147730/messages/p1/file';
export const SIGNED = 'https://storage.test/wa-media/p1.jpg?token=x';
export const signed = (url = SIGNED) => ({ url, mime: 'image/jpeg', expires_at: new Date(Date.now() + 60 * 60_000).toISOString() });
export const photo = (fields: Partial<MessageView> = {}) =>
  message({ id: 'p1', direction: 'inbound', status: 'delivered', body: null, media_mime: 'image/jpeg', replyable: true, forwardable: true, ...fields });

/** GET …/pdf/:page of a bubble, and its answer: page n of a 12-page, 1.2 MB PDF. */
export const pdfPath = (page: number, id = 'd1') => `/threads/%2B966552147730/messages/${id}/pdf/${page}`;
export const pageUrl = (page: number) => `https://storage.test/wa-media/pdf/${page}.jpg?token=x`;
export const pdfPage = (page: number, fields: Partial<ThreadPdfPage> = {}): ThreadPdfPage => ({
  url: pageUrl(page),
  expires_at: signed().expires_at,
  page,
  pages: 12,
  bytes: 1.2 * 1024 * 1024,
  ...fields,
});
// The i18n literal scan reads this file (a .tsx that is not a test): a Latin name.
export const pdfDoc = (fields: Partial<MessageView> = {}) =>
  photo({ id: 'd1', media_mime: 'application/pdf', media_name: 'hifz-plan.pdf', ...fields });
