import type {
  TemplateAuthorInput, TemplateCreateBody, TemplateCrmNameInput, TemplateCrmStatusInput,
  TemplateEditInput, TemplateHealthInput, TemplateHealthView, TemplateLineInput,
  TemplateLineView, TemplateMoveView, TemplateNumberInput, TemplateNumberSetView, TemplateView,
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

/** One template's key beside the edit's own fields. */
export type TemplateKeyed<T> = T & { key: string };

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
  /** The only way a template reaches Meta, on the WABA of its own number. */
  submit: (key: string) => Promise<TemplateView>;
  /** To the other number; the API re-reads its status on that number's WABA. */
  moveLine: (call: TemplateKeyed<TemplateLineInput>) => Promise<TemplateMoveView>;
  /** The template's own number; null = its role's default (404 unknown_number). */
  setNumber: (call: TemplateKeyed<TemplateNumberInput>) => Promise<TemplateNumberSetView>;
  /** Set by hand for a crm line's template (docs/19). */
  setCrmStatus: (call: TemplateKeyed<TemplateCrmStatusInput>) => Promise<TemplateView>;
  /** A crm line's template name and language in the CRM; null = the default. */
  setCrmName: (call: TemplateKeyed<TemplateCrmNameInput>) => Promise<TemplateView>;
  /** Offers the template to the restricted roles (docs/16), or stops. */
  setStarter: (call: TemplateKeyed<{ on: boolean }>) => Promise<TemplateView>;
}
