import type { AccountProfile } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, within } from '@testing-library/react';
import { createElement, type ReactElement } from 'react';
import { vi } from 'vitest';
import { ApiError } from '@/lib/api';

// Shared by the «حسابي» tests (not a test itself): a profile, API errors and a render wrapper.
// Each test file mocks '@/lib/api' (apiFetch for GET /me/profile, apiSend for the changes).

export const PROFILE: AccountProfile = {
  id: 'u1',
  full_name: 'سارة أحمد',
  email: 'sara@ab.co',
  phone_e164: '+966551234567',
  avatar_url: null,
  role: { base: 'teacher', key: 'teacher', name_ar: 'معلمة القرآن', name_en: 'Quran teacher' },
};

/** A domain error of /me: `{ code, message }`. */
export const domainError = (status: number, code: string) => new ApiError(status, { code, message: code });

/** A 400 validation_failed with one issue. */
export const invalid = (path: string, message: string) =>
  new ApiError(400, { message: 'validation_failed', issues: [{ path: [path], message }] });

export function renderWithClient(ui: ReactElement) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false }, mutations: { retry: false } } });
  const invalidate = vi.spyOn(client, 'invalidateQueries');
  return { ...render(createElement(QueryClientProvider, { client }, ui)), client, invalidate };
}

/** The section named by its heading (each is <section aria-labelledby>). */
export const section = (title: string) => within(screen.getByRole('region', { name: title }));
