import { bookingCalls, salesBookingCalls } from '@ab/client-core';
import { apiFetch, apiSend } from '@ab/mobile-kit';

const client = { apiFetch, apiSend };

/** The admin's booking routes, or the assistant's mirror scoped to her own leads (docs/16). */
export const bookingCallsOf = { admin: bookingCalls(client), sales: salesBookingCalls(client) };
