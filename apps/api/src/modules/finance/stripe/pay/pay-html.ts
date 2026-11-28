import type { PublicPaymentLink } from '@ab/shared';
import { ar } from '@/common/infra/i18n/server-text';
import { loadEnv } from '@/config/env/env';
import { stripeKeyIsLive } from '@/config/env/env.stripe';
import { PAY_CSS } from './pay-css';

/** Every value that reaches the page goes through this (text and attribute safe). */
export function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

const fill = (text: string, values: Record<string, string>): string =>
  text.replace(/\{(\w+)\}/g, (all: string, key: string) => values[key] ?? all);

const money = (amount: number): string =>
  Number.isInteger(amount) ? String(amount) : amount.toFixed(2);

/** Shown only while the saved key is a sandbox one; live keys take real cards. */
const testNote = (): string =>
  stripeKeyIsLive(loadEnv())
    ? ''
    : `<p class="note">${escapeHtml(ar.paymentLinks.pay.testNotice)}</p>`;

/** One page: Arabic, RTL, no script; `body` and `head` are already escaped HTML. */
function shell(title: string, body: string, head = ''): string {
  const P = ar.paymentLinks.pay;
  return (
    '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer">' +
    `<meta name="robots" content="noindex"><title>${escapeHtml(title)}</title>${head}<style>${PAY_CSS}</style></head>` +
    `<body><main><h1>${escapeHtml(P.title)}</h1>${body}${testNote()}</main></body></html>`
  );
}

const para = (text: string, cls?: string): string =>
  `<p${cls ? ` class="${cls}"` : ''}>${escapeHtml(text)}</p>`;
const payPath = (token: string): string => `/pay/${encodeURIComponent(token)}`;

/** What the state of a link that cannot be paid says. */
function stateText(status: PublicPaymentLink['status']): string | null {
  const P = ar.paymentLinks.pay;
  if (status === 'paid') return P.paid;
  if (status === 'expired') return P.expired;
  if (status === 'cancelled') return P.cancelled;
  if (status === 'processing') return P.processing;
  return null;
}

/** Shows only the first name, package and amount; nothing else about the family. */
export function payPageHtml(view: PublicPaymentLink, token: string): string {
  const P = ar.paymentLinks.pay;
  const lessons = fill(ar.paymentLinks.lessons, { count: String(view.lessons) });
  const state = stateText(view.status);
  const action =
    state === null
      ? `<a class="btn" href="${escapeHtml(`${payPath(token)}/checkout`)}">${escapeHtml(P.button)}</a>`
      : para(state, 'state');
  return shell(
    P.title,
    para(fill(P.greeting, { name: view.first_name })) +
      para(fill(P.packageLine, { lessons })) +
      para(fill(P.amount, { amount: money(view.amount), currency: view.currency }), 'amount') +
      action,
  );
}

/** Text only: the verified webhook alone records payment; `app` is the deep link back. */
export function resultPageHtml(r: {
  kind: 'done' | 'cancelled';
  token: string;
  app: string | null;
  auto: boolean;
}): string {
  const P = ar.paymentLinks.pay;
  const toApp = r.app
    ? `<a class="btn" href="${escapeHtml(r.app)}">${escapeHtml(P.backToApp)}</a>`
    : '';
  if (r.kind === 'done') {
    const head =
      r.app && r.auto ? `<meta http-equiv="refresh" content="0;url=${escapeHtml(r.app)}">` : '';
    return shell(P.doneTitle, para(P.doneTitle, 'amount') + para(P.thanks) + toApp, head);
  }
  const back = `<p><a class="link" href="${escapeHtml(payPath(r.token))}">${escapeHtml(P.backToPage)}</a></p>`;
  return shell(P.cancelTitle, para(P.cancelTitle, 'amount') + para(P.back) + back + toApp);
}

/** An unknown or malformed token (404). */
export const notFoundPageHtml = (): string =>
  shell(ar.paymentLinks.pay.notFound, para(ar.paymentLinks.pay.notFound, 'state'));
