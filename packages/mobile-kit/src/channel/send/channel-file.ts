import {
  ChannelFileError,
  channelFileCapMb,
  channelWriterOf,
  uploadChannelFile as uploadWith,
  type ChannelSlotAsk,
} from '@ab/client-core';
import type { ChannelAttachmentInput } from '@ab/shared';
import { t } from '../../lib/i18n/i18n';
import { channelWrites, type ChannelRef } from '../channel-api';
import type { ChannelPickedFile } from '../media-port';
import { uploadSigned } from './upload-slot';

/** The writer's upload slot, then the signed upload (client-core uploadChannelFile). */
export function uploadChannelFile(
  { audience, studentId }: ChannelRef,
  file: ChannelPickedFile,
): Promise<ChannelAttachmentInput> {
  const writes = channelWrites[channelWriterOf(audience)];
  const askSlot = (fields: ChannelSlotAsk['file']) => writes.upload({ studentId, file: fields });
  return uploadWith(file, { askSlot, upload: uploadSigned });
}

/** A refused file in words: too large (its type's cap), a type not taken, or a failure. */
export function fileErrorText(e: unknown, mime: string): string {
  const code = e instanceof ChannelFileError ? e.code : 'failed';
  return t.studentChannel.media[code].replace('{n}', String(channelFileCapMb(mime)));
}
