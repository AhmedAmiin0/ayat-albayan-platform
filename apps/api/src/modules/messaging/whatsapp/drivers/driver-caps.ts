import type { WhatsappEnv } from '@/config/env/env';

// What each driver can do (docs/19), read by capability instead of by driver name: the 24 h rule
// (the #629 hold, the reopen template, Kapso's reopen), reactions, a WABA template list and
// a voice note by uploaded media id.

interface DriverCaps {
  /** WhatsApp's 24 h customer-service window applies: free text only after the family wrote. */
  window24h: boolean;
  /** The driver can send a message reaction. */
  reactions: boolean;
  /** The driver lists the WABA's templates (sync, approvals). */
  templateList: boolean;
  /** POST /{phone}/media: a voice note goes by uploaded media id instead of by link. */
  mediaUpload: boolean;
}

const GRAPH: DriverCaps = {
  window24h: true, reactions: true, templateList: true, mediaUpload: true,
};
const NO_UPLOAD = { mediaUpload: false } as const;

/** Per driver; an Evolution instance per engine (Baileys: no window, no templates). */
const CAPS = {
  meta: GRAPH,
  kapso: GRAPH,
  crm: { window24h: true, reactions: false, templateList: false, ...NO_UPLOAD },
  evolution: {
    baileys: { window24h: false, reactions: false, templateList: false, ...NO_UPLOAD },
    cloud: { window24h: true, reactions: false, templateList: false, ...NO_UPLOAD },
  },
} as const;

/** A line's or number's capabilities; an unconfigured one (null) keeps Meta's rules. */
export function capsOf(env: WhatsappEnv | null | undefined): DriverCaps {
  if (env?.provider === 'evolution') return CAPS.evolution[env.mode];
  return env ? CAPS[env.provider ?? 'meta'] : GRAPH;
}

/** A number / line where free text goes at any time (an Evolution Baileys instance). */
export const windowless = (env: WhatsappEnv | null | undefined): boolean => !capsOf(env).window24h;
