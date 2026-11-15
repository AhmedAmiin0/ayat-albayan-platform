import { TEMPLATE_LIMITS } from '@ab/shared';
import { Field } from '@/components/ui/form/field';
import { Input } from '@/components/ui/form/input';
import { Select } from '@/components/ui/form/select';
import { t } from '@/lib/i18n/i18n';
import { varsOf, type DraftVar } from './template-draft';
import type { DraftFieldsProps } from './TemplateTextFields';

const S = t.templates.create;
/** The names the composers label and prefill; any other is a value the sender types. */
const NAMES: Record<string, string> = t.inbox.composer.paramNames;
const SAMPLES: Record<string, string | undefined> = t.templates.reviewSamples;

/** A picked name brings its usual review sample while the sample is still blank. */
const withSample = (v: DraftVar): DraftVar => (v.sample.trim() ? v : { ...v, sample: SAMPLES[v.name] ?? '' });

interface RowProps {
  n: number;
  value: DraftVar;
  onChange: (patch: Partial<DraftVar>) => void;
}

function VariableRow({ n, value, onChange }: RowProps) {
  const label = (text: string) => text.replace('{n}', String(n));
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Field label={label(S.variableName)}>
        {(p) => (
          <Select {...p} value={value.name} onChange={(e) => onChange({ name: e.target.value })}>
            <option value="">{S.variableGeneric}</option>
            {Object.entries(NAMES).map(([name, text]) => (
              <option key={name} value={name}>
                {text}
              </option>
            ))}
          </Select>
        )}
      </Field>
      <Field label={label(S.sample)} required>
        {(p) => <Input {...p} dir="auto" maxLength={TEMPLATE_LIMITS.sample} value={value.sample} onChange={(e) => onChange({ sample: e.target.value })} />}
      </Field>
    </div>
  );
}

/** One row per {{n}} in the text: what it stands for, and a real-looking sample for Meta. */
export function VariableFields({ draft, set, error }: DraftFieldsProps) {
  const vars = varsOf(draft);
  const change = (i: number, patch: Partial<DraftVar>) =>
    set({ vars: vars.map((v, j) => (j === i ? withSample({ ...v, ...patch }) : v)) });
  const refused = error('params');
  return (
    <fieldset className="grid gap-3">
      <legend className="mb-1 text-sm font-semibold">{S.variables}</legend>
      <p className="text-xs text-ink-3">{vars.length ? S.variablesHint : S.variablesNone}</p>
      {refused && (
        <p role="alert" className="text-xs text-danger">
          {refused}
        </p>
      )}
      {vars.map((v, i) => (
        // By position: {{1}} is always the first row, whatever the text does around it.
        <VariableRow key={i} n={i + 1} value={v} onChange={(patch) => change(i, patch)} />
      ))}
    </fieldset>
  );
}
