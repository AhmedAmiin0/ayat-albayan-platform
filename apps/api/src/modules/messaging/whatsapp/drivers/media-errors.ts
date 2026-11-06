import { isWaAuthError } from '@ab/shared';
import { HttpStatus } from '@nestjs/common';
import { EVOLUTION_AUTH, KAPSO_AUTH } from '@/modules/messaging/whatsapp/sender/send-plan';
import { waHttpError } from '@/modules/messaging/whatsapp/templates/catalog/template.mapper';
import type { WaError } from '@/modules/messaging/whatsapp/whatsapp.types';

// A failed inbound media fetch in words (docs/19), by driver: a table, not an if-chain.

/** 409 for inbound media on a crm line: the CRM holds that number's files (docs/19). */
export const CRM_NO_MEDIA = 'crm_no_media';
/** 409 on an Evolution Cloud instance: it cannot download by id alone (docs/19). */
const EVOLUTION_NO_MEDIA = 'evolution_no_media';

const UNSUPPORTED = {
  crm: CRM_NO_MEDIA,
  evolution: EVOLUTION_NO_MEDIA,
} satisfies Record<NonNullable<WaError['info']['unsupported']>, string>;

/** A driver's own refused key (a crm line never fetches media: no entry). */
const REFUSED: Partial<Record<NonNullable<WaError['info']['credential']>, string>> = {
  kapso: KAPSO_AUTH,
  evolution: EVOLUTION_AUTH,
};

/** The driver's own answer: 409 (it cannot), 502 (its key refused); null = none. */
function driverAnswer(e: WaError): Error | null {
  const cannot = e.info.unsupported ? UNSUPPORTED[e.info.unsupported] : undefined;
  if (cannot) return waHttpError(cannot, HttpStatus.CONFLICT);
  const refused = e.info.credential ? REFUSED[e.info.credential] : undefined;
  return refused ? waHttpError(refused, HttpStatus.BAD_GATEWAY) : null;
}

const isClientError = (status: number): boolean => status >= 400 && status < 500;

/** crm_no_media, kapso_auth, evolution_auth, a dead Meta token, or gone (410); else as is. */
export function mediaHttpError(e: WaError): Error {
  const own = driverAnswer(e);
  if (own) return own;
  const code = e.info.code;
  if (isWaAuthError(code)) return waHttpError('meta_error', HttpStatus.BAD_GATEWAY, { meta_code: code });
  return isClientError(e.info.status) ? waHttpError('media_expired', HttpStatus.GONE) : e;
}
