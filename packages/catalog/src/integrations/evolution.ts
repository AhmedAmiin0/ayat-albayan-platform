import { z } from 'zod';

// The Evolution driver's config checks (docs/19 «Evolution driver»), shared by «التكاملات», the
// numbers form and the API's env schema.

/** Hosts an `http:` Evolution base may name: the VPS itself (Evolution bound to localhost). */
const LOCAL_HOSTS: ReadonlySet<string> = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * scheme://host[:port][/path], nothing else: no user:password, query or fragment (a plain base).
 * The catalog has no URL global (no DOM / node lib), hence the pattern.
 */
const BASE_RE = /^(https?):\/\/(\[::1\]|[A-Za-z0-9.-]+)(?::(\d{1,5}))?(\/[A-Za-z0-9._~/-]*)?$/;

function allowed(raw: string): boolean {
  const m = BASE_RE.exec(raw);
  const scheme = m?.[1];
  const host = (m?.[2] ?? '').toLowerCase();
  return scheme === 'https' || (scheme === 'http' && LOCAL_HOSTS.has(host));
}

/**
 * EVOLUTION_API_BASE (SSRF guard): https anywhere, or http on localhost only; no credentials,
 * query or fragment. The driver never follows a redirect, so the base is the only host it calls.
 */
export const evolutionBase = z
  .string()
  .max(500)
  .refine(allowed, 'evolution_base');

/** Default gap between two sends of one Baileys number to different recipients (ban risk). */
export const EVOLUTION_GAP_DEFAULT_MS = 3_000;
/** EVOLUTION_SEND_GAP_MS: 0 to 60 s, in milliseconds. */
export const evolutionGapMs = z.coerce.number().int().min(0).max(60_000);

/** An Evolution instance name, stored in wa_numbers.phone_number_id (META_ID_RE's alphabet). */
export const EVOLUTION_INSTANCE_RE = /^[A-Za-z0-9_-]{1,64}$/;
