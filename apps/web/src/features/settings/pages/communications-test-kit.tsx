import type { AcademySettings } from '@ab/shared';
import type { QueryClient } from '@tanstack/react-query';
import { useState, type ReactNode } from 'react';
import type { Mock } from 'vitest';
import { renderWithClient, routeFetch } from '@/features/inbox/test-utils';
import { NUMBERS, PARITY_SAME } from '@/features/numbers/numbers.fixture';
import { LINES } from '@/features/templates/template-lines-fixture';
import { CATALOGUE_ROUTE, SETTINGS } from '@/test/settings-fixture';
import { CommunicationsPage } from './CommunicationsPage';
import type { CommunicationsTab } from './page-search';

// Shared by the «التواصل» page tests (not app code). Each test file mocks @/lib/api and the router's Link.

export interface Gate {
  open: boolean;
  reason: 'not_configured' | 'switch_off' | null;
  queued: number;
}

export interface RenderCommunications {
  apiFetch: Mock;
  tab?: CommunicationsTab;
  settings?: Partial<AcademySettings>;
  gate?: Gate;
  catalogue?: unknown;
  /** GET /settings/integrations (none by default). */
  integrations?: unknown;
  /** Stands in for the route's LeaveGuard (gets the unsaved names). */
  renderGuard?: (names: readonly string[]) => ReactNode;
}

/** The page with its tab held in state (as the route holds it in `?tab=`). */
function Harness({ initial, renderGuard }: { initial: CommunicationsTab; renderGuard?: RenderCommunications['renderGuard'] }) {
  const [tab, setTab] = useState<CommunicationsTab>(initial);
  return <CommunicationsPage tab={tab} onTab={setTab} {...(renderGuard ? { renderGuard } : {})} />;
}

/** «التواصل» with every GET it may make answered (first prefix wins). */
export function renderCommunications(input: RenderCommunications): QueryClient {
  const settings = { ...SETTINGS, ...input.settings };
  const gate = input.gate ?? { open: settings.messaging_enabled, reason: settings.messaging_enabled ? null : 'switch_off', queued: 0 };
  routeFetch(input.apiFetch, [
    ['/config/meta', { meta: {} }],
    ['/settings/integrations', input.integrations ?? []],
    ['/settings', settings],
    input.catalogue === undefined ? CATALOGUE_ROUTE : ['/admin/notifications', input.catalogue],
    ['/messages/gate', gate],
    ['/messaging/templates/lines', LINES],
    ['/messaging/templates', []],
    ['/admin/numbers', NUMBERS],
    ['/admin/communications/parity', PARITY_SAME],
  ]);
  return renderWithClient(<Harness initial={input.tab ?? 'overview'} renderGuard={input.renderGuard} />);
}
