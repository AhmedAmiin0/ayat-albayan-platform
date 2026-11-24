import { EVOLUTION_DEFAULT_EVENTS, type EvolutionConfig, type NumberView } from '@ab/shared';

// Numbers stay text until submit (empty is null); the webhook URL is always server-built.

type Cfg = EvolutionConfig;
export interface ConfigDraft {
  behaviour: Cfg['behaviour'];
  webhook: Cfg['webhook'];
  proxy: Omit<Cfg['proxy'], 'port'> & { port: string };
  sending: Cfg['sending'];
  limits: { gap_ms: string; daily_cap: string; error_trip: string };
  cloud: { phone_number_id: string; business_id: string };
}
export type ConfigSection = keyof ConfigDraft;

/** Each field's problem in words, by its path («webhook.url», «proxy.host» …). */
export type ConfigErrors = Partial<Record<string, string>>;

/** What every section of the dialog gets: its slice of the draft, the errors, and a patcher. */
export interface SectionProps<K extends ConfigSection> {
  value: ConfigDraft[K];
  /** By path; empty while the draft was never checked. */
  errors: ConfigErrors;
  onChange: (patch: Partial<ConfigDraft[K]>) => void;
}

/** A section with a secret row of the number (proxy password, Cloud token). */
export interface SecretSectionProps<K extends ConfigSection> extends SectionProps<K> {
  view: NumberView;
}

const text = (n: number | null): string => (n === null ? '' : String(n));

/** The saved options as the form shows them. */
export function draftOfConfig(config: Cfg): ConfigDraft {
  const { webhook, proxy, sending, limits, cloud } = config;
  return {
    behaviour: config.behaviour,
    webhook,
    proxy: { ...proxy, port: text(proxy.port) },
    sending,
    limits: {
      gap_ms: text(limits.gap_ms), daily_cap: text(limits.daily_cap),
      error_trip: text(limits.error_trip),
    },
    cloud: { phone_number_id: cloud.phone_number_id ?? '', business_id: cloud.business_id ?? '' },
  };
}

/** One section's change, the others kept. */
export const patchSection = <K extends ConfigSection>(
  draft: ConfigDraft,
  key: K,
  patch: Partial<ConfigDraft[K]>,
): ConfigDraft => ({ ...draft, [key]: { ...draft[key], ...patch } });

export const defaultEvents = () => [...EVOLUTION_DEFAULT_EVENTS];
