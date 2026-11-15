import { render } from '@testing-library/react';
import type { ReactElement } from 'react';
import { configWrapper } from '@/lib/settings/confirmation-testing';

/**
 * Renders `ui` with a fresh query client (no retries), for the sales page tests; `confirmation`:
 * settings.lesson_confirmation_required as GET /settings/public answered it (default OFF).
 */
export function renderWithQuery(ui: ReactElement, confirmation = false) {
  return render(ui, { wrapper: configWrapper(confirmation) });
}
