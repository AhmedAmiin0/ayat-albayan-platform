import { defineRoute } from '@ab/core';
import {
  invoiceUploadSchema,
  makeupCandidateSchema,
  makeupCandidatesQuerySchema,
} from '@ab/schedule';
import { signedUploadSchema } from '../../reports';

const access = { permissions: ['booking.write'], tags: ['booking'] } as const;

/** The makeup and invoice half of the booking wizard (R-SCH-10, R-PAY-03), admin only. */
export const bookingExtraRoutes = {
  makeupCandidates: defineRoute({
    method: 'GET',
    path: '/booking/makeup-candidates',
    query: makeupCandidatesQuerySchema,
    response: makeupCandidateSchema.array(),
    ...access,
  }),
  /** 200; the answer's `path` is then sent as POST /booking `invoice`. */
  invoiceUploadUrl: defineRoute({
    method: 'POST',
    path: '/booking/invoice-upload-url',
    body: invoiceUploadSchema,
    response: signedUploadSchema,
    ...access,
  }),
};
