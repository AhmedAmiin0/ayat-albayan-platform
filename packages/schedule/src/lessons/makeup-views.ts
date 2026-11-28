// Chat media API shapes (R-MSG-06). Snake_case like every row;
// instants are ISO-8601 UTC strings.

/**
 * GET /threads/:phone/media: an inbound image or PDF of that chat (metadata only, nothing
 * downloaded).
 */
export interface ThreadMediaItem {
  message_id: string;
  created_at: string;
  mime: string;
  caption: string | null;
  /**
   * Older than WhatsApp keeps the file (about 30 days) and never cached: it cannot be fetched any
   * more.
   */
  expired: boolean;
}
