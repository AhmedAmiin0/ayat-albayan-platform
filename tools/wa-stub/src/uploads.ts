// Meta's Resumable Upload API, as template samples use it: a session on the app
// (POST /{app}/uploads?file_name&file_length&file_type), then the whole file at offset 0
// (POST /upload:{id}?sig=… with `Authorization: OAuth …` and `file_offset: 0`) → { h }.
import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import { ERR } from './providers/meta.ts';
import { readBytes, type Reply, type Route, type StubState } from './state.ts';

const FILE_TYPES = new Set(['application/pdf', 'image/jpeg', 'image/jpg', 'image/png', 'video/mp4']);
const MAX_BYTES = 100 * 1024 * 1024;

const query = (req: IncomingMessage) => new URL(req.url ?? '/', 'http://stub').searchParams;

function startSession(req: IncomingMessage, s: StubState): Reply {
  const q = query(req);
  const length = Number(q.get('file_length'));
  const type = q.get('file_type') ?? '';
  if (!q.get('file_name')) return [400, ERR.invalid('file_name is required')];
  if (!Number.isInteger(length) || length <= 0 || length > MAX_BYTES) {
    return [400, ERR.invalid('file_length must be the file size in bytes')];
  }
  if (!FILE_TYPES.has(type)) return [400, ERR.invalid(`file_type ${type} is not supported`)];
  const id = randomUUID().replace(/-/g, '');
  const sig = `stub${randomUUID().slice(0, 8)}`;
  s.uploads.set(id, { sig, length, type });
  return [200, { id: `upload:${id}?sig=${sig}` }];
}

async function upload(req: IncomingMessage, id: string, s: StubState): Promise<Reply> {
  const session = s.uploads.get(id);
  if (!session || session.sig !== query(req).get('sig')) return [400, ERR.noObject(`upload:${id}`)];
  if (!/^OAuth \S+/.test(req.headers.authorization ?? '')) return [401, ERR.auth()];
  if (req.headers['file_offset'] !== '0') return [400, ERR.invalid('file_offset must be 0 for a new upload')];
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
  ['POST', new RegExp(`^${V}/[^/]+/uploads$`), async (req, _m, s) => startSession(req, s)],
  ['POST', new RegExp(`^${V}/upload:([^/]+)$`), (req, m, s) => upload(req, m[1] ?? '', s)],
];
