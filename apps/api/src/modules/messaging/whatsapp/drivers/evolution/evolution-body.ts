import type { WaSendKind } from '@ab/shared';
import { waTo } from '@/modules/messaging/whatsapp/messages/wa-components';
import { wabaComponents } from '@/modules/messaging/whatsapp/drivers/waba/waba-graph';
import type { WabaTemplate } from '@/modules/messaging/whatsapp/drivers/waba/waba-template';
import type { MediaSend } from '@/modules/messaging/whatsapp/whatsapp.types';

// Evolution API v2 request bodies (docs/19 «Evolution driver», src/api/dto/sendMessage.dto.ts).
// `number` = the international digits; a reply quotes the message by its id (Evolution looks the
// message up in its own store and sends without the quote when it does not hold it).

export type EvolutionBody = Record<string, unknown>;

/** One send: Evolution's route and its body. */
export interface EvolutionSend {
  path: string;
  body: EvolutionBody;
}

const quoted = (replyTo: string | null | undefined): EvolutionBody =>
  replyTo ? { quoted: { key: { id: replyTo } } } : {};

/** POST /message/sendText/{instance}. */
export function textSend(input: {
  to: string;
  text: string;
  replyTo?: string | null;
}): EvolutionSend {
  const body = { number: waTo(input.to), text: input.text, ...quoted(input.replyTo) };
  return { path: 'message/sendText', body };
}

/** Evolution's mediatype per our kind; audio goes as a voice note (sendWhatsAppAudio) instead. */
const MEDIA_TYPE: Record<Exclude<WaSendKind, 'audio'>, string> = {
  image: 'image',
  video: 'video',
  document: 'document',
  sticker: 'image',
};

/** A voice note: POST /message/sendWhatsAppAudio/{instance} {number, audio: url}. */
const audioSend = (input: MediaSend): EvolutionSend => ({
  path: 'message/sendWhatsAppAudio',
  body: { number: waTo(input.to), audio: input.url, ...quoted(input.replyTo) },
});

/** POST /message/sendMedia/{instance} {number, mediatype, media: url, caption?, fileName?}. */
export function mediaSend(input: MediaSend): EvolutionSend {
  const kind = input.kind ?? 'document';
  if (kind === 'audio') return audioSend(input);
  const mediatype = MEDIA_TYPE[kind];
  const body = {
    number: waTo(input.to),
    mediatype,
    media: input.url,
    ...(input.caption ? { caption: input.caption } : {}),
    ...(mediatype === 'document' && input.filename ? { fileName: input.filename } : {}),
    ...quoted(input.replyTo),
  };
  return { path: 'message/sendMedia', body };
}

/** Cloud mode: POST /message/sendTemplate/{instance} {number, name, language, components}. */
export function templateSend(to: string, t: WabaTemplate): EvolutionSend {
  const components = wabaComponents(t);
  const body = { number: waTo(to), name: t.name, language: t.language, components };
  return { path: 'message/sendTemplate', body };
}

/** The number's sending options (wa_numbers.evolution_config.sending), as Evolution names them. */
interface SendOptions {
  delayMs: number;
  linkPreview: boolean;
}

/** `delay` (typing shown first) on every send; `linkPreview` on a text only. */
export function withOptions(send: EvolutionSend, opts: SendOptions): EvolutionSend {
  const delay = opts.delayMs > 0 ? { delay: opts.delayMs } : {};
  const preview = send.path === 'message/sendText' ? { linkPreview: opts.linkPreview } : {};
  return { path: send.path, body: { ...send.body, ...delay, ...preview } };
}
