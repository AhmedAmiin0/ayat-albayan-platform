// Meta's Resumable Upload API, as template samples use it: a session on the app
// (POST /{app}/uploads?file_name&file_length&file_type), then the whole file at offset 0
// (POST /upload:{id}?sig=… with `Authorization: OAuth …` and `file_offset: 0`) → { h }.
import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import { ERR, type Json } from './providers/meta.ts';
import { readBytes, type Reply, type Route, type StubState } from './state.ts';

const FILE_TYPES = new Set([
  'application/pdf',
  'image/jpeg',
  'image/jpg',
  'image/png',
  'video/mp4',
]);
const MAX_BYTES = 100 * 1024 * 1024;

const query = (req: IncomingMessage) => new URL(req.url ?? '/', 'http://stub').searchParams;

const isFileLength = (length: number): boolean =>
  Number.isInteger(length) && length > 0 && length <= MAX_BYTES;

/** Meta's first refusal of a new session's query, in the order Meta checks it. */
function sessionError(q: URLSearchParams): Json | null {
  const type = q.get('file_type') ?? '';
  const checks: [boolean, () => Json][] = [
    [!q.get('file_name'), () => ERR.invalid('file_name is required')],
    [
      !isFileLength(Number(q.get('file_length'))),
      () => ERR.invalid('file_length must be the file size in bytes'),
    ],
    [!FILE_TYPES.has(type), () => ERR.invalid(`file_type ${type} is not supported`)],
  ];
  return checks.find(([failed]) => failed)?.[1]() ?? null;
}

function startSession(req: IncomingMessage, s: StubState): Reply {
  const q = query(req);
  const error = sessionError(q);
  if (error) return [400, error];
  const id = randomUUID().replace(/-/g, '');
  const sig = `stub${randomUUID().slice(0, 8)}`;
  s.uploads.set(id, { sig, length: Number(q.get('file_length')), type: q.get('file_type') ?? '' });
  return [200, { id: `upload:${id}?sig=${sig}` }];
}

/** Meta's refusal of an upload's headers: a bad session signature, credential or offset. */
function uploadHeadersError(req: IncomingMessage, id: string, s: StubState): Reply | null {
  const checks: [boolean, () => Reply][] = [
    [s.uploads.get(id)?.sig !== query(req).get('sig'), () => [400, ERR.noObject(`upload:${id}`)]],
    [!/^OAuth \S+/.test(req.headers.authorization ?? ''), () => [401, ERR.auth()]],
    [
      req.headers.file_offset !== '0',
      () => [400, ERR.invalid('file_offset must be 0 for a new upload')],
    ],
  ];
  return checks.find(([failed]) => failed)?.[1]() ?? null;
}

async function upload(req: IncomingMessage, id: string, s: StubState): Promise<Reply> {
  const session = s.uploads.get(id);
  const refused = uploadHeadersError(req, id, s);
  if (refused !== null || session === undefined)
    return refused ?? [400, ERR.noObject(`upload:${id}`)];
  const bytes = await readBytes(req);
  if (bytes.length !== session.length) {
    return [400, ERR.invalid(`file_length was ${session.length} bytes, got ${bytes.length}`)];
  }
  s.uploads.delete(id);
  const h = `4::${Buffer.from(`${session.type}:${id}`).toString('base64')}`;
  s.handles.add(h);
  return [200, { h }];
}

const V = String.raw`\/v\d+\.\d+`;
/** Before the generic POST /{id} (template edit), which would otherwise take /upload:{id}. */
export const uploadRoutes: Route[] = [
  ['POST', new RegExp(`^${V}/[^/]+/uploads$`), (req, _m, s) => startSession(req, s)],
  ['POST', new RegExp(`^${V}/upload:([^/]+)$`), (req, m, s) => upload(req, m[1] ?? '', s)],
];
