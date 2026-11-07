import type { Bucket } from '@/common/storage/storage.paths';
import type { ObjectInfo } from './object-store';

// Supabase buckets refuse an oversize or unlisted file at upload (file_size_limit,
// allowed_mime_types: migrations 122, 170, 189, 260, 370, 500). MinIO has no such limits, so the
// S3 adapter applies the same ones when a client-uploaded object is checked (exists): a file over
// the cap or of another type is not there for the API, as it never was with Supabase.

const MiB = 1024 * 1024;
const IMAGES = ['image/jpeg', 'image/png', 'image/webp', 'image/heic'];
const DOCS = [...IMAGES, 'application/pdf'];
const AUDIO = ['audio/mpeg', 'audio/mp4', 'audio/aac', 'audio/ogg', 'audio/webm', 'audio/wav'];
const WA = [
  ...DOCS,
  'audio/ogg',
  'audio/mpeg',
  'audio/mp4',
  'audio/aac',
  'audio/amr',
  'video/mp4',
  'video/3gpp',
];

interface BucketRule {
  /** null = no cap (lesson recordings). */
  maxBytes: number | null;
  mimes: readonly string[];
}

export const BUCKET_RULES: Record<Bucket, BucketRule> = {
  reports: { maxBytes: 10 * MiB, mimes: ['application/pdf'] },
  'report-attachments': { maxBytes: 25 * MiB, mimes: [...DOCS, ...AUDIO] },
  receipts: { maxBytes: 10 * MiB, mimes: DOCS },
  invoices: { maxBytes: 10 * MiB, mimes: DOCS },
  'wa-media': { maxBytes: 16 * MiB, mimes: WA },
  recordings: { maxBytes: null, mimes: ['video/mp4', 'audio/mpeg'] },
  avatars: { maxBytes: 2 * MiB, mimes: ['image/jpeg', 'image/png', 'image/webp'] },
};

/** «image/jpeg; charset=…» → «image/jpeg». */
const baseMime = (contentType: string): string =>
  contentType.split(';')[0]?.trim().toLowerCase() ?? '';

/** Would the Supabase bucket have taken this object? */
export function withinBucketRule(bucket: Bucket, info: ObjectInfo): boolean {
  const rule = BUCKET_RULES[bucket];
  const fits = rule.maxBytes === null || info.size <= rule.maxBytes;
  return fits && rule.mimes.includes(baseMime(info.contentType));
}
