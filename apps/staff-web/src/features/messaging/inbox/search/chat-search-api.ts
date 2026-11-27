import { chatSearchPages, inboxSearchCalls } from '@ab/client-core';
import { infiniteQueryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/web-kit';

const searches = inboxSearchCalls({ apiFetch, apiSend });

export const chatSearchQuery = (phone: string, q: string) =>
  infiniteQueryOptions(chatSearchPages(phone, q, searches));
