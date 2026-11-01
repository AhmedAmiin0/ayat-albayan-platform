// HTTP test harness for /saved-replies (test-only, excluded from the build): the real controller,
// guards, service and files logic; saved_replies is an in-memory table and Storage a mock.
import { FastifyAdapter, type NestFastifyApplication } from '@nestjs/platform-fastify';
import { Test } from '@nestjs/testing';
import { vi } from 'vitest';
import { AppModule } from '@/app.module';
import { PERMISSION_RESOLVER, systemResolver, TOKEN_VERIFIER, type TokenVerifier } from '@/common/auth/auth.guard';
import type { PermissionResolver } from '@/common/auth/permissions';
import type { AuthUser } from '@/common/auth/verify-token';
import { StorageService } from '@/common/storage/storage.service';
import type { SavedReplyRow } from './saved-replies.mapper';
import { SavedRepliesRepo, type ReplyInsert, type ReplyPatch } from './saved-replies.repo';
import { SavedReplySettings } from './saved-replies.settings';

const USERS: Record<string, AuthUser> = {
  admin: { id: 'a1', email: null, role: 'admin' },
  sales: { id: 's1', email: null, role: 'sales' },
  salesB: { id: 's2', email: null, role: 'sales' },
  teacher: { id: 't1', email: null, role: 'teacher' },
  guardian: { id: 'g1', email: null, role: 'guardian' },
};
const verify: TokenVerifier = async (token) => {
  const user = USERS[token];
  if (!user) throw new Error('bad token');
  return user;
};

let seq = 0;
/** A uuid-shaped id per row, so `:id` params pass replyIdParam. */
export const replyId = (n: number) => `5a000000-0000-4000-8000-${String(n).padStart(12, '0')}`;

/** saved_replies in memory: the same reads and writes SavedRepliesQueries makes. */
function memoryReplies(rows: SavedReplyRow[] = []) {
  const table = rows;
  return {
    table,
    visibleTo: vi.fn(async (id: string) => table.filter((r) => r.owner_profile_id === null || r.owner_profile_id === id)),
    one: vi.fn(async (id: string) => table.find((r) => r.id === id) ?? null),
    listOf: vi.fn(async (owner: string | null) => table.filter((r) => r.owner_profile_id === owner)),
    insert: vi.fn(async (row: ReplyInsert) => {
      const made: SavedReplyRow = {
        id: replyId(++seq + 100),
        owner_profile_id: row.owner_profile_id ?? null,
        title: row.title,
        body: row.body,
        attachment_path: row.attachment_path ?? null,
        attachment_mime: row.attachment_mime ?? null,
        attachment_name: row.attachment_name ?? null,
        attachment_size: row.attachment_size ?? null,
        position: row.position ?? 0,
        updated_at: '2026-10-25T00:00:00Z',
      };
      table.push(made);
      return made;
    }),
    update: vi.fn(async (id: string, patch: ReplyPatch) => {
      const row = table.find((r) => r.id === id);
      return row ? Object.assign(row, patch) : null;
    }),
    remove: vi.fn(async (id: string) => {
      const at = table.findIndex((r) => r.id === id);
      if (at >= 0) table.splice(at, 1);
    }),
    setPositions: vi.fn(async (moves: { id: string; position: number }[]) => {
      for (const m of moves) {
        const row = table.find((r) => r.id === m.id);
        if (row) row.position = m.position;
      }
    }),
  };
}

export function row(over: Partial<SavedReplyRow> & { n: number }): SavedReplyRow {
  const { n, ...rest } = over;
  return {
    id: replyId(n),
    owner_profile_id: null,
    title: `رد ${n}`,
    body: 'السلام عليكم {name}',
    attachment_path: null,
    attachment_mime: null,
    attachment_name: null,
    attachment_size: null,
    position: n,
    updated_at: '2026-10-25T00:00:00Z',
    ...rest,
  };
}

const PDF_HEAD = new TextEncoder().encode('%PDF-1.7\n%âãÏÓ');

function storageMock() {
  return {
    signedUpload: vi.fn(async (ref: { bucket: string; path: string }) => ({ ...ref, token: 'tok', signed_url: 'https://storage.test/up' })),
    info: vi.fn(async () => ({ size: 2048, contentType: 'application/pdf' })),
    head: vi.fn(async () => PDF_HEAD),
    copy: vi.fn(async () => undefined),
    remove: vi.fn(async () => undefined),
  };
}

export async function repliesApp(input: { rows?: SavedReplyRow[]; resolve?: PermissionResolver } = {}) {
  const replies = memoryReplies(input.rows ?? []);
  const storage = storageMock();
  const mod = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(PERMISSION_RESOLVER).useValue(input.resolve ?? systemResolver)
    .overrideProvider(TOKEN_VERIFIER).useValue(verify)
    .overrideProvider(SavedRepliesRepo).useValue(replies)
    .overrideProvider(StorageService).useValue(storage)
    .overrideProvider(SavedReplySettings).useValue({ read: async () => ({ upload_max_mb: 10 }) })
    .compile();
  const app = mod.createNestApplication<NestFastifyApplication>(new FastifyAdapter());
  await app.init();
  await app.getHttpAdapter().getInstance().ready();
  const call = (req: { method: 'GET' | 'POST' | 'PATCH' | 'DELETE'; url: string; token?: string; body?: object }) =>
    app.inject({
      method: req.method,
      url: req.url,
      headers: { authorization: `Bearer ${req.token ?? 'admin'}` },
      ...(req.body ? { payload: req.body } : {}),
    });
  return { app, call, replies, storage };
}
