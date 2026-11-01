import type { IntegrationGroup, IntegrationKey } from './keys.js';

// Beside keys.ts (its 150-line cap): the group of every integration key. keys.ts builds
// INTEGRATION_KEYS from it; this file imports types only from there, so no runtime cycle.

/** Each key's group, in the form's order inside the group. */
export const GROUP_OF: Record<IntegrationKey, IntegrationGroup> = {
  WA_PROVIDER: 'wa_notifications',
  WA_API_BASE: 'wa_notifications',
  WA_API_VERSION: 'wa_notifications',
  WA_PHONE_NUMBER_ID: 'wa_notifications',
  WA_WABA_ID: 'wa_notifications',
  WA_APP_ID: 'wa_notifications',
  WA_ACCESS_TOKEN: 'wa_notifications',
  WA_APP_SECRET: 'wa_notifications',
  WA_VERIFY_TOKEN: 'wa_notifications',
  WA_CHAT_PROVIDER: 'wa_chat',
  WA_CHAT_PHONE_NUMBER_ID: 'wa_chat',
  WA_CHAT_WABA_ID: 'wa_chat',
  WA_CHAT_APP_ID: 'wa_chat',
  WA_CHAT_ACCESS_TOKEN: 'wa_chat',
  WA_CHAT_APP_SECRET: 'wa_chat',
  KAPSO_API_BASE: 'kapso',
  KAPSO_API_VERSION: 'kapso',
  KAPSO_API_KEY: 'kapso',
  KAPSO_WEBHOOK_SECRET: 'kapso',
  // The academy's self-hosted WA CRM (docs/19 «crm driver»): its public REST API, not a Meta proxy.
  WACRM_API_BASE: 'wacrm',
  WACRM_API_KEY: 'wacrm',
  WACRM_WEBHOOK_SECRET: 'wacrm',
  WA_ALLOWED_RECIPIENTS: 'wa_safety',
  WA_TEMPLATE_SYNC: 'wa_safety',
  // WhatsApp voice calls (docs/28): the staff device is the WebRTC peer; STUN (default a public
  // one) and an optional TURN whose shared secret (TURN REST, coturn use-auth-secret) mints
  // short-lived per-user credentials.
  CALLS_STUN_URLS: 'calls',
  CALLS_TURN_URLS: 'calls',
  CALLS_TURN_SECRET: 'calls',
  LIVEKIT_URL: 'livekit',
  LIVEKIT_API_KEY: 'livekit',
  LIVEKIT_API_SECRET: 'livekit',
  EXPO_API_BASE: 'expo',
  EXPO_ACCESS_TOKEN: 'expo',
  WEB_PUSH_VAPID_PUBLIC_KEY: 'web_push',
  WEB_PUSH_VAPID_PRIVATE_KEY: 'web_push',
  WEB_PUSH_SUBJECT: 'web_push',
  FX_API_URL: 'fx',
  // Google sync (docs/24): the owner's OAuth client; the refresh token never appears here (its
  // own Vault entry).
  GOOGLE_CLIENT_ID: 'google',
  GOOGLE_CLIENT_SECRET: 'google',
  // The chat's GIF panel (owner 2026-11-01); unset = the panel asks an admin for the key.
  GIPHY_API_KEY: 'giphy',
  // Stripe (docs/30, TEST BUILD ONLY): the API lists these with FEATURE_STRIPE=test only.
  STRIPE_ENABLED: 'stripe',
  STRIPE_API_KEY: 'stripe',
  STRIPE_WEBHOOK_SECRET: 'stripe',
  STRIPE_MAX_DISCOUNT_PCT: 'stripe',
};
