const SECRET = { set: false, updated_at: null };

export const NUMBER = {
  id: '6f1c2a40-0b7e-4c2f-9d1a-3e5b7c9d1f20',
  label: 'Chat',
  purpose: 'chat',
  provider: 'meta',
  phone_number_id: '1001',
  waba_id: null,
  app_id: null,
  display_phone_e164: null,
  enabled: false,
  is_default: false,
  fallback_rank: 0,
  health: null,
  checked_at: null,
  updated_at: '2026-11-27T10:00:00.000Z',
  secrets: {
    access_token: { set: true, updated_at: '2026-11-27T10:00:00.000Z' },
    app_secret: SECRET,
    evolution_token: SECRET,
    evolution_cloud_token: SECRET,
    evolution_proxy_password: SECRET,
  },
  evolution: null,
};

export const IMPORT = {
  dry_run: true,
  changed: false,
  roles: [
    {
      role: 'chat',
      action: 'create',
      number_id: null,
      fields: [{ field: 'waba_id', secret: false, source: 'env', value: '12' }],
      secrets_to_copy: ['access_token'],
    },
    {
      role: 'notifications',
      action: 'unconfigured',
      number_id: null,
      fields: [],
      secrets_to_copy: [],
      not_importable: { reason: 'invalid_id', fields: ['app_id'] },
    },
  ],
};
