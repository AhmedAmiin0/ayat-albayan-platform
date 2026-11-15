import { settingDef, type SettingKey } from '@ab/shared';
import { t } from '@/lib/i18n/i18n';

/** A dotted ar.json / en.json path of the registry ('settings.hints.uploadMaxMb') → its string. */
export function textAt(path: string): string {
  const v = path.split('.').reduce<unknown>((node, k) => (node && typeof node === 'object' ? (node as Record<string, unknown>)[k] : undefined), t);
  return typeof v === 'string' ? v : path;
}

const opt = (path: string | undefined): string | undefined => (path ? textAt(path) : undefined);

/** A setting's words on /admin/settings: label, hint, and the switch of a nullable number. */
export function settingText(key: SettingKey): { label: string; hint?: string; toggle?: string; toggleHint?: string } {
  const def = settingDef(key);
  const words: { label: string; hint?: string; toggle?: string; toggleHint?: string } = { label: textAt(def.labelKey) };
  const hint = opt(def.hintKey);
  if (hint) words.hint = hint;
  if (def.type === 'int') {
    const toggle = opt(def.toggleLabelKey);
    const toggleHint = opt(def.toggleHintKey);
    if (toggle) words.toggle = toggle;
    if (toggleHint) words.toggleHint = toggleHint;
  }
  return words;
}
