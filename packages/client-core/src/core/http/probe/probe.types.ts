/** How one probe asks: `no-cors` for a host that sends no CORS headers (web only). */
export interface ProbeOptions {
  mode?: RequestMode | undefined;
  /** Default `no-store`; `no-cache` revalidates with the ETag. */
  cache?: RequestCache | undefined;
  /** Default PROBE_TIMEOUT_MS. */
  timeoutMs?: number | undefined;
  /** Tests pass their own; default the global fetch. */
  fetch?: typeof fetch | undefined;
}

/** What came back: the status (0 for an opaque `no-cors` reply) and the body (null when opaque). */
export interface ProbeAnswer {
  status: number;
  body: unknown;
}
