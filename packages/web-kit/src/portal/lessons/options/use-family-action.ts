import { createUseFamilyAction } from '@ab/client-core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { t } from '@ab/web-kit/lib/i18n/i18n';
import { portalLessonApi } from '@ab/web-kit/portal/api';

export const useFamilyAction = createUseFamilyAction({
  useMutation,
  useQueryClient,
  sends: portalLessonApi,
  words: () => t.portal.actions,
});
