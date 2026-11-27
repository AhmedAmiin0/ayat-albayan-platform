import { threadReadCalls } from '@ab/client-core';
import { apiFetch, apiSend } from '@ab/mobile-kit';

/** A chat's reads: its page (newest, older or around a hit) and its delta (docs/12 H2, docs/37). */
export const threadReads = threadReadCalls({ apiFetch, apiSend });
