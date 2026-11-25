import {
  CHANNEL_MEDIA_MAX_BYTES,
  CHANNEL_MEDIA_RULES,
  channelAttachmentInputSchema,
  channelUploadSchema,
  signedUploadSchema,
  type ChannelAttachmentInput,
  type SignedUpload,
} from '@ab/shared';
import type { SlotUploadResult, UploadFile } from '../../../core/http';
import { channelUploadPath, type ChannelAudience } from '../channels';

// A photo, PDF or voice note in the student chat (docs/31 §2), web and phone alike: checked here
// as the API checks it, a signed slot (POST …/attachments/upload-url), the upload, then the
// message's `attachment`. Each app passes its own HTTP call and its own slot upload.

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
  /** POST `path` with the file's fields; the answer is parsed here (signedUploadSchema). */
  askSlot: (path: string, fields: ChannelFileFields) => Promise<unknown>;
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

/** Checked here first, as the API does: its type and its size cap. */
export function channelFileProblem(file: ChannelFileFields): ChannelFileProblem | null {
  const parsed = channelUploadSchema.safeParse(fieldsOf(file));
  if (parsed.success) return null;
  return PROBLEMS[parsed.error.issues[0]?.message ?? ''] ?? 'failed';
}

const MiB = 1024 * 1024;

/** The size cap of a type in MB (the largest cap for a type the chat does not take). */
export const channelFileCapMb = (mime: string): number =>
  (Object.entries(CHANNEL_MEDIA_RULES).find(([m]) => m === mime)?.[1].maxBytes ??
    CHANNEL_MEDIA_MAX_BYTES) / MiB;

/** Whose chat the file goes to. */
interface ChatRef {
  audience: ChannelAudience;
  studentId: string;
}

/** The slot, then the upload; resolves the message's attachment or throws ChannelFileError. */
export async function uploadChannelFile(
  ref: ChatRef,
  file: ChannelFileToSend,
  deps: ChannelUploadDeps,
): Promise<ChannelAttachmentInput> {
  const problem = channelFileProblem(file);
  if (problem) throw new ChannelFileError(problem);
  const path = channelUploadPath(ref.audience, ref.studentId);
  const signed = signedUploadSchema.parse(await deps.askSlot(path, fieldsOf(file)));
  const { error } = await deps.upload(signed, { body: file.bytes, contentType: file.mime });
  if (error) throw new ChannelFileError('failed');
  const ms = file.durationMs;
  const duration = ms === undefined ? {} : { duration_ms: Math.round(ms) };
  return channelAttachmentInputSchema.parse({ ...fieldsOf(file), path: signed.path, ...duration });
}
