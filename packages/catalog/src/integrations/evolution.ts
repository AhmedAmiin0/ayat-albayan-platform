import { z } from 'zod';

// The Evolution driver's config checks (docs/19 «Evolution driver»), shared by «التكاملات», the
// numbers form and the API's env schema. SSRF guard: the base is https to a public name, http to
// the VPS itself, or http to an internal docker host the admin listed (EVOLUTION_INTERNAL_HOSTS).

/** Hosts an `http:` Evolution base may always name: the VPS itself. */
const LOCAL_HOSTS: ReadonlySet<string> = new Set(['localhost', '127.0.0.1', '[::1]']);

/**
 * scheme://host[:port][/path], nothing else: no user:password, query or fragment (a plain base).
 * The catalog has no URL global (no DOM / node lib), hence the pattern.
 */
const BASE_RE = /^(https?):\/\/(\[::1\]|[A-Za-z0-9.-]+)(?::(\d{1,5}))?(\/[A-Za-z0-9._~/-]*)?$/;

/** A docker service name: one word, no dot, so never an IP address or a public name. */
const INTERNAL_RE = /^[a-z0-9][a-z0-9_-]{0,62}$/;
/** An IPv4 literal (any range): an https base names a host, never a raw address. */
const IPV4_RE = /^\d{1,3}(\.\d{1,3}){3}$/;

/** The internal http hosts allowed by default: the kit's service on the stack network. */
export const EVOLUTION_INTERNAL_DEFAULT = 'evolution-api';

/** EVOLUTION_INTERNAL_HOSTS: a comma list of docker service names (at most 10). */
export const evolutionInternalList = (raw: string | undefined): string[] =>
  (raw ?? EVOLUTION_INTERNAL_DEFAULT).split(',').map((h) => h.trim().toLowerCase())
    .filter((h) => h !== '');

export const evolutionInternalHosts = z
  .string()
  .max(500)
  .refine((raw) => {
    const hosts = evolutionInternalList(raw);
    return hosts.length <= 10 && hosts.every((h) => INTERNAL_RE.test(h));
  }, 'evolution_internal_hosts');

interface BaseParts {
  scheme: string;
  host: string;
}

function partsOf(raw: string): BaseParts | null {
  const m = BASE_RE.exec(raw);
  const scheme = m?.[1];
  const host = m?.[2]?.toLowerCase();
  return scheme && host ? { scheme, host } : null;
}

type SchemeRule = (host: string, internal: readonly string[]) => boolean;

/** https: a host name (never an IP literal); http: the VPS, or a listed internal host. */
const SCHEME_RULES: Readonly<Record<string, SchemeRule>> = {
  https: (host) => !IPV4_RE.test(host) && !host.startsWith('['),
  http: (host, internal) =>
    LOCAL_HOSTS.has(host) || (INTERNAL_RE.test(host) && internal.includes(host)),
};

/** The base allowed with this internal list (the API's runtime check, before any call). */
export function evolutionBaseAllowed(raw: string, internal: readonly string[]): boolean {
  const p = partsOf(raw);
  const rule = p ? SCHEME_RULES[p.scheme] : undefined;
  return p !== null && rule?.(p.host, internal) === true;
}

/** Shape only (the list is another key): https, or http to the VPS or a one-word host. */
const shapeOk = (raw: string): boolean => {
  const p = partsOf(raw);
  const internal = p && INTERNAL_RE.test(p.host) ? [p.host] : [];
  return evolutionBaseAllowed(raw, internal);
};

/**
 * EVOLUTION_API_BASE (SSRF guard): no credentials, query or fragment, and never a private IP.
 * The driver never follows a redirect, so the base is the only host it calls.
 */
export const evolutionBase = z.string().max(500).refine(shapeOk, 'evolution_base');

/** An Evolution instance name, stored in wa_numbers.phone_number_id (META_ID_RE's alphabet). */
export const EVOLUTION_INSTANCE_RE = /^[A-Za-z0-9_-]{1,64}$/;
