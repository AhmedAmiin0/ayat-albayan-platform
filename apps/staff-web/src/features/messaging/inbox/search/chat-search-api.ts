import { chatSearchPages } from '@ab/client-core';
import { infiniteQueryOptions } from '@tanstack/react-query';
import { apiFetch } from '@/lib/http/api';

/** «بحث» inside a chat (client-core's chatSearchPages over this app's fetch). */
export const chatSearchQuery = (phone: string, q: string) =>
  infiniteQueryOptions(chatSearchPages(phone, q, (path) => apiFetch(path)));
