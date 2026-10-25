// Test fixtures (not shipped behaviour): module-mode numbers for the reply-per-number tests (docs/23c).
import type { OverlayNumber } from '../../../common/integrations/numbers-overlay';
import type { WhatsappEnv } from '../../../config/env/env';

/** A fake line env: only "is it null" matters to routing. Never a real token. */
export const FAKE_ENV: WhatsappEnv = { base: 'http://wa-stub.test', version: 'v21.0', phoneNumberId: 'p', wabaId: 'w', accessToken: 'token-fake' };

export const overlayNumber = (over: Partial<OverlayNumber>): OverlayNumber => ({
  id: 'n',
  label: 'x',
  purpose: 'chat',
  phone_number_id: 'p',
  waba_id: null,
  enabled: true,
  is_default: false,
  fallback_rank: 100,
  created_at: '2026-10-01T00:00:00Z',
  env: FAKE_ENV,
  appSecret: null,
  ...over,
});

/** chat default, a second chat number, the notifications default, and a disabled chat number. */
export const CHAT_DEFAULT = overlayNumber({ id: 'num-chat', is_default: true });
export const CHAT_TWO = overlayNumber({ id: 'num-chat-2', phone_number_id: 'p2' });
export const NOTIF_DEFAULT = overlayNumber({ id: 'num-notif', purpose: 'notifications', is_default: true });
export const CHAT_OFF = overlayNumber({ id: 'num-off', enabled: false });
export const NUMBERS = [CHAT_DEFAULT, CHAT_TWO, NOTIF_DEFAULT, CHAT_OFF];
