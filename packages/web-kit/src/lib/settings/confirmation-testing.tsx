import { PUBLIC_SETTING_DEFAULTS, type PublicSettings } from '@ab/settings';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { publicConfigQuery } from './public-config';

/** Tests only: GET /settings/public with lesson_confirmation_required = `required`. */
export function setConfirmationRequired(
  client: QueryClient,
  required: boolean,
  patch: Partial<PublicSettings> = {},
): QueryClient {
  const answered = { lesson_confirmation_required: required };
  const config = { ...PUBLIC_SETTING_DEFAULTS, ...patch, custom: {}, ...answered };
  client.setQueryData(publicConfigQuery.queryKey, config);
  return client;
}

/** Tests only: a render `wrapper`, fresh query client, the setting answered (default OFF). */
export function configWrapper(required = false) {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  setConfirmationRequired(client, required);
  return function ConfigWrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={client}>{children}</QueryClientProvider>;
  };
}
