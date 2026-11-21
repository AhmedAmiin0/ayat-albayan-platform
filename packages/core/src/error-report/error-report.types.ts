/** A parsed DSN: where envelopes go and the project's public key. */
export interface Dsn {
  endpoint: string;
  key: string;
  dsn: string;
}

/** Short tags only (app, request id, route): never a person's data. */
export type ReportTags = Readonly<Record<string, string>>;

/** One error to report. */
export interface ErrorReport {
  error: unknown;
  /** api, staff-web, staff-mobile, family-mobile. */
  app: string;
  tags?: ReportTags;
}

/** What the transport is asked to send (fetch-shaped; each app passes its own HTTP call). */
export interface ReportRequest {
  method: 'POST';
  headers: Record<'content-type' | 'x-sentry-auth', string>;
  body: string;
}

export type ReportTransport = (url: string, init: ReportRequest) => Promise<unknown>;

export interface ErrorReporter {
  /** False without a valid DSN: capture() then does nothing at all. */
  readonly enabled: boolean;
  /** Fire and forget; never throws. */
  capture(error: unknown, tags?: ReportTags): void;
}

export interface ReporterOptions {
  dsn: string | undefined;
  app: string;
  send: ReportTransport;
  /** For the rate limit only (events carry no timestamp: the tracker stamps its own). */
  now?: () => number;
  /** 32 hex characters per event. */
  newId?: () => string;
}
