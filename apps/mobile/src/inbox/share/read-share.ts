import { baseMime, WA_TEXT_MAX } from '@ab/shared';
import * as Sharing from 'expo-sharing';
import { z } from 'zod';
import { requestId } from '@/core/lib/http/request-id';

// docs/38 §mobile 4: the one read of what Android shared. The native singleton is the store until
// here; it is cleared on every path, so a resume never shows the same share twice.

/** A shared file, copied by expo-sharing into the app's cache (a file:// uri). */
export interface SharedFile {
  uri: string;
  /** Its base type; octet-stream named *.pdf counts as a PDF (the server sniffs the bytes). */
  mime: string;
  /** The sender's display name ('' when it gave none). */
  name: string;
  /** Bytes as the provider reported them; null when it did not. */
  size: number | null;
  /** The clientRequestId, minted once per file here (rule 8: a retry replays it). */
  id: string;
  /** 1-based place in the share: photo-{n}.jpg. */
  n: number;
}

/** Text (a link is text) or files, never both. */
export interface SharedItems {
  text: string;
  files: SharedFile[];
}

const rawSchema = z.array(z.object({ value: z.string(), shareType: z.string() }));

const resolvedSchema = z.array(
  z.object({
    contentUri: z.string().nullish(),
    contentMimeType: z.string().nullish(),
    mimeType: z.string().nullish(),
    originalName: z.string().nullish(),
    contentSize: z.number().nullish(),
  }),
);

type Resolved = z.infer<typeof resolvedSchema>[number];

const TEXT_TYPES: ReadonlySet<string> = new Set(['text', 'url']);
/** A file whose type is text/* also says «text»; its value is then the provider's uri. */
const STREAM = /^(content|file):\/\//i;
const isText = (p: { value: string; shareType: string }): boolean =>
  TEXT_TYPES.has(p.shareType) && !STREAM.test(p.value);
const PDF = 'application/pdf';
const OCTET = 'application/octet-stream';
const PDF_NAME = /\.pdf$/i;

/** The provider's type (getType wins natively); a «.pdf» sent as octet-stream is a PDF. */
export function sharedMime(type: string | null | undefined, name: string): string {
  const base = baseMime(type ?? null);
  return base === OCTET && PDF_NAME.test(name) ? PDF : base;
}

const hasUri = (p: Resolved): p is Resolved & { contentUri: string } => Boolean(p.contentUri);

/** The resolved payloads as the chooser's files, each with its own clientRequestId. */
export function toSharedItems(resolved: readonly Resolved[]): SharedFile[] {
  return resolved.filter(hasUri).map((p, i) => {
    const name = p.originalName ?? '';
    const mime = sharedMime(p.contentMimeType ?? p.mimeType, name);
    const size = p.contentSize ?? null;
    return { uri: p.contentUri, mime, name, size, id: requestId(), n: i + 1 };
  });
}

/** Files are copied into the cache on a background thread (not text: it would fetch a link). */
async function resolveFiles(): Promise<SharedFile[]> {
  return toSharedItems(resolvedSchema.parse(await Sharing.getResolvedSharedPayloadsAsync()));
}

/**
 * The share, read once and cleared. Text and links stay raw (getResolvedSharedPayloadsAsync would
 * make a blocking GET of the link); files are resolved. Throws when the share cannot be read.
 */
export async function readShare(): Promise<SharedItems> {
  try {
    const raw = rawSchema.parse(Sharing.getSharedPayloads());
    const textOnly = raw.every(isText);
    const text = raw.map((p) => p.value).join('\n').slice(0, WA_TEXT_MAX);
    return textOnly ? { text, files: [] } : { text: '', files: await resolveFiles() };
  } finally {
    Sharing.clearSharedPayloads();
  }
}
