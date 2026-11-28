import { isWaAuthFailure } from '@ab/shared';
import { WA_ERROR } from '@ab/catalog';
import { HttpException } from '@nestjs/common';
import { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';

// The relay answers failures in the CRM's own envelope, {error:{message, code}}, with a CRM-like
// status, so the old script logs a readable error and retries only what the CRM would let it.

/** A failed send: `maybe` = it may have reached WhatsApp (never released for a resend). */
interface RelayFailure {
  status: number;
  code: string;
  message: string;
  maybe: boolean;
}

export const relayError = (f: Pick<RelayFailure, 'status' | 'code' | 'message'>): HttpException =>
  new HttpException({ error: { message: f.message, code: f.code } }, f.status);

interface Issue {
  path: PropertyKey[];
  message: string;
}

/** A zod issue as the CRM would word it: «<path>: <message>». */
const issueText = (issue: Issue): string => {
  const where = issue.path.map(String).join('.');
  return where ? `${where}: ${issue.message}` : issue.message;
};

/** The 422 for a body the CRM would refuse, worded from its first issue. */
export function invalidRequest(issues: readonly Issue[]): HttpException {
  const first = issues[0];
  const message = first ? issueText(first) : 'invalid request';
  return relayError({ status: 422, code: 'invalid_request', message });
}

type Info = WaError['info'];
type Rule = readonly [(info: Info) => boolean, (e: WaError) => RelayFailure];

const isRefusal = (info: Info): boolean => info.status >= 400 && info.status < 500;
/** Meta refused the line's OWN token (a meta line, docs/19), not the script's key. */
const lineToken = (info: Info): boolean => !info.crmCode && isWaAuthFailure(info);
const crmCode = (info: Info, fallback: string): string => info.crmCode ?? fallback;

/** First match wins: the allow-list, a send that may have gone, the CRM's 4xx, the rest (502). */
const RULES: readonly Rule[] = [
  [
    (info) => info.code === WA_ERROR.recipientNotAllowed,
    (e) => ({ status: 403, code: 'recipient_not_allowed', message: e.message, maybe: false }),
  ],
  [
    (info) => info.uncertain === true,
    (e) => ({
      status: 502,
      code: crmCode(e.info, 'crm_uncertain'),
      message: e.message,
      maybe: true,
    }),
  ],
  [
    lineToken,
    (e) => ({ status: 502, code: 'line_auth', message: e.message, maybe: false }),
  ],
  [
    isRefusal,
    (e) => ({
      status: e.info.status,
      code: crmCode(e.info, 'crm_refused'),
      message: e.message,
      maybe: false,
    }),
  ],
  [
    () => true,
    (e) => ({ status: 502, code: crmCode(e.info, 'crm_failed'), message: e.message, maybe: false }),
  ],
];

/** Anything but a WaError is a fault of ours after the row was written: treated as maybe sent. */
const UNKNOWN: RelayFailure = {
  status: 502,
  code: 'relay_failed',
  message: 'relay failed',
  maybe: true,
};

export function relayFailure(e: unknown): RelayFailure {
  if (!(e instanceof WaError)) return UNKNOWN;
  const rule = RULES.find(([applies]) => applies(e.info));
  return rule ? rule[1](e) : UNKNOWN;
}

/** The CRM answered 2xx without a wamid: sent, it just cannot be matched to delivery ticks. */
export const sentWithoutId = (e: unknown): boolean =>
  e instanceof WaError && e.info.uncertain === true && e.info.status >= 200 && e.info.status < 300;
