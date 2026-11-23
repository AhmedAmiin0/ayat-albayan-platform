import { createUseFamilyAction } from '@ab/client-core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { t } from '#/lib/i18n/index.ts';
import { portalLessonApi } from '#/portal/api.ts';

/** «خيارات الحلقة»'s writes on the web portal (owner 2026-11-17): @ab/client-core's hook. */
export const useFamilyAction = createUseFamilyAction({
  useMutation,
  useQueryClient,
  sends: portalLessonApi,
  words: () => t.portal.actions,
});
