import { evolutionConfigSchema, type EvolutionConfig, type EvolutionMode } from '@ab/shared';
import { z } from 'zod';
import { t } from '@/lib/i18n/i18n';
import type { ConfigDraft, ConfigErrors } from './config-draft';

const c = t.numbers.evolution.config;

/** The schema's own words (evolution-config.ts); any other issue reads «القيمة غير صالحة». */
const messageSchema = z
  .enum(['proxy_host', 'proxy_needed', 'invalid_id', 'invalid'])
  .catch('invalid');

const orNull = (v: string): string | null => (v.trim() === '' ? null : v.trim());
const numberOrNull = (v: string): number | null => (v.trim() === '' ? null : Number(v));

/** The draft as the PUT body before parsing (the schema trims and checks every field). */
export const rawOf = (d: ConfigDraft) => ({
  behaviour: d.behaviour,
  webhook: d.webhook,
  proxy: { ...d.proxy, port: numberOrNull(d.proxy.port) },
  sending: { ...d.sending, delay_ms: numberOrNull(d.sending.delay_ms) },
  limits: {
    gap_ms: numberOrNull(d.limits.gap_ms),
    daily_cap: numberOrNull(d.limits.daily_cap),
    error_trip: numberOrNull(d.limits.error_trip),
  },
  cloud: {
    phone_number_id: orNull(d.cloud.phone_number_id),
    business_id: orNull(d.cloud.business_id),
  },
});

export type ConfigCheck =
  | { config: EvolutionConfig; errors: null }
  | { config: null; errors: ConfigErrors };

/** A Cloud instance is created with Meta's ids: an empty one is named (the API refuses it too). */
function cloudIssues(draft: ConfigDraft, mode: EvolutionMode): [string, string][] {
  const ids = ['phone_number_id', 'business_id'] as const;
  const empty = ids.filter((k) => mode === 'cloud' && draft.cloud[k].trim() === '');
  return empty.map((k) => [`cloud.${k}`, c.errors.cloud_needed]);
}

/** evolutionConfigSchema on the draft: the body to PUT, or each field's problem. */
export function checkConfig(draft: ConfigDraft, mode: EvolutionMode): ConfigCheck {
  const parsed = evolutionConfigSchema.safeParse(rawOf(draft));
  const pairs = (parsed.error?.issues ?? []).map((i): [string, string] => [
    i.path.join('.'),
    c.errors[messageSchema.parse(i.message)],
  ]);
  const errors = [...cloudIssues(draft, mode), ...pairs];
  if (parsed.success && errors.length === 0) return { config: parsed.data, errors: null };
  return { config: null, errors: Object.fromEntries(errors) };
}
