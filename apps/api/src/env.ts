import { z } from 'zod';

// Secrets only via env (rule 9). Fails fast at boot when something is missing.
const schema = z.object({
  PORT: z.coerce.number().default(3000),
  WEB_ORIGIN: z.string().default('http://localhost:5173'),
  SUPABASE_URL: z.url(),
  SUPABASE_JWT_SECRET: z.string().min(32).optional(),
  /** Server-only key for the DbModule client (bypasses RLS; Nest guards enforce access). */
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  /** SAR-based latest-rates endpoint (docs/08 §4); a keyed ExchangeRate-API URL also works. */
  FX_API_URL: z.url().default('https://open.er-api.com/v6/latest/SAR'),
});

export type Env = z.infer<typeof schema>;

export function loadEnv(source: NodeJS.ProcessEnv = process.env): Env {
  return schema.parse(source);
}
