import { z } from 'zod';
import { cleanFileName } from '../chat/chat-files/index.js';

// Photos, PDFs and voice notes in the student channel (docs/31 §2). The API signs an upload into
// the private channel-media bucket ({channel_id}/{uuid}.{ext}), the app PUTs the file, then posts
// the message with that path. The limits here = the bucket's (migration 20261117090300).

/** channel_messages.kind (migration 20261117090300). */
export const CHANNEL_MESSAGE_KINDS = ['text', 'photo', 'pdf', 'voice'] as const;
export type ChannelMessageKind = (typeof CHANNEL_MESSAGE_KINDS)[number];
export type ChannelFileKind = Exclude<ChannelMessageKind, 'text'>;

/** A stored or received kind; text when absent or unknown (a row from before files). */
export const channelMessageKindOf = (k: string | null | undefined): ChannelMessageKind =>
  CHANNEL_MESSAGE_KINDS.find((x) => x === k) ?? 'text';

const MiB = 1024 * 1024;

interface MediaRule {
  kind: ChannelFileKind;
  maxBytes: number;
}

const photo: MediaRule = { kind: 'photo', maxBytes: 10 * MiB };
const voice: MediaRule = { kind: 'voice', maxBytes: 10 * MiB };

/** Each accepted type: what the bubble shows and its size cap. */
export const CHANNEL_MEDIA_RULES = {
  'image/jpeg': photo,
  'image/png': photo,
  'application/pdf': { kind: 'pdf', maxBytes: 15 * MiB },
  'audio/mp4': voice,
  'audio/aac': voice,
  'audio/mpeg': voice,
  'audio/ogg': voice,
  'audio/webm': voice,
} as const satisfies Record<string, MediaRule>;
export type ChannelMediaMime = keyof typeof CHANNEL_MEDIA_RULES;

export const CHANNEL_MEDIA_MIMES = Object.keys(CHANNEL_MEDIA_RULES) as [
  ChannelMediaMime,
  ...ChannelMediaMime[],
];

/** The bucket's file_size_limit: the largest cap of any type. */
export const CHANNEL_MEDIA_MAX_BYTES = 15 * MiB;

/** A voice note longer than an hour is not a voice note. */
const VOICE_MAX_MS = 3_600_000;

export const channelKindOf = (mime: ChannelMediaMime): ChannelFileKind =>
  CHANNEL_MEDIA_RULES[mime].kind;

const withinCap = (f: { mime: ChannelMediaMime; size: number }): boolean =>
  f.size <= CHANNEL_MEDIA_RULES[f.mime].maxBytes;
const TOO_LARGE = { message: 'attachment_too_large', path: ['size'] };

const fileFields = {
  mime: z.enum(CHANNEL_MEDIA_MIMES, { message: 'attachment_type' }),
  size: z.int().min(1).max(CHANNEL_MEDIA_MAX_BYTES, { message: 'attachment_too_large' }),
  // Shown to the other side: no control or bidi characters (a spoofed «‮fdp.exe»), ≤ 200.
  name: z
    .string()
    .max(1000)
    .transform((raw) => cleanFileName(raw))
    .pipe(z.string().min(1)),
};

/** POST …/attachments/upload-url: the file about to be sent (→ SignedUpload). */
export const channelUploadSchema = z.object(fileFields).refine(withinCap, TOO_LARGE);
export type ChannelUpload = z.output<typeof channelUploadSchema>;

/** The `attachment` of POST …/messages: the uploaded file (path as the upload answer gave it). */
export const channelAttachmentInputSchema = z
  .object({
    ...fileFields,
    path: z.string().min(1).max(512),
    duration_ms: z.int().min(0).max(VOICE_MAX_MS).optional(),
  })
  .refine(withinCap, TOO_LARGE);
export type ChannelAttachmentInput = z.output<typeof channelAttachmentInputSchema>;
