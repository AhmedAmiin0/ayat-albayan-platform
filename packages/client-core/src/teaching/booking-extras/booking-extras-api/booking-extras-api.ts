import { bookingExtraRoutes as routes } from '@ab/shared';
import { callWith, type ApiClient } from '../../../core/http';
import type { BookingExtraCalls } from './booking-extras-api.types';

/** The booking wizard's makeup and invoice calls on one api client; answers parsed strictly. */
export function bookingExtraCalls(client: ApiClient): BookingExtraCalls {
  const call = callWith(client);
  return {
    makeupCandidates: (studentId) => call({ route: routes.makeupCandidates, query: { studentId } }),
    invoiceUploadUrl: (body) => call({ route: routes.invoiceUploadUrl, body }),
  };
}
