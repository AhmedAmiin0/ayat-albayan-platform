import { type PublicPaymentLink } from '@ab/shared';
import { ar } from '../../../../common/i18n/server-text';
import { PAY_CSS } from './pay-css';

/** Every value that reaches the page goes through this (text and attribute safe). */
export function escapeHtml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

const fill = (text: string, values: Record<string, string>): string =>
  text.replace(/\{(\w+)\}/g, (all: string, key: string) => values[key] ?? all);

const money = (amount: number): string => (Number.isInteger(amount) ? String(amount) : amount.toFixed(2));

/** One page: Arabic, RTL, no script; `body` is already escaped HTML. */
function shell(title: string, body: string): string {
  const P = ar.paymentLinks.pay;
  return (
    '<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width,initial-scale=1"><meta name="referrer" content="no-referrer">' +
    `<meta name="robots" content="noindex"><title>${escapeHtml(title)}</title><style>${PAY_CSS}</style></head>` +
    `<body><main><h1>${escapeHtml(P.title)}</h1>${body}<p class="note">${escapeHtml(P.testNotice)}</p></main></body></html>`
  );
}

const para = (text: string, cls?: string): string => `<p${cls ? ` class="${cls}"` : ''}>${escapeHtml(text)}</p>`;
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

/**
 * GET /pay/:token: the first name, the package and the amount; one «ادفع الآن» link to the checkout while
 * the link is open, else what its state means. Nothing else about the family.
 */
export function payPageHtml(view: PublicPaymentLink, token: string): string {
  const P = ar.paymentLinks.pay;
  const lessons = fill(ar.paymentLinks.lessons, { count: String(view.lessons) });
  const state = stateText(view.status);
  const action = state === null ? `<a class="btn" href="${escapeHtml(`${payPath(token)}/checkout`)}">${escapeHtml(P.button)}</a>` : para(state, 'state');
  return shell(
    P.title,
    para(fill(P.greeting, { name: view.first_name })) +
      para(fill(P.packageLine, { lessons })) +
      para(fill(P.amount, { amount: money(view.amount), currency: view.currency }), 'amount') +
      action,
  );
}

/** Stripe's success / cancel URLs: text only (the verified webhook alone records the payment). */
export function resultPageHtml(kind: 'done' | 'cancelled', token: string): string {
  const P = ar.paymentLinks.pay;
  if (kind === 'done') return shell(P.doneTitle, para(P.doneTitle, 'amount') + para(P.thanks));
  const back = `<p><a class="link" href="${escapeHtml(payPath(token))}">${escapeHtml(P.backToPage)}</a></p>`;
  return shell(P.cancelTitle, para(P.cancelTitle, 'amount') + para(P.back) + back);
}

/** An unknown or malformed token (404). */
export const notFoundPageHtml = (): string => shell(ar.paymentLinks.pay.notFound, para(ar.paymentLinks.pay.notFound, 'state'));
