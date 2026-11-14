import {
  TEMPLATES_KEY, templateErrorWords, templateQueries, templateSends, type AuthorTemplate,
  type TemplateListMode,
} from '@ab/client-core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useHolds, useIsAdmin } from '@/core/auth/use-permissions';
import { apiFetch, apiSend } from '@/core/lib/http/api';
import { t } from '@/core/lib/i18n/i18n';

// «القوالب» (owner 2026-11-14): the routes live in @ab/client-core; this module binds them to
// mobile's API client. Every write refreshes every template list (and the composers' pickers).

const client = { apiFetch, apiSend };
const { templateListQuery } = templateQueries(client);
export const templateApi = templateSends(client);

/** The admin (templates.manage, admin base) sees and edits every template; else the author's. */
export function useTemplateMode(): TemplateListMode {
  const admin = useIsAdmin();
  const manages = useHolds('templates.manage');
  return admin && manages ? 'admin' : 'author';
}

export const useTemplateList = (mode: TemplateListMode) => useQuery(templateListQuery(mode));

/** A create or an edit; the lists refetch after it, whatever happened. */
export function useTemplateSave<I>(run: (input: I) => Promise<AuthorTemplate>) {
  const queries = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSettled: () => queries.invalidateQueries({ queryKey: TEMPLATES_KEY }),
  });
}

/** The refused create / edit in the app's language (templates.error), else the API's MSA reason. */
export const templateErrorText = templateErrorWords(() => t.templates.error, () => t.common.error);
