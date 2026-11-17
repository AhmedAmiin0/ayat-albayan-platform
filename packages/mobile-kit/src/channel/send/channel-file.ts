import { channelUploadPath } from '@ab/client-core';
import {
  CHANNEL_MEDIA_MAX_BYTES,
  CHANNEL_MEDIA_RULES,
  channelAttachmentInputSchema,
  channelUploadSchema,
  signedUploadSchema,
  type ChannelAttachmentInput,
} from '@ab/shared';
import { apiSend } from '../../lib/http/api';
import { t } from '../../lib/i18n/i18n';
import type { ChannelRef } from '../channel-api';
import type { ChannelPickedFile } from '../media-port';
import { uploadSigned } from './upload-slot';

type FileProblem = 'tooLarge' | 'badType' | 'failed';

/** A file refused before or during its upload, as studentChannel.media.<code>. */
export class ChannelFileError extends Error {
  readonly code: FileProblem;
  constructor(code: FileProblem) {
    super(code);
    this.code = code;
  }
}

/** The shared rule's refusals (channelUploadSchema) by their message. */
const PROBLEMS: Readonly<Record<string, FileProblem>> = {
  attachment_too_large: 'tooLarge',
  attachment_type: 'badType',
};

/** apiSend whose answer is data to parse (signedUploadSchema), not a typed promise. */
const askSlot: (...args: Parameters<typeof apiSend>) => Promise<unknown> = apiSend;

const fileFields = (f: ChannelPickedFile) => ({ mime: f.mime, size: f.size, name: f.name });

/** Checked here first, as the API does: its type and its size cap. */
export function fileProblem(file: ChannelPickedFile): FileProblem | null {
  const parsed = channelUploadSchema.safeParse(fileFields(file));
  if (parsed.success) return null;
  return PROBLEMS[parsed.error.issues[0]?.message ?? ''] ?? 'failed';
}

/** POST …/attachments/upload-url, then the signed upload; resolves the message's attachment. */
export async function uploadChannelFile(
  ref: ChannelRef,
  file: ChannelPickedFile,
): Promise<ChannelAttachmentInput> {
  const problem = fileProblem(file);
  if (problem) throw new ChannelFileError(problem);
  const path = channelUploadPath(ref.audience, ref.studentId);
  const signed = signedUploadSchema.parse(await askSlot('POST', path, fileFields(file)));
  const { error } = await uploadSigned(signed, { body: file.bytes, contentType: file.mime });
  if (error) throw new ChannelFileError('failed');
  const ms = file.durationMs;
  const duration = ms === undefined ? {} : { duration_ms: Math.round(ms) };
  const fields = { ...fileFields(file), path: signed.path, ...duration };
  return channelAttachmentInputSchema.parse(fields);
}

const MiB = 1024 * 1024;
const capOf = (mime: string): number =>
  Object.entries(CHANNEL_MEDIA_RULES).find(([m]) => m === mime)?.[1].maxBytes ??
  CHANNEL_MEDIA_MAX_BYTES;

/** A refused file in words: too large (its type's cap), a type not taken, or a failure. */
export function fileErrorText(e: unknown, mime: string): string {
  const code = e instanceof ChannelFileError ? e.code : 'failed';
  return t.studentChannel.media[code].replace('{n}', String(capOf(mime) / MiB));
}
