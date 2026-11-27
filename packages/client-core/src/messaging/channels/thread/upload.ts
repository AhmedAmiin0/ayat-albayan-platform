import {
  CHANNEL_MEDIA_MAX_BYTES,
  CHANNEL_MEDIA_RULES,
  channelAttachmentInputSchema,
  channelUploadSchema,
  type ChannelAttachmentInput,
  type SignedUpload,
} from '@ab/shared';
import type { SlotUploadResult, UploadFile } from '../../../core/http';
import type { ChannelSlotAsk } from '../channel-calls';
import type { z } from 'zod';

// A photo, PDF or voice note in the student chat (docs/31 §2), web and phone alike: checked here
// as the API checks it, a signed slot (the writer's upload route), the upload, then the
// message's `attachment`. Each app passes its own slot call and its own slot upload.

export type ChannelFileProblem = 'tooLarge' | 'badType' | 'failed';

/** A file refused before or during its upload, as studentChannel.media.<code>. */
export class ChannelFileError extends Error {
  readonly code: ChannelFileProblem;
  constructor(code: ChannelFileProblem) {
    super(code);
    this.code = code;
  }
}

/** What the API is told about a file before it is sent. */
export interface ChannelFileFields {
  mime: string;
  /** The name the others see (a PDF's title). */
  name: string;
  size: number;
}

/** A picked or recorded file with its bytes. */
export interface ChannelFileToSend extends ChannelFileFields {
  bytes: UploadFile['body'];
  /** A voice note's length. */
  durationMs?: number;
}

export interface ChannelUploadDeps {
  /** The chat's upload route with the file's fields (ChannelWriteCalls.upload). */
  askSlot: (fields: ChannelSlotAsk['file']) => Promise<SignedUpload>;
  /** The app's slot upload (slotUploader over its supabase-js client). */
  upload: (signed: SignedUpload, file: UploadFile) => Promise<SlotUploadResult>;
}

/** The shared rule's refusals (channelUploadSchema) by their message. */
const PROBLEMS: Readonly<Record<string, ChannelFileProblem>> = {
  attachment_too_large: 'tooLarge',
  attachment_type: 'badType',
};

const fieldsOf = (f: ChannelFileFields): ChannelFileFields => ({
  mime: f.mime,
  size: f.size,
  name: f.name,
});

const problemOf = (error: z.ZodError): ChannelFileProblem =>
  PROBLEMS[error.issues[0]?.message ?? ''] ?? 'failed';

const checked = (file: ChannelFileFields) => channelUploadSchema.safeParse(fieldsOf(file));

/** Checked here first, as the API does: its type and its size cap. */
export function channelFileProblem(file: ChannelFileFields): ChannelFileProblem | null {
  const parsed = checked(file);
  return parsed.success ? null : problemOf(parsed.error);
}

/** The upload route's fields, the name as picked (the API cleans it), or the refusal. */
function slotFields(file: ChannelFileFields): ChannelSlotAsk['file'] {
  const parsed = checked(file);
  if (!parsed.success) throw new ChannelFileError(problemOf(parsed.error));
  return { ...parsed.data, name: file.name };
}

const MiB = 1024 * 1024;

/** The size cap of a type in MB (the largest cap for a type the chat does not take). */
export const channelFileCapMb = (mime: string): number =>
  (Object.entries(CHANNEL_MEDIA_RULES).find(([m]) => m === mime)?.[1].maxBytes ??
    CHANNEL_MEDIA_MAX_BYTES) / MiB;

/** The slot, then the upload; resolves the message's attachment or throws ChannelFileError. */
export async function uploadChannelFile(
  file: ChannelFileToSend,
  deps: ChannelUploadDeps,
): Promise<ChannelAttachmentInput> {
  const signed = await deps.askSlot(slotFields(file));
  const { error } = await deps.upload(signed, { body: file.bytes, contentType: file.mime });
  if (error) throw new ChannelFileError('failed');
  const ms = file.durationMs;
  const duration = ms === undefined ? {} : { duration_ms: Math.round(ms) };
  return channelAttachmentInputSchema.parse({ ...fieldsOf(file), path: signed.path, ...duration });
}
