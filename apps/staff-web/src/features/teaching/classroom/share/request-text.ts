import { t } from '@/lib/i18n/i18n';
import type { RequestKind } from './share-messages';

export interface RequestText {
  request: string;
  pending: string;
  asks: string;
  allowed: string;
  denied: string;
}

const S = t.classroom.shareRequest;
const B = t.classroom.boardRequest;

/** The words of each request: the guest's button, the staff's prompt, the guest's answer line. */
export const REQUEST_TEXT: Readonly<Record<RequestKind, RequestText>> = {
  screen: S,
  draw: B.draw,
  open: B.open,
};
