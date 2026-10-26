/** Meta's error on an inbound `unsupported` whose content it could not deliver: «This message is unavailable». */
export const META_UNAVAILABLE = 131060;

const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === 'object' && v !== null;

/**
 * Meta's `unsupported`: the message's content never reached the Cloud API (ask for it again). Not a
 * location, contact card or reaction: those did arrive, we only cannot show them («media.other»).
 */
export function isUnsupportedMessage(payload: unknown): payload is Record<string, unknown> {
  return isRecord(payload) && payload['type'] === 'unsupported';
}

/**
 * Whether an inbound row's stored payload (messages.interactive_payload, as the webhook keeps it:
 * `{ type: 'unsupported', errors: [{ code }], unsupported }`) is Meta's 131060: typically the first
 * message to a number in coexistence with the WhatsApp Business app. Its content never reaches the
 * Cloud API but shows in that app on the academy phone; the bubble says so and can ask for it again.
 */
export function isUnavailableMessage(payload: unknown): boolean {
  if (!isUnsupportedMessage(payload)) return false;
  const errors = payload['errors'];
  const first: unknown = Array.isArray(errors) ? errors[0] : undefined;
  return isRecord(first) && Number(first['code']) === META_UNAVAILABLE;
}
