import { baseMime, CHANNEL_MEDIA_RULES, type ChannelAttachmentInput } from '@ab/shared';
import { extFor } from '@/common/storage/storage.paths';

/** What the store says of an uploaded object (StorageService.info); null when it is not there. */
export type StoredObject = { size: number; contentType: string } | null;

type Check = (file: ChannelAttachmentInput, stored: NonNullable<StoredObject>) => boolean;

/**
 * The object behind a posted attachment must be the file the message claims: the same type and
 * size as uploaded, within that type's cap, under the extension its slot was signed with. The
 * signed upload only caps the bucket-wide size, so a PDF slot could otherwise carry a 15 MB
 * «photo» or a renamed type.
 */
const CHECKS: readonly Check[] = [
  (file, stored) => baseMime(stored.contentType) === file.mime,
  (file, stored) => stored.size === file.size,
  (file, stored) => stored.size <= CHANNEL_MEDIA_RULES[file.mime].maxBytes,
  (file) => file.path.endsWith(`.${extFor(file.mime)}`),
];

/** Is the stored object the attachment the message describes? */
export const matchesUpload = (file: ChannelAttachmentInput, stored: StoredObject): boolean =>
  stored !== null && CHECKS.every((check) => check(file, stored));
