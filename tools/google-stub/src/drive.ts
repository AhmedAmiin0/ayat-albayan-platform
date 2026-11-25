// Drive v3: the queries the API sends
// (`name = '…' and trashed = false and '…' in parents and mimeType = '…'`), folder / spreadsheet
// creation, multipart PDF upload and content replace.
import {
  nextId,
  notFound,
  readBody,
  readJson,
  SHEET,
  type Route,
  type StubFile,
  type StubState,
} from './state.ts';
import { fileMeta, newFileBody, type FileMeta } from './stub.schemas.ts';

const unquote = (s: string) => s.replace(/\\'/g, "'").replace(/\\\\/g, '\\');
const clause = (q: string, re: RegExp) => {
  const m = re.exec(q);
  return m?.[1] !== undefined ? unquote(m[1]) : null;
};

type FileTest = (f: StubFile) => boolean;
const byName =
  (name: string | null): FileTest =>
  (f) =>
    name === null || f.name === name;
const inParent =
  (parent: string | null): FileTest =>
  (f) =>
    !parent || f.parents.includes(parent);
const ofMime =
  (mime: string | null): FileTest =>
  (f) =>
    !mime || f.mimeType === mime;

function search(s: StubState, q: string): StubFile[] {
  const tests = [
    byName(clause(q, /name = '((?:[^'\\]|\\.)*)'/)),
    inParent(clause(q, /'((?:[^'\\]|\\.)*)' in parents/)),
    ofMime(clause(q, /mimeType = '((?:[^'\\]|\\.)*)'/)),
  ];
  return [...s.files.values()].filter((f) => !f.trashed && tests.every((test) => test(f)));
}

/** multipart/related: the JSON metadata part and the media part's size. */
function multipart(body: Buffer, type: string): { meta: FileMeta; size: number } {
  const boundary = /boundary=([^;]+)/.exec(type)?.[1] ?? '';
  const text = body.toString('latin1');
  const parts = text.split(`--${boundary}`).filter((p) => p.trim() && p.trim() !== '--');
  const jsonPart = parts[0] ?? '';
  const json = Buffer.from(
    jsonPart.slice(jsonPart.indexOf('\r\n\r\n') + 4).trim(),
    'latin1',
  ).toString('utf8');
  const media = parts[1] ?? '';
  return {
    meta: fileMeta.parse(JSON.parse(json || '{}')),
    size: Math.max(0, media.length - media.indexOf('\r\n\r\n') - 6),
  };
}

function add(s: StubState, f: Omit<StubFile, 'id' | 'trashed'>): StubFile {
  const file: StubFile = { ...f, id: nextId(s, 'stubfile'), trashed: false };
  s.files.set(file.id, file);
  if (f.mimeType === SHEET) s.sheets.set(file.id, []);
  return file;
}

export const driveRoutes: Route[] = [
  [
    'GET',
    /^\/drive\/v3\/files$/,
    (_r, { s, url }) => [200, { files: search(s, url.searchParams.get('q') ?? '') }],
  ],
  [
    'GET',
    /^\/drive\/v3\/files\/([^/]+)$/,
    (_r, { m, s }) => {
      const f = s.files.get(decodeURIComponent(m[1] ?? ''));
      return f ? [200, f] : notFound();
    },
  ],
  [
    'POST',
    /^\/drive\/v3\/files$/,
    async (req, { s }) => {
      const b = await readJson(req, newFileBody);
      return [
        200,
        add(s, {
          name: b.name,
          mimeType: b.mimeType,
          parents: b.parents ?? [],
          appProperties: b.appProperties ?? {},
          size: 0,
        }),
      ];
    },
  ],
  [
    'POST',
    /^\/upload\/drive\/v3\/files$/,
    async (req, { s }) => {
      const { meta, size } = multipart(await readBody(req), req.headers['content-type'] ?? '');
      return [
        200,
        add(s, {
          name: meta.name ?? '',
          mimeType: meta.mimeType ?? 'application/pdf',
          parents: meta.parents ?? [],
          appProperties: meta.appProperties ?? {},
          size,
        }),
      ];
    },
  ],
  [
    'PATCH',
    /^\/upload\/drive\/v3\/files\/([^/]+)$/,
    async (req, { m, s }) => {
      const f = s.files.get(decodeURIComponent(m[1] ?? ''));
      if (!f) return notFound();
      const { meta, size } = multipart(await readBody(req), req.headers['content-type'] ?? '');
      Object.assign(f, { name: meta.name ?? f.name, size });
      return [200, f];
    },
  ],
];
