import { templateViewSchema, type AuthorTemplate } from '@ab/client-core';
import { AUTHOR_DAILY_LIMIT, type TemplateAuthorInput, type TemplateEditInput } from '@ab/shared';
import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import { templateErrorText } from '@/features/messaging/templates/api';
import { ApiError, apiFetch, apiSend, type SendMethod } from '@/lib/http/api';

// «تعديل» and sales authoring (owner 2026-11-14). The admin edits through templates.manage's route;
// an author (templates.author) lists, creates and edits through /messaging/templates/authored.

const AUTHORED = '/messaging/templates/authored';
const path = (key: string) => encodeURIComponent(key);
const listSchema = z.array(templateViewSchema);
/** The answer as it came: parsed below (rule 12), never trusted by a type argument. */
const sendRaw: (method: SendMethod, path: string, body: unknown) => Promise<unknown> = apiSend;
const saved = (r: unknown): AuthorTemplate => templateViewSchema.parse(r);

/** The author's list: the chat allow-list and their own templates, every status. */
export const authoredTemplatesQuery = queryOptions({
  queryKey: ['templates', 'authored'],
  queryFn: async () => listSchema.parse(await apiFetch(AUTHORED)),
});

/** Who saves the edit: the admin's route, or the author's (the allow-list only). */
export type EditMode = 'admin' | 'author';

const EDIT_URL: Record<EditMode, (key: string) => string> = {
  admin: (key) => `/messaging/templates/${path(key)}/content`,
  author: (key) => `${AUTHORED}/${path(key)}`,
};

export interface EditCall {
  mode: EditMode;
  key: string;
  input: TemplateEditInput;
}

export const editTemplate = async ({ mode, key, input }: EditCall) =>
  saved(await sendRaw('PATCH', EDIT_URL[mode](key), input));

export const createAuthoredTemplate = async (input: TemplateAuthorInput) =>
  saved(await sendRaw('POST', AUTHORED, input));

const reasonSchema = z.object({ message_ar: z.string().min(1) });

/** The API's own MSA reason (message_ar) when it gave one; else templates.error.<code> in words. */
export function editErrorText(error: unknown): string {
  const body = error instanceof ApiError ? reasonSchema.safeParse(error.body).data : undefined;
  return body?.message_ar ?? templateErrorText(error).replace('{max}', String(AUTHOR_DAILY_LIMIT));
}
