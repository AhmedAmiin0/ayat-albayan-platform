function required(name: string, value: string | undefined): string {
  if (!value) throw new Error(`Missing ${name}; run \`pnpm env:local\``);
  return value;
}

/** An optional poll interval in ms: a whole number ≥ 500, else the fallback. */
export function intervalMs(raw: string | undefined, fallback: number): number {
  const n = Number(raw);
  return raw && Number.isInteger(n) && n >= 500 ? n : fallback;
}

export const env = {
  supabaseUrl: required('VITE_SUPABASE_URL', import.meta.env['VITE_SUPABASE_URL']),
  supabaseAnonKey: required('VITE_SUPABASE_ANON_KEY', import.meta.env['VITE_SUPABASE_ANON_KEY']),
  apiUrl: required('VITE_API_URL', import.meta.env['VITE_API_URL']),
  /** The open inbox's refresh (default 10 s); e2e sets 1 s so a status chip shows without a 10 s wait. */
  inboxRefreshMs: intervalMs(import.meta.env['VITE_INBOX_REFRESH_MS'], 10_000),
};
