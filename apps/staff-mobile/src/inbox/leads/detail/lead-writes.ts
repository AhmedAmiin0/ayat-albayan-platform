import { leadWriteCalls } from '@ab/client-core';
import { apiFetch, apiSend } from '@ab/mobile-kit';

/** The admin's writes on one lead (status, reclassify, qualification, follow-up pause). */
export const leadWrites = leadWriteCalls({ apiFetch, apiSend });
