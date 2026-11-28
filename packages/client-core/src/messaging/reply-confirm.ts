import { lessonActionRoutes } from '@ab/schedule';
import { salesLessonActionRoutes, type ConfirmRoute } from '@ab/shared';
import { callWith, type ApiClient } from '../core/http';

/** Confirms a quick reply's lesson on the viewer's route, as replyRights chose it; no message. */
export function replyConfirm(
  client: ApiClient,
): (input: { lessonId: string; route: ConfirmRoute }) => Promise<unknown> {
  const call = callWith(client);
  const byRoute: Record<ConfirmRoute, (id: string) => Promise<unknown>> = {
    sales: (id) => call({ route: salesLessonActionRoutes.confirm, params: { id } }),
    admin: (id) => call({ route: lessonActionRoutes.confirm, params: { id } }),
  };
  return (input) => byRoute[input.route](input.lessonId);
}
