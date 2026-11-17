import { createUseFamilyAction } from '@ab/client-core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { t } from '@ab/mobile-kit';
import { portalLessonSend } from './api';

/** «خيارات الحلقة»'s writes (owner 2026-11-17): @ab/client-core's hook on the app's sends. */
export const useFamilyAction = createUseFamilyAction({
  useMutation,
  useQueryClient,
  sends: portalLessonSend,
  words: () => t.portal.actions,
});
