import type { MessageView } from '@ab/shared';
import { message } from '../../shared/thread-fixtures';

// The photo tests' shared rows and answers (PhotoPreview, PhotoViewer).
export const PATH = '/threads/%2B966552147730/messages/p1/file';
export const SIGNED = 'https://storage.test/wa-media/p1.jpg?token=x';
export const signed = (url = SIGNED) => ({ url, mime: 'image/jpeg', expires_at: new Date(Date.now() + 60 * 60_000).toISOString() });
export const photo = (fields: Partial<MessageView> = {}) =>
  message({ id: 'p1', direction: 'inbound', status: 'delivered', body: null, media_mime: 'image/jpeg', replyable: true, forwardable: true, ...fields });
