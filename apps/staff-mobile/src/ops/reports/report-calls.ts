import { reportCalls } from '@ab/client-core';
import { apiFetch, apiSend } from '@ab/mobile-kit';

/** One report's read and PDF link for the admin screens. */
export const reports = reportCalls({ apiFetch, apiSend });
