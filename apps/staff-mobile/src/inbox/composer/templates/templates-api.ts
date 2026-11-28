import type { TemplateView } from '@ab/shared';
import {
  adminTemplateCalls, authoredTemplateCalls, TEMPLATES_KEY, templateErrorWords, templateQueries,
  type TemplateListMode,
} from '@ab/client-core';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useHolds, useIsAdmin, apiFetch, apiSend, t } from '@ab/mobile-kit';

// Routes live in @ab/client-core; every write refreshes all template lists.

const client = { apiFetch, apiSend };
const { templateListQuery } = templateQueries(client);
export const adminTemplates = adminTemplateCalls(client);
export const authoredTemplates = authoredTemplateCalls(client);

/** The admin (templates.manage, admin base) sees and edits every template; else the author's. */
export function useTemplateMode(): TemplateListMode {
  const admin = useIsAdmin();
  const manages = useHolds('templates.manage');
  return admin && manages ? 'admin' : 'author';
}

export const useTemplateList = (mode: TemplateListMode) => useQuery(templateListQuery(mode));

/** A create or an edit; the lists refetch after it, whatever happened. */
export function useTemplateSave<I>(run: (input: I) => Promise<TemplateView>) {
  const queries = useQueryClient();
  return useMutation({
    mutationFn: run,
    onSettled: () => queries.invalidateQueries({ queryKey: TEMPLATES_KEY }),
  });
}

/** The refused create / edit in the app's language (templates.error), else the API's MSA reason. */
export const templateErrorText = templateErrorWords(() => t.templates.error, () => t.common.error);
