import type {
  TemplateAuthorInput, TemplateCreateBody, TemplateEditInput, TemplateHealthInput,
  TemplateHealthView, TemplateLineView, TemplateView,
} from '@ab/shared';

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
  /** A new unsubmitted row; 409 template_exists when the key is taken. */
  create: (body: TemplateCreateBody) => Promise<TemplateView>;
  /** Both numbers as the server's env knows them: no Meta call, safe on mount. */
  lines: () => Promise<TemplateLineView[]>;
  /** One line's rows against its own WABA, or every line when none is named. */
  health: (body: TemplateHealthInput) => Promise<TemplateHealthView>;
  editContent: (call: TemplateEditCall) => Promise<TemplateView>;
}
