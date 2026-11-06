import { EVOLUTION_MODES, type EvolutionMode } from '@ab/shared';
import { CheckField } from '@/components/settings/fields/CheckField';
import { Field } from '@/components/ui/form/field';
import { Select } from '@/components/ui/form/select';
import { t } from '@/lib/i18n/i18n';
import type { NumberDraft } from './number-form';

const e = t.numbers.evolution;

/** Baileys is the unofficial WhatsApp Web link (ban risk); Cloud follows Meta's own rules. */
const MODE_HINT: Record<EvolutionMode, string> = { baileys: e.banRisk, cloud: e.cloudHint };

export interface EvolutionFieldsProps {
  draft: NumberDraft;
  onChange: (patch: Partial<NumberDraft>) => void;
}

/**
 * An Evolution number's own fields (docs/19 «Evolution driver»): the engine, with its warning, and
 * on Baileys the switch that lets automatic notifications and templates go out (off by default).
 */
export function EvolutionFields({ draft, onChange }: EvolutionFieldsProps) {
  const mode = draft.evolution_mode;
  return (
    <>
      <Field label={e.modeLabel} hint={MODE_HINT[mode]}>
        {(p) => (
          <Select
            {...p}
            value={mode}
            onChange={(ev) => {
              const picked = EVOLUTION_MODES.find((m) => m === ev.target.value) ?? mode;
              onChange({ evolution_mode: picked });
            }}
          >
            {EVOLUTION_MODES.map((m) => (
              <option key={m} value={m}>{e.mode[m]}</option>
            ))}
          </Select>
        )}
      </Field>
      {mode === 'baileys' && (
        <CheckField
          label={e.autoSends}
          checked={draft.evolution_auto_sends}
          onChange={(checked) => onChange({ evolution_auto_sends: checked })}
        />
      )}
    </>
  );
}
