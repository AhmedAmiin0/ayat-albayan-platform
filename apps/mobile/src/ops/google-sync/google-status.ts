import { googleErrorKey, type Glyph, type GoogleAccountStatus, type GoogleStatusView, type Tone } from '@ab/shared';
import { useQuery } from '@tanstack/react-query';
import { apiFetch } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';
import { pathKey } from '@/core/lib/query/query-keys';

const GOOGLE_STATUS_PATH = '/admin/google/status';

/** GET /admin/google/status (admin, read-only here: docs/24 §3, no OAuth on mobile). */
export function useGoogleStatus() {
  return useQuery({
    queryKey: pathKey(GOOGLE_STATUS_PATH),
    queryFn: () => apiFetch<GoogleStatusView>(GOOGLE_STATUS_PATH),
  });
}

const CHIP: Record<GoogleAccountStatus, { tone: Tone; glyph: Glyph }> = {
  connected: { tone: 'ok', glyph: 'fill' },
  disconnected: { tone: 'neutral', glyph: 'hollow' },
  error: { tone: 'bad', glyph: 'struck' },
};

export interface GoogleStatusText {
  chip: { tone: Tone; glyph: Glyph; label: string };
  email: string | null;
  sync: string;
  mode: string;
  counts: string;
  lastError: string;
  failing: boolean;
}

/** The card's lines, from the status view (pure: the strings come from googleSync.*). */
export function googleStatusText(view: GoogleStatusView): GoogleStatusText {
  const g = t.googleSync;
  const { connection, settings, counts } = view;
  const error = connection.last_error;
  return {
    chip: { ...CHIP[connection.status], label: g.connection.status[connection.status] },
    email: connection.email ? g.connection.email.replace('{email}', connection.email) : null,
    sync: g.mobile.sync.replace('{state}', settings.enabled ? g.switches.on : g.switches.off),
    mode: g.mobile.mode.replace('{mode}', settings.mode === 'live' ? g.switches.live : g.switches.dryRun),
    counts: g.mobile.counts.replace('{pending}', String(counts.pending)).replace('{failed}', String(counts.failed)),
    lastError: error ? g.mobile.lastError.replace('{error}', g.errors[googleErrorKey(error)].replace('{code}', error)) : g.mobile.noError,
    failing: error !== null && error !== '',
  };
}
