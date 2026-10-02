// Stub state and route types shared by the Graph routes (stub.ts) and the control routes.
import type { IncomingMessage } from 'node:http';
import type { Json, StubTemplate } from './meta.ts';

export interface StubOptions {
  templates?: StubTemplate[];
  /** API webhook that simulated inbound messages and statuses are POSTed to (signed). */
  webhookUrl?: string;
  appSecret?: string;
  phoneNumberId?: string;
  /** When set, the bearer token must equal it; otherwise any bearer passes. */
  accessToken?: string;
  /** Free-form messages need an inbound from that number in the last 24 h (default true). */
  enforceWindow?: boolean;
}

export interface SentMessage {
  id: string;
  to: string;
  type: string;
  template?: string;
  body: unknown;
}

export interface StubState {
  opts: StubOptions;
  templates: StubTemplate[];
  sent: SentMessage[];
  /** wamids marked read through POST /messages {status:'read'}. */
  reads: string[];
  media: Map<string, { mime: string; bytes: Buffer }>;
  /** digits → ms of the last simulated inbound message. */
  lastInbound: Map<string, number>;
  /** digits → the Meta error the next send to that number gets. */
  failNext: Map<string, Json>;
  /** Open resumable-upload sessions by id (without `upload:`): the `sig` and what was announced. */
  uploads: Map<string, { sig: string; length: number; type: string }>;
  /** Handles of finished uploads: the only header_handle values template creation accepts. */
  handles: Set<string>;
}

export type Reply = [number, unknown] | { status: number; mime: string; bytes: Buffer };
export type Route = [string, RegExp, (req: IncomingMessage, m: RegExpExecArray, s: StubState) => Promise<Reply>];

export const digits = (phone: unknown) => String(phone ?? '').replace(/\D/g, '');
export const DAY_MS = 24 * 60 * 60 * 1000;

export async function readBytes(req: IncomingMessage): Promise<Buffer> {
  const chunks: Buffer[] = [];
  for await (const chunk of req) chunks.push(chunk as Buffer);
  return Buffer.concat(chunks);
}

export async function readJson(req: IncomingMessage): Promise<Json> {
  const bytes = await readBytes(req);
  return bytes.length ? (JSON.parse(bytes.toString('utf8')) as Json) : {};
}
