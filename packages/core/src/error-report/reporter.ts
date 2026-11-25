import { parseDsn } from './dsn';
import { buildEnvelope } from './envelope';
import type { Dsn, ErrorReporter, ReporterOptions, ReportTags } from './error-report.types';


const WINDOW_MS = 60_000;
/** Per process (or device) and minute: an error storm never floods the tracker. */
const MAX_PER_WINDOW = 20;

const OFF: ErrorReporter = { enabled: false, capture: () => undefined };

const hexId = (): string =>
  Array.from({ length: 32 }, () => Math.floor(Math.random() * 16).toString(16)).join('');

const keyOf = (e: unknown): string => (e instanceof Error ? `${e.name}:${e.message}` : String(e));

/** Rate limit and one-a-minute dedup, over the injected clock. */
class Window {
  private start = 0;
  private sent = 0;
  private readonly seen = new Set<string>();
  private readonly now: () => number;

  constructor(now: () => number) {
    this.now = now;
  }

  admit(key: string): boolean {
    this.roll();
    if (this.sent >= MAX_PER_WINDOW || this.seen.has(key)) return false;
    this.sent += 1;
    this.seen.add(key);
    return true;
  }

  private roll(): void {
    if (this.now() - this.start < WINDOW_MS) return;
    this.start = this.now();
    this.sent = 0;
    this.seen.clear();
  }
}

function sender(dsn: Dsn, opts: ReporterOptions): ErrorReporter {
  const window = new Window(opts.now ?? Date.now);
  const auth = `Sentry sentry_version=7, sentry_key=${dsn.key}, sentry_client=ab-error-report/1`;
  const headers = { 'content-type': 'application/x-sentry-envelope', 'x-sentry-auth': auth };
  const capture = (error: unknown, tags?: ReportTags): void => {
    if (!window.admit(keyOf(error))) return;
    const id = (opts.newId ?? hexId)();
    const body = buildEnvelope({ dsn, id, report: { error, app: opts.app, tags } });
    try {
      void opts.send(dsn.endpoint, { method: 'POST', headers, body }).catch(() => undefined);
    } catch {
      // A reporter never breaks the app it reports on.
    }
  };
  return { enabled: true, capture };
}

/**
 * An error tracker client for Sentry or a GlitchTip (self-hosted, free) DSN. Without a valid DSN it
 * is a complete no-op: nothing is built, nothing is sent (each app's DSN env var is unset in git).
 */
export function createErrorReporter(opts: ReporterOptions): ErrorReporter {
  const dsn = parseDsn(opts.dsn);
  return dsn ? sender(dsn, opts) : OFF;
}
