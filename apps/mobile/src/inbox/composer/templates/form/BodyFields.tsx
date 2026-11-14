import { bodyVarCount } from '@ab/client-core';
import { TEMPLATE_LIMITS } from '@ab/shared';
import { t } from '@/core/lib/i18n/i18n';
import { Field } from '@/core/ui/form/Field';
import { Section } from '@/core/ui/surface/Section';
import type { Draft } from './draft-input';
import type { SetDraft } from './use-template-draft';

const withSample = (samples: readonly string[], i: number, text: string): string[] => {
  const next = [...samples];
  next[i] = text;
  return next;
};

/** The body, the footer, and one sample per {{n}} the body uses (Meta's reviewer reads them). */
export function BodyFields({ draft, set }: { draft: Draft; set: SetDraft }) {
  const count = bodyVarCount(draft.body);
  return (
    <>
      <Section title={t.templates.create.body}>
        <Field
          label={t.templates.create.body}
          value={draft.body}
          onChangeText={(body) => set({ body })}
          maxLength={TEMPLATE_LIMITS.body}
          placeholder={t.templates.create.bodyHint}
          multiline
          textAlignVertical="top"
          required
        />
        <Field
          label={t.templates.create.footer}
          value={draft.footer}
          onChangeText={(footer) => set({ footer })}
          maxLength={TEMPLATE_LIMITS.footer}
        />
      </Section>
      {count > 0 ? (
        <Section title={t.templates.create.variables}>
          {Array.from({ length: count }, (_, i) => (
            <Field
              key={i}
              label={t.templates.create.sample.replace('{n}', String(i + 1))}
              value={draft.samples[i] ?? ''}
              onChangeText={(text) => set({ samples: withSample(draft.samples, i, text) })}
              maxLength={TEMPLATE_LIMITS.sample}
              required
            />
          ))}
        </Section>
      ) : null}
    </>
  );
}
