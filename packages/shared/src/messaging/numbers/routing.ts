import type { WaLine } from '@ab/catalog';

// Routing per number (docs/23 §3 phase 5, contract docs/23c). Pure: the API feeds it the loaded numbers
// and approvals. Used ONLY while settings.comms_source = 'module'; legacy keeps lineOf() / replyLine().

/** What routing needs of one wa_numbers row (no credentials: `sendable` says whether it can send now). */
export interface RoutableNumber {
  id: string;
  purpose: WaLine;
  enabled: boolean;
  is_default: boolean;
  fallback_rank: number;
  created_at: string;
  /** Enabled AND its credentials make a working client (checked by the API, never a secret here). */
  sendable: boolean;
}

export interface TemplateRouteInput {
  numbers: readonly RoutableNumber[];
  /** The catalogue row's number (notification_rules.number_id); null = none chosen. */
  ruleNumberId: string | null;
  /** message_templates.number_id; null = the role's default. */
  templateNumberId: string | null;
  /** message_templates.line: the role whose default and fallbacks come after. */
  line: WaLine;
  /** Is this template approved on that number (one Meta template per WABA)? */
  approvedOn: (numberId: string) => boolean;
}

/** The role's numbers in fallback order: the default first, then fallback_rank, then age. */
export function roleOrder(numbers: readonly RoutableNumber[], line: WaLine): RoutableNumber[] {
  return numbers
    .filter((n) => n.purpose === line)
    .sort((a, b) => Number(b.is_default) - Number(a.is_default) || a.fallback_rank - b.fallback_rank || a.created_at.localeCompare(b.created_at));
}

/** Every candidate in order, each id once: rule → template → role default → role fallbacks. */
export function templateCandidates(input: TemplateRouteInput): string[] {
  const ids = [input.ruleNumberId, input.templateNumberId, ...roleOrder(input.numbers, input.line).map((n) => n.id)];
  return [...new Set(ids.filter((id): id is string => id !== null))];
}

/**
 * The number a template row leaves from: the first candidate that is enabled, can send and has the
 * template approved. null = none: the row stays queued, untouched (fail closed, like an unconfigured line).
 */
export function routeTemplate(input: TemplateRouteInput): string | null {
  const byId = new Map(input.numbers.map((n) => [n.id, n]));
  for (const id of templateCandidates(input)) {
    const n = byId.get(id);
    if (n?.enabled && n.sendable && input.approvedOn(id)) return id;
  }
  return null;
}

/**
 * The number a session text / file leaves from: the number it was stamped with at enqueue, else the
 * default of its line. Never another number: Meta allows a session message only inside THAT number's
 * 24 h window. null = it cannot leave now (stays queued).
 */
export function routeSession(numbers: readonly RoutableNumber[], at: { numberId: string | null; line: WaLine }): string | null {
  const id = at.numberId ?? numbers.find((n) => n.purpose === at.line && n.is_default && n.enabled)?.id ?? null;
  const n = id === null ? undefined : numbers.find((x) => x.id === id);
  return n?.enabled && n.sendable ? n.id : null;
}
