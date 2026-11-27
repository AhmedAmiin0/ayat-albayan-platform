import { teacherCalls } from '@ab/client-core';
import { apiFetch, apiSend } from '@ab/mobile-kit';

/** The admin teacher routes (R-TCH-01) on the staff app's api client. */
export const teachers = teacherCalls({ apiFetch, apiSend });
