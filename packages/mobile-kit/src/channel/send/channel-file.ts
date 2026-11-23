import {
  ChannelFileError,
  channelFileCapMb,
  uploadChannelFile as uploadWith,
} from '@ab/client-core';
import type { ChannelAttachmentInput } from '@ab/shared';
import { apiSend } from '../../lib/http/api';
import { t } from '../../lib/i18n/i18n';
import type { ChannelRef } from '../channel-api';
import type { ChannelPickedFile } from '../media-port';
import { uploadSigned } from './upload-slot';

/** apiSend whose answer is data to parse (signedUploadSchema), not a typed promise. */
const askSlot = (path: string, fields: object): Promise<unknown> => apiSend('POST', path, fields);

/** POST …/attachments/upload-url, then the signed upload (client-core uploadChannelFile). */
export const uploadChannelFile = (
  ref: ChannelRef,
  file: ChannelPickedFile,
): Promise<ChannelAttachmentInput> => uploadWith(ref, file, { askSlot, upload: uploadSigned });

/** A refused file in words: too large (its type's cap), a type not taken, or a failure. */
export function fileErrorText(e: unknown, mime: string): string {
  const code = e instanceof ChannelFileError ? e.code : 'failed';
  return t.studentChannel.media[code].replace('{n}', String(channelFileCapMb(mime)));
}
