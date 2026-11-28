import type { RouteResult } from '@ab/core';
import type { InvoiceUpload } from '@ab/schedule';
import type { bookingExtraRoutes } from '@ab/shared';

type Answer<K extends keyof typeof bookingExtraRoutes> = Promise<
  RouteResult<(typeof bookingExtraRoutes)[K]>
>;

export interface BookingExtraCalls {
  makeupCandidates: (studentId: string) => Answer<'makeupCandidates'>;
  invoiceUploadUrl: (body: InvoiceUpload) => Answer<'invoiceUploadUrl'>;
}
