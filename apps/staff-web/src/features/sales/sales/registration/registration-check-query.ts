import { registrationCheckCalls } from '@ab/client-core';
import { queryOptions } from '@tanstack/react-query';
import { apiFetch, apiSend } from '@ab/web-kit';
import { salesKeys } from '@/features/sales/keys';
import type { RegistrationAsk } from './registration-check';

const registration = registrationCheckCalls({ apiFetch, apiSend });

/** The answer for the asked query; nothing is fetched until there is one. */
export const registrationCheckQuery = (query: RegistrationAsk | null) =>
  queryOptions({
    queryKey: salesKeys.registrationCheck(query),
    queryFn: () => registration.check(query ?? {}),
    enabled: query !== null,
    retry: false,
  });
