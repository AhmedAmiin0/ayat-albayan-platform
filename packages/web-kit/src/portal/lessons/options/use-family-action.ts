import { createUseFamilyAction } from '@ab/client-core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { portalLessonApi } from '@ab/web-kit/portal/api';

/** «خيارات الحلقة»'s writes on the web portal (owner 2026-11-17): @ab/client-core's hook. */
export const useFamilyAction = createUseFamilyAction({
  useMutation,
  useQueryClient,
  sends: portalLessonApi,
  words: () => t.portal.actions,
});
