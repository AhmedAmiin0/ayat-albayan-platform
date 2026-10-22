import type { GoogleStatusView } from '@ab/shared';
import type { Mock } from 'vitest';
import { renderWithClient, routeFetch } from '@/features/inbox/test-utils';
import { googleItems, googleStatus, googleStudents, googleTeachers } from './google.fixture';
import { GoogleSection } from './GoogleSection';

// Shared by the Google section's component tests (not app code).

export interface RenderGoogle {
  apiFetch: Mock;
  status?: GoogleStatusView;
  routes?: readonly (readonly [string, unknown])[];
  onNote?: (message: string) => void;
}

/** GoogleSection with every GET answered from the fixture (extra routes first win). */
export function renderGoogle({ apiFetch, status = googleStatus(), routes = [], onNote = () => undefined }: RenderGoogle) {
  routeFetch(apiFetch, [
    ...routes,
    ['/admin/google/status', status],
    ['/admin/google/teachers', googleTeachers()],
    ['/admin/google/students', googleStudents()],
    ['/admin/google/items', googleItems()],
  ]);
  return renderWithClient(<GoogleSection onNote={onNote} />);
}
