import { feedbackPublicRoutes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { PublicFeedbackCalls } from './public-feedback-api.types';

/** The guardian's no-login feedback link on a public api client; answers parsed strictly. */
export function publicFeedbackCalls(client: ApiClient): PublicFeedbackCalls {
  const call = callWith(client);
  return {
    form: (token) => call({ route: feedbackPublicRoutes.form, params: { token } }),
    submit: (token, body) => call({ route: feedbackPublicRoutes.submit, params: { token }, body }),
  };
}
