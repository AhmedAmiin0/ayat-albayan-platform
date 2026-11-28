import type { NumberPurpose } from '@ab/catalog';

/**
 * The number a message came in on (messages.number_id → wa_numbers): it decides who can fetch its
 * media.
 */
export interface MediaNumber { id: string; provider: string; purpose: NumberPurpose }

/** The columns of an inbound message that carry a file (R-MSG-06). */
export interface MediaMessage {
  id: string;
  phone_e164: string;
  direction: 'inbound' | 'outbound';
  media_id: string | null;
  media_mime: string | null;
  media_path: string | null;
  /** A final refusal of the file (media-refusal.ts), answered on later views with no fetch. */
  media_refusal?: string | null;
  /** The file's caption. */
  body: string | null;
  media_name?: string | null;
  created_at: string;
  /**
   * The receiving line: its token is the only one that can fetch the media id (null =
   * notifications; calls = the calls number).
   */
  line: NumberPurpose | null;
  /**
   * Its number (null = not stamped: legacy rows); the old CRM number's history is stamped with it.
   */
  number?: MediaNumber | null;
  /** Its file is refused like an unknown message. */
  hidden_at?: string | null;
  /** Meta's message part ({type, [type]: …}); a «sticker» is never a receipt (receiptMime). */
  interactive_payload?: unknown;
}

/**
 * A cached inbound voice note or video, for the 30-day purge (WaMediaRetentionJob); always a Meta
 * media id.
 */
export interface CachedMedia {
  id: string;
  media_path: string;
  media_mime: string | null;
  media_id: string | null;
}
