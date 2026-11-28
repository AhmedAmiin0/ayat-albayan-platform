import { priceListPdfBody, type PriceListChoice } from '@ab/client-core';
import { pricingRoutes, type MessageView } from '@ab/shared';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Linking } from 'react-native';
import { call, t } from '@ab/mobile-kit';
import { requestId } from '@/core/lib/http/request-id';
import { fileError, fileSendSteps } from '@/inbox/composer/send-file';
import { threadPath } from '@/inbox/thread/hooks/thread-cache';
import type { MadePdf, QuotePdfProps } from './QuotePdf.types';

const CHOICE_KEYS = ['country', 'students', 'discount', 'rounding'] as const;

const sameChoice = (a: PriceListChoice, b: PriceListChoice): boolean =>
  CHOICE_KEYS.every((key) => a[key] === b[key]);

/** One request id per PDF: its stored path is that request's, and the chat send replays by it. */
async function makePdf(choice: PriceListChoice): Promise<MadePdf> {
  const id = requestId();
  const pdf = await call({ route: pricingRoutes.listPdf, body: priceListPdfBody(choice, id) });
  return { ...pdf, id, choice };
}

/** The chat's own file send (POST …/file): the API checks the stored bytes and dedups by id. */
function queuePdf(phone: string, pdf: MadePdf): Promise<MessageView> {
  const body = { clientRequestId: pdf.id, path: pdf.path, filename: pdf.filename };
  return call<MessageView>({ method: 'POST', path: `${threadPath(phone)}/file`, body });
}

export function useQuotePdf({ phone, choice, onSent }: QuotePdfProps) {
  const client = useQueryClient();
  const make = useMutation({ mutationFn: makePdf });
  const send = useMutation({
    mutationFn: (pdf: MadePdf) => queuePdf(phone, pdf),
    ...fileSendSteps(client, phone),
  });
  const made = make.data;
  return {
    pdf: made !== undefined && sameChoice(made.choice, choice) ? made : null,
    creating: make.isPending,
    makeError: make.isError ? t.inbox.quote.pdf.failed : null,
    sending: send.isPending,
    sendError: send.isError ? fileError(send.error) : null,
    create: () => make.mutate(choice),
    view: (pdf: MadePdf) => void Linking.openURL(pdf.url),
    send: (pdf: MadePdf) => send.mutate(pdf, { onSuccess: onSent }),
  };
}
