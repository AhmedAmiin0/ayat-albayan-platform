import {
  callsNeedKapso,
  META_ID_RE,
  type EvolutionMode,
  type NumberCreate,
  type NumberPurpose,
  type NumberUpdate,
  type NumberView,
  type WaProvider,
} from '@ab/shared';
import { t } from '@/lib/i18n/i18n';

/** The add / edit dialog's fields as typed (ids trimmed on submit; empty optional ids are null). */
export interface NumberDraft {
  label: string;
  purpose: NumberPurpose;
  provider: WaProvider;
  /** On an Evolution number: the instance name (docs/19 «Evolution driver»). */
  phone_number_id: string;
  waba_id: string;
  app_id: string;
  /** Used only when provider is evolution (a new one starts on Baileys, automatic sends off). */
  evolution_mode: EvolutionMode;
  evolution_auto_sends: boolean;
}

export type DraftField = keyof NumberDraft;
export type DraftErrors = Partial<Record<DraftField, string>>;

const EVOLUTION_DEFAULTS = { evolution_mode: 'baileys', evolution_auto_sends: false } as const;
const EMPTY = {
  label: '', purpose: 'notifications', provider: 'meta',
  phone_number_id: '', waba_id: '', app_id: '',
} as const;

/** A new number starts as a notifications number on Meta; an edit starts from the record. */
export function draftOf(view?: NumberView): NumberDraft {
  if (!view) return { ...EMPTY, ...EVOLUTION_DEFAULTS };
  const { label, purpose, provider, phone_number_id } = view;
  const evolution = view.evolution
    ? { evolution_mode: view.evolution.mode, evolution_auto_sends: view.evolution.auto_sends }
    : EVOLUTION_DEFAULTS;
  const ids = { waba_id: view.waba_id ?? '', app_id: view.app_id ?? '' };
  return { label, purpose, provider, phone_number_id, ...ids, ...evolution };
}

const LABEL_MAX = 60;

/** An Evolution number: its id field is the instance name and it has no WABA / app id. */
export const isEvolution = (draft: Pick<NumberDraft, 'provider'>): boolean =>
  draft.provider === 'evolution';

/**
 * Each field's problem in words (the API checks the same: label 1–60, ids META_ID_RE, a calls
 * number on Kapso).
 */
export function draftErrors(draft: NumberDraft): DraftErrors {
  const out: DraftErrors = {};
  const label = draft.label.trim();
  if (label === '' || label.length > LABEL_MAX) out.label = t.common.required;
  if (!META_ID_RE.test(draft.phone_number_id.trim())) out.phone_number_id = t.numbers.form.invalidId;
  if (callsNeedKapso(draft)) out.provider = t.numbers.errors.calls_need_kapso;
  const metaIds = isEvolution(draft) ? [] : (['waba_id', 'app_id'] as const);
  for (const f of metaIds) {
    const v = draft[f].trim();
    if (v !== '' && !META_ID_RE.test(v)) out[f] = t.numbers.form.invalidId;
  }
  return out;
}

const optional = (v: string): string | null => (v.trim() === '' ? null : v.trim());

/** Automatic sends are a Baileys switch only: a Cloud-mode number follows Meta's rules. */
const autoSends = (draft: NumberDraft): boolean =>
  draft.evolution_mode === 'baileys' && draft.evolution_auto_sends;

/** The Evolution fields of a body: set on an Evolution number, left out on any other. */
const evolutionPart = (draft: NumberDraft) =>
  isEvolution(draft)
    ? { evolution_mode: draft.evolution_mode, evolution_auto_sends: autoSends(draft) }
    : {};

/** POST /admin/numbers body from a valid draft (a new number starts disabled). */
export function createBody(draft: NumberDraft): NumberCreate {
  const evolution = isEvolution(draft);
  return {
    label: draft.label.trim(),
    purpose: draft.purpose,
    provider: draft.provider,
    phone_number_id: draft.phone_number_id.trim(),
    waba_id: evolution ? null : optional(draft.waba_id),
    app_id: evolution ? null : optional(draft.app_id),
    enabled: false,
    ...evolutionPart(draft),
  };
}

const KEYS = [
  'label', 'purpose', 'provider', 'phone_number_id', 'waba_id', 'app_id',
  'evolution_mode', 'evolution_auto_sends',
] as const;
type Key = (typeof KEYS)[number];

/** The record's values as the body names them (the Evolution fields live under view.evolution). */
const recorded = (view: NumberView): Record<Key, unknown> => ({
  ...view,
  evolution_mode: view.evolution?.mode ?? null,
  evolution_auto_sends: view.evolution?.auto_sends ?? null,
});

/**
 * PATCH body: only the fields that differ from the record (empty = nothing changed). Leaving
 * Evolution sends evolution_mode: null (the switch is then cleared by the API).
 */
export function updateBody(view: NumberView, draft: NumberDraft): NumberUpdate {
  const next: Partial<Record<Key, unknown>> = { evolution_mode: null, ...createBody(draft) };
  const before = recorded(view);
  const changed = KEYS.filter((k) => next[k] !== undefined && next[k] !== before[k]);
  return Object.fromEntries(changed.map((k) => [k, next[k]])) as NumberUpdate;
}
