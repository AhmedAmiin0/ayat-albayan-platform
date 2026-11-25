import type { Dsn, ErrorReport } from './error-report.types';

const MAX_TEXT = 4_000;

/** No phone numbers or emails in a report (rule: no personal data to outside services). */
export const scrub = (text: string): string =>
  text
    .replace(/\+?\d[\d\s-]{5,}\d/g, '[number]')
    .replace(/[\w.+-]+@[\w-]+(\.[\w-]+)+/g, '[email]')
    .slice(0, MAX_TEXT);

interface ErrorParts {
  type: string;
  value: string;
  stack: string;
}

const partsOf = (e: unknown): ErrorParts =>
  e instanceof Error
    ? { type: e.name, value: scrub(e.message), stack: scrub(e.stack ?? '') }
    : { type: 'Error', value: scrub(String(e)), stack: '' };

interface EnvelopeInput {
  dsn: Dsn;
  id: string;
  report: ErrorReport;
}

/**
 * A Sentry envelope with one event (GlitchTip reads the same). No timestamp: the tracker stamps
 * the time it receives it (the server clock, never a device's).
 */
export function buildEnvelope({ dsn, id, report }: EnvelopeInput): string {
  const { type, value, stack } = partsOf(report.error);
  const event = {
    event_id: id,
    level: 'error',
    platform: 'javascript',
    tags: { app: report.app, ...report.tags },
    exception: { values: [{ type, value }] },
    extra: { stack },
  };
  const lines = [{ event_id: id, dsn: dsn.dsn }, { type: 'event' }, event];
  return `${lines.map((l) => JSON.stringify(l)).join('\n')}\n`;
}
