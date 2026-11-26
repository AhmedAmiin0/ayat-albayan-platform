import type { Locale } from '@ab/core';
import type { ProbeOptions } from '../../core/http';

export interface OverridesRequest {
  apiUrl: string;
  locale: Locale;
}

export interface OverridesOptions {
  /** Default OVERRIDES_TIMEOUT_MS. */
  timeoutMs?: number | undefined;
  /** Web passes `no-cache` to revalidate with the ETag; default the platform's own. */
  cache?: RequestCache | undefined;
  /** Tests pass their own; default the global fetch. */
  fetch?: ProbeOptions['fetch'];
}
