import { createUseFamilyAction } from '@ab/client-core';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { t } from '@ab/mobile-kit';
import { portalLessonSend } from './api';

export const useFamilyAction = createUseFamilyAction({
  useMutation,
  useQueryClient,
  sends: portalLessonSend,
  words: () => t.portal.actions,
});
