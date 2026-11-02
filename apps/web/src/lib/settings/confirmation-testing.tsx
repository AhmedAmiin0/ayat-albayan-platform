import { PUBLIC_SETTING_DEFAULTS } from '@ab/shared';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';
import { publicConfigQuery } from './public-config';

/**
 * Tests only: GET /settings/public as answered with lesson_confirmation_required = `required`
 * (default OFF since owner 2026-11-02; ON shows «يحتاج تأكيد» and the confirm buttons as before).
 */
export function setConfirmationRequired(client: QueryClient, required: boolean): QueryClient {
  const config = { ...PUBLIC_SETTING_DEFAULTS, custom: {}, lesson_confirmation_required: required };
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
