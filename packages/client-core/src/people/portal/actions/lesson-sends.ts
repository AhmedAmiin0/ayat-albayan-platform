import { routePath } from '@ab/core';
import { portalLessonRoutes as routes, type PortalSlots } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import { pathKey } from '../../../core/keys';
import type { PortalRead } from '../portal-api';
import type { FamilyLessonInput, FamilySlotsInput, PortalLessonSends } from './lesson-sends.types';

// Shared by family app and web portal; answers are parsed (rule 12), then PORTAL_KEY refreshes.

const lesson = (i: FamilyLessonInput) => ({ id: i.studentId, lessonId: i.lessonId });

/** An empty reason or note is not sent at all, as the family never typed one. */
export function portalLessonSends(client: ApiClient): PortalLessonSends {
  const call = callWith(client);
  return {
    confirm: (i) => call({ route: routes.confirm, params: lesson(i) }),
    cancel: (i) =>
      call({ route: routes.cancel, params: lesson(i), body: { reason: i.reason || undefined } }),
    request: (i) =>
      call({
        route: routes.request,
        params: lesson(i),
        body: { startsAt: i.startsAt, note: i.note || undefined },
      }),
    withdraw: (i) => call({ route: routes.withdraw, params: lesson(i) }),
  };
}

/** GET …/slots for one week: the free starts, on the student's clock (`tz`). */
export function portalSlotsQuery(client: ApiClient) {
  const call = callWith(client);
  return (input: FamilySlotsInput): PortalRead<PortalSlots> => {
    const params = lesson(input);
    const query = { from: input.from, to: input.to };
    return {
      queryKey: [...pathKey(routePath(routes.slots, params)), input.from],
      queryFn: () => call({ route: routes.slots, params, query }),
      refetchOnWindowFocus: true,
    };
  };
}
