import { defineRoute, id } from '@ab/core';
import { invoiceViewSchema } from '@ab/schedule';
import { z } from 'zod';
import { signedDownloadSchema } from '../../reports';
import {
  invoiceListQuerySchema,
  invoiceRecentPageSchema,
  invoiceRecentQuerySchema,
} from './invoices.schemas';

/** Booking invoices (R-PAY-03), written once for the api and its clients. */
export const invoiceRoutes = {
  list: defineRoute({
    method: 'GET',
    path: '/invoices',
    query: invoiceListQuerySchema,
    response: z.array(invoiceViewSchema),
  }),
  recent: defineRoute({
    method: 'GET',
    path: '/invoices/recent',
    query: invoiceRecentQuerySchema,
    response: invoiceRecentPageSchema,
  }),
  download: defineRoute({
    method: 'GET',
    path: '/invoices/:id/download',
    params: z.object({ id: id() }),
    response: signedDownloadSchema,
  }),
};
