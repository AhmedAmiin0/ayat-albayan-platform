import { threadSendCalls, type TextAnswer } from '@ab/client-core';
import { apiFetch, apiSend } from '@ab/mobile-kit';
import { templateBody, textBody, type SendInput } from './outgoing';

const sends = threadSendCalls({ apiFetch, apiSend });

/** POST …/text or …/template by the send's kind; the answer is read with the shared route. */
export function sendOut(phone: string, { out, id }: SendInput): Promise<TextAnswer> {
  const params = { phone };
  return out.kind === 'text'
    ? sends.text({ params, body: textBody(out, id) })
    : sends.template({ params, body: templateBody(out, id) });
}
