import { shortCodeSchema, shortLinkGateRoutes, type ShortLinkGateView } from '@ab/shared';
import { ApiError, callWith, type ApiClient } from '../../../core/http';
import { pathKey } from '../../../core/keys';
import type { GateViewResult, ShortLinkGateCalls } from './short-link-gate-calls.types';

/** The gate's public view (never mixed with the staff cache). */
export const SHORT_LINK_GATE_KEY = pathKey('/public/short-links');

export const GATE_NOT_FOUND: GateViewResult = { kind: 'not_found' };

const isNotFound = (e: unknown): boolean => e instanceof ApiError && e.status === 404;

/** A 404 is an answer (the not-found screen); anything else stays an error. */
function notFoundOr(e: unknown): GateViewResult {
  if (isNotFound(e)) return GATE_NOT_FOUND;
  throw e;
}

const asView = (view: ShortLinkGateView): GateViewResult => ({ kind: 'view', view });

const isShortCode = (code: string): boolean => shortCodeSchema.safeParse(code).success;

export function shortLinkGateCalls(client: ApiClient): ShortLinkGateCalls {
  const call = callWith(client);
  const view = async (code: string): Promise<GateViewResult> =>
    call({ route: shortLinkGateRoutes.view, params: { code } }).then(asView, notFoundOr);
  return {
    viewQuery: (code) => ({
      queryKey: [...SHORT_LINK_GATE_KEY, code],
      queryFn: async () => (isShortCode(code) ? view(code) : GATE_NOT_FOUND),
    }),
    open: (code) => call({ route: shortLinkGateRoutes.open, params: { code } }),
    otpStart: ({ code, phone }) =>
      call({ route: shortLinkGateRoutes.start, params: { code }, body: { phone } }),
    otpVerify: ({ code, phone, otp }) =>
      call({ route: shortLinkGateRoutes.verify, params: { code }, body: { phone, code: otp } }),
  };
}
