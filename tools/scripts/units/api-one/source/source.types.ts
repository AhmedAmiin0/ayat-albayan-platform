import type { TextEdit } from '../../components/model/model.types.ts';

/** The object text a pair call becomes, or why it stays as it is. */
export type Built = { kind: 'text'; text: string } | { kind: 'refused'; reason: string };

/** What a third apiSend argument is: a JSON body, `{ body, schema }` options, or undecided. */
export type SendArg = 'body' | 'options' | 'undecided';

/** One pair call or mock the codemod found: rewritten, or left with its reason. */
export interface Found {
  line: number;
  result: 'rewritten' | 'left';
  reason: string;
}

/** A file after the codemod: its new text (unchanged when nothing applied) and what it found. */
export interface FileResult {
  text: string;
  found: Found[];
}

/** A call's pair name, the function it becomes, and whether it was a plain (imported) call. */
export interface Named {
  name: string;
  target: string;
  plain: boolean;
}

/** A rewritten call: its edit, and its name when it was a plain call (for the imports). */
export interface CallEdit {
  edit: TextEdit;
  named: Named;
}

export interface Planned {
  found: Found;
  edit: CallEdit | undefined;
}
