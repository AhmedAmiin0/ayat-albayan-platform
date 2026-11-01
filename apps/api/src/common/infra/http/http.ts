import type { z } from 'zod';
import { readCapped } from './bytes';
import { withDeadline, type Phase } from './deadline';
import { Failed, Passthrough, type HttpFailure } from './failure';
import type { BytesCall, Http, HttpProfile, HttpRequest } from './http.types';
import { initOf, urlOf, whereOf } from './request';

// The one outbound client of the api (docs/36 H-1): a profile per integration, no retries (a send
// path must never resend an `uncertain` request; retries stay with send-plan, backoff, pg-boss).

const TEXT_CAP = 300;

/** The one JSON.parse of the api's outbound calls: not JSON → null (the schema decides). */
function parseJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

async function discard(res: Response): Promise<void> {
  await res.body?.cancel().catch(() => undefined);
}

interface Kept {
  body: unknown;
  text: string;
}

async function errorBodyOf<E extends Error>(profile: HttpProfile<E>, res: Response): Promise<Kept> {
  const schema = profile.errorBody;
  if (schema === 'omit') return discard(res).then(() => ({ body: null, text: '' }));
  const text = await res.text().catch(() => '');
  const parsed = schema.safeParse(parseJson(text));
  return { body: parsed.success ? parsed.data : null, text: text.slice(0, TEXT_CAP) };
}

async function statusFailure<E extends Error>(
  profile: HttpProfile<E>,
  res: Response,
  where: string,
): Promise<HttpFailure> {
  const kept = await errorBodyOf(profile, res);
  const retryAfter = res.headers.get('retry-after');
  return { kind: 'status', status: res.status, ...kept, retryAfter, where };
}

type OnResponse<T> = (res: Response, where: string) => Promise<T>;

function call<E extends Error, T>(profile: HttpProfile<E>, req: HttpRequest, read: OnResponse<T>) {
  const where = whereOf(profile.name, req);
  const ms = req.timeoutMs ?? profile.timeoutMs;
  const run = { ms, caller: req.signal, errors: profile.errors, where };
  return profile.headers().then((headers) =>
    withDeadline(run, async (signal: AbortSignal, phase: Phase) => {
      const send = profile.fetch ?? fetch;
      const res = await send(urlOf(profile.base(), req), initOf({ profile, req, headers }, signal));
      phase.headers = true;
      return read(res, where);
    }),
  );
}

/** A non-2xx goes to the table (through Failed); a 2xx is the reader's. */
const okOnly =
  <E extends Error, T>(profile: HttpProfile<E>, read: OnResponse<T>): OnResponse<T> =>
  async (res, where) => {
    if (!res.ok) throw new Failed(await statusFailure(profile, res, where));
    return read(res, where);
  };

function parsedBy<S extends z.ZodType>(schema: S): OnResponse<z.output<S>> {
  return async (res, where) => {
    const parsed = schema.safeParse(parseJson(await res.text()));
    if (!parsed.success) {
      throw new Failed({ kind: 'shape', status: res.status, issues: parsed.error.issues, where });
    }
    return parsed.data;
  };
}

function cappedBy(c: BytesCall): OnResponse<{ bytes: Uint8Array; mime: string | null }> {
  return async (res) => {
    const declared = Number(res.headers.get('content-length') ?? 0);
    if (declared > c.maxBytes) {
      await discard(res);
      throw new Passthrough(c.tooLarge());
    }
    const bytes = await readCapped(res.body, c.maxBytes, c.tooLarge);
    return { bytes, mime: res.headers.get('content-type') };
  };
}

const statusOnly: OnResponse<number> = async (res) => {
  await discard(res);
  return res.status;
};

/** The client for one integration. Never retries. */
export function createHttp<E extends Error>(profile: HttpProfile<E>): Http {
  return {
    json: (c) => call(profile, c, okOnly(profile, parsedBy(c.schema))),
    bytes: (c) => call(profile, c, okOnly(profile, cappedBy(c))),
    status: (c) => call(profile, c, statusOnly),
  };
}
