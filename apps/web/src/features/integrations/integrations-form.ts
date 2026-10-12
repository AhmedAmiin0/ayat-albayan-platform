import { INTEGRATION_KEYS, integrationValueValid, isIntegrationPlainKey, type IntegrationConfigItem, type IntegrationKey, type IntegrationPlainKey } from '@ab/shared';
import { t } from '@/lib/i18n';
import { matchesText } from '../config/settings-search';

export type IntegrationDraft = Partial<Record<IntegrationPlainKey, string>>;
export type IntegrationChanges = Partial<Record<IntegrationPlainKey, string | null>>;

/** A key's words in the active language. */
export const integrationText = (key: IntegrationKey): { label: string; hint: string } => t.integrations.keys[key];

/** A key matches the settings search by its label, hint or name. */
export function matchesIntegration(key: IntegrationKey, query: string): boolean {
  const { label, hint } = integrationText(key);
  return matchesText(`${label} ${hint} ${key}`, query);
}

/** Does the settings search match any integration key (no fetch needed: the registry is static)? */
export const integrationsMatch = (query: string): boolean => INTEGRATION_KEYS.some((d) => matchesIntegration(d.key, query));

/** The plain fields as shown: the value in use (from settings or the server), else empty. */
export function draftOf(items: readonly IntegrationConfigItem[]): IntegrationDraft {
  const out: IntegrationDraft = {};
  for (const i of items) if (isIntegrationPlainKey(i.key)) out[i.key] = i.value ?? '';
  return out;
}

/** Only the fields the admin changed; an emptied field is null (back to the server's value). */
export function changesOf(items: readonly IntegrationConfigItem[], draft: IntegrationDraft): IntegrationChanges {
  const out: IntegrationChanges = {};
  for (const i of items) {
    if (!isIntegrationPlainKey(i.key)) continue;
    const typed = (draft[i.key] ?? '').trim();
    if (typed !== (i.value ?? '')) out[i.key] = typed === '' ? null : typed;
  }
  return out;
}

/** The changed keys whose value the server would refuse (same checks as the API). */
export function invalidKeys(changes: IntegrationChanges): IntegrationPlainKey[] {
  return (Object.entries(changes) as [IntegrationPlainKey, string | null][])
    .filter(([key, value]) => value !== null && !integrationValueValid(key, value))
    .map(([key]) => key);
}
