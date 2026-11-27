import { adminTemplateCalls, authoredTemplateCalls } from '@ab/client-core';
import { AUTHOR_DAILY_LIMIT, type TemplateEditInput } from '@ab/shared';
import { queryOptions } from '@tanstack/react-query';
import { z } from 'zod';
import { templateKeys } from '@/features/messaging/keys';
import { templateErrorText } from '@/features/messaging/templates/api';
import { ApiError, apiFetch, apiSend } from '@ab/web-kit';

// The admin edits via templates.manage; authors use /messaging/templates/authored.

const client = { apiFetch, apiSend };
const admin = adminTemplateCalls(client);
const authored = authoredTemplateCalls(client);

/** The author's list: the chat allow-list and their own templates, every status. */
export const authoredTemplatesQuery = queryOptions({
  queryKey: templateKeys.authored(),
  queryFn: authored.list,
});

/** Who saves the edit: the admin's route, or the author's (the allow-list only). */
export type EditMode = 'admin' | 'author';

const EDIT: Record<EditMode, typeof admin.editContent> = {
  admin: admin.editContent,
  author: authored.edit,
};

export interface EditCall {
  mode: EditMode;
  key: string;
  input: TemplateEditInput;
}

export const editTemplate = ({ mode, key, input }: EditCall) => EDIT[mode]({ key, input });

export const createAuthoredTemplate = authored.create;

const reasonSchema = z.object({ message_ar: z.string().min(1) });

/** The API's own MSA reason (message_ar) when it gave one; else templates.error.<code> in words. */
export function editErrorText(error: unknown): string {
  const body = error instanceof ApiError ? reasonSchema.safeParse(error.body).data : undefined;
  return body?.message_ar ?? templateErrorText(error).replace('{max}', String(AUTHOR_DAILY_LIMIT));
}
