import type { LineCheckView } from '@ab/shared';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { LineRow } from './LineRow';

// docs/19: a line on Kapso shows its driver, and its webhook row says inbound comes via Kapso.

const s = t.templates.settings.lines;
const kapsoView: LineCheckView = {
  line: 'notifications',
  configured: true,
  provider: 'kapso',
  gaps: [],
  duplicate_chat_phone: false,
  phone_number_id: '1111',
  waba_id: '2222',
  app_id: null,
  display_phone_number: null,
  verified_name: null,
  quality_rating: null,
  status: null,
  name_status: null,
  code_verification_status: null,
  subscribed_apps: [{ id: 'kapso-app', name: 'Kapso', override_callback_uri: null }],
  errors: [],
  checked_at: '2026-10-17T08:00:00Z',
  kapso_webhook_secret: true,
};

describe('LineRow on a kapso line', () => {
  it('shows «Kapso» as the driver and the neutral Kapso webhook note, never «app id not set»', () => {
    render(<LineRow line="notifications" view={kapsoView} />);
    expect(screen.getByText(t.integrations.options.kapso)).toBeTruthy();
    const note = screen.getByText(s.webhookKapso);
    expect(note.closest('[data-tone]')?.getAttribute('data-tone')).toBe('neutral');
    expect(screen.queryByText(s.webhookUnverified)).toBeNull();
  });

  it('2026-10-18: the API no longer asks Kapso for subscribed apps (its proxy 404s): still the Kapso note, no error', () => {
    render(<LineRow line="notifications" view={{ ...kapsoView, subscribed_apps: null }} />);
    expect(screen.getByText(s.webhookKapso)).toBeTruthy();
  });

  it('KAPSO_WEBHOOK_SECRET unset: the webhook row asks the admin to act', () => {
    render(<LineRow line="notifications" view={{ ...kapsoView, kapso_webhook_secret: false }} />);
    const note = screen.getByText(s.webhookKapsoNoSecret);
    expect(note.closest('[data-tone]')?.getAttribute('data-tone')).toBe('act');
    expect(screen.queryByText(s.webhookKapso)).toBeNull();
  });

  it('Kapso refusing its key reads messages.errors.kapso_auth, never the raw English message', () => {
    const errors: LineCheckView['errors'] = [{ step: 'phone', code: null, message: 'Kapso refused the API key: WhatsApp HTTP 401', credential: 'kapso' }];
    render(<LineRow line="notifications" view={{ ...kapsoView, errors }} />);
    expect(screen.getByText(t.messages.errors.kapso_auth)).toBeTruthy();
    expect(screen.queryByText(/Kapso refused the API key/)).toBeNull();
  });
});
