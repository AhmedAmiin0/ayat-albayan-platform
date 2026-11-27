import type { TemplateAuthorInput, TemplateEditInput, TemplateView } from '@ab/shared';

export type TemplateListMode = 'admin' | 'author';

export interface TemplateListQuery {
  queryKey: string[];
  queryFn: () => Promise<TemplateView[]>;
}

export interface TemplateQueries {
  /** The admin's registry, or the author's allow-list and own templates (every status). */
  templateListQuery: (mode: TemplateListMode) => TemplateListQuery;
}

export interface TemplateEditCall {
  key: string;
  input: TemplateEditInput;
}

export interface AuthoredTemplateCalls {
  list: () => Promise<TemplateView[]>;
  /** A new sales template: straight to Meta on the chat line (429 author_daily_limit). */
  create: (input: TemplateAuthorInput) => Promise<TemplateView>;
  /** An author's edit of an allow-list template the code does not send. */
  edit: (call: TemplateEditCall) => Promise<TemplateView>;
}

export interface AdminTemplateCalls {
  list: () => Promise<TemplateView[]>;
  editContent: (call: TemplateEditCall) => Promise<TemplateView>;
}
