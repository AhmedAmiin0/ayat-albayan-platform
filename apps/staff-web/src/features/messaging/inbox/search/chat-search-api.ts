import { chatSearchPages } from '@ab/client-core';
import { infiniteQueryOptions } from '@tanstack/react-query';
import { apiFetch } from '@ab/web-kit/lib/http/api';

export const chatSearchQuery = (phone: string, q: string) =>
  infiniteQueryOptions(chatSearchPages(phone, q, (path) => apiFetch(path)));
