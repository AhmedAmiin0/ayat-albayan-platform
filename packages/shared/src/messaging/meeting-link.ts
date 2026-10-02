// Which link-button template family a lesson's meeting link fits (R-LES-01/02): the approved
// templates carry a URL button whose parameter is the part after the host.

export type MeetingHost = 'jitsi' | 'meet';

export interface MeetingLinkParts {
  /** null: no link, an unknown host (Zoom, …) or a bare host → the plain template. */
  host: MeetingHost | null;
  /** The Jitsi room slug or the Meet code; null whenever host is null. */
  slug: string | null;
}

const HOSTS: Record<string, MeetingHost> = {
  'meet.jit.si': 'jitsi',
  'meet.google.com': 'meet',
};

// No URL global here: @ab/shared also runs on Hermes, whose URL lacks hostname/pathname.
const LINK = /^https?:\/\/([^/?#]+)\/([^?#]*)/i;

/** meet.jit.si/<slug> → jitsi, meet.google.com/<code> → meet (query and trailing / ignored). */
export function meetingLinkParts(link: string | null | undefined): MeetingLinkParts {
  const [, host = '', path = ''] = LINK.exec(link?.trim() ?? '') ?? [];
  const known = HOSTS[host.toLowerCase()];
  const slug = path.replace(/\/+$/, '');
  return known && slug ? { host: known, slug } : { host: null, slug: null };
}
