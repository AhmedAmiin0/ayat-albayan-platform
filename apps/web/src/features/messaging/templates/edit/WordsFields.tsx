import type { WaLine } from '@ab/shared';
import { emptyDraft, type DraftVar } from '@/features/messaging/templates/create/template-draft';
import { VariableFields } from '@/features/messaging/templates/create/VariableFields';
import type { EditButton } from './edit-draft';
import { EditBodyFields } from './EditBodyFields';
import { EditButtonFields } from './EditButtonFields';

/** The parts both «تعديل» and the author's «قالب جديد» type. */
export interface Words {
  body: string;
  footer: string;
  vars: DraftVar[];
  buttons: EditButton[];
}

export interface WordsFieldsProps {
  words: Words;
  set: (patch: Partial<Words>) => void;
  error: (field: string) => string | undefined;
  /** Variables and buttons fixed (code-bound); `repliesOnly`: plain quick replies (an author). */
  mode: { bound: boolean; repliesOnly: boolean; line: WaLine };
}

/** The text and footer, a sample per {{n}}, and the buttons. */
export function WordsFields({ words, set, error, mode }: WordsFieldsProps) {
  const vars = { ...emptyDraft(mode.line), body: words.body, vars: words.vars };
  return (
    <>
      <EditBodyFields
        body={words.body}
        footer={words.footer}
        onBody={(body) => set({ body })}
        onFooter={(footer) => set({ footer })}
        error={error}
      />
      <VariableFields draft={vars} set={(p) => set({ vars: p.vars ?? words.vars })} error={error} />
      <EditButtonFields
        buttons={words.buttons}
        onChange={(buttons) => set({ buttons })}
        bound={mode.bound}
        repliesOnly={mode.repliesOnly}
      />
    </>
  );
}
