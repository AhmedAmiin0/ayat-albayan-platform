import { envelope, type GraphBody } from '@/modules/messaging/whatsapp/messages/wa-components';
import type { VoiceUpload, WaSent } from '@/modules/messaging/whatsapp/whatsapp.types';
import { graphHttp, type GraphConn } from './graph';
import { uploadedMediaSchema } from './meta-shapes';

// A voice note by uploaded media id (2026-11-14): Meta's POST /{phone_number_id}/media, the same
// path, body and credential on Kapso's Meta proxy (graphHttp: bearer or x-api-key). Sent by link,
// Kapso re-uploaded the ogg as «audio/ogg; codecs=opus» and Meta refused it (131053).

/** The upload's `type`: bare, never with «; codecs=opus». */
export const VOICE_UPLOAD_TYPE = 'audio/ogg';

/** The client's own send (allow-list first, then POST /{phone}/messages). */
export type GraphPost = (to: string, build: () => GraphBody) => Promise<WaSent>;

interface VoiceById {
  to: string;
  id: string;
  replyTo?: string | null;
}

/** {type:'audio', audio:{id, voice:true}}; a reply carries the quoted wamid as context. */
export function voiceIdMessage(input: VoiceById): GraphBody {
  const context = input.replyTo ? { context: { message_id: input.replyTo } } : {};
  return { ...envelope(input.to), type: 'audio', audio: { id: input.id, voice: true }, ...context };
}

/** multipart: messaging_product, type and the file part voice.ogg (audio/ogg). */
export function voiceForm(ogg: Uint8Array): FormData {
  const form = new FormData();
  form.set('messaging_product', 'whatsapp');
  form.set('type', VOICE_UPLOAD_TYPE);
  form.set('file', new Blob([new Uint8Array(ogg)], { type: VOICE_UPLOAD_TYPE }), 'voice.ogg');
  return form;
}

/** The line's voice note uploader: the upload, then the send through the client's own post. */
export function graphVoice(conn: GraphConn, post: GraphPost): VoiceUpload {
  return {
    upload: async (ogg) => {
      const path = `${conn.env.phoneNumberId}/media`;
      const call = { path, method: 'POST', form: voiceForm(ogg), schema: uploadedMediaSchema } as const;
      const res = await graphHttp(conn).json(call);
      return res.id;
    },
    send: (input) => post(input.to, () => voiceIdMessage(input)),
  };
}
