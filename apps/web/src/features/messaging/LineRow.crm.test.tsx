import type { LineCheckView } from '@ab/shared';
import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { LineRow } from './LineRow';

// docs/19 «crm driver»: a crm line shows «نظام CRM», whether its key may send, where ticks come from, and
// a refused key in the CRM's own words. No Meta ids (the number is the CRM's).

const s = t.templates.settings.lines;
const crmView: LineCheckView = {
  line: 'notifications',
  configured: true,
  provider: 'crm',
  gaps: [],
  duplicate_chat_phone: false,
  crm_send_scope: true,
  crm_webhook_secret: true,
  phone_number_id: null,
  waba_id: null,
  app_id: null,
  display_phone_number: null,
  verified_name: null,
  quality_rating: null,
  status: null,
  name_status: null,
  code_verification_status: null,
  subscribed_apps: null,
  errors: [],
  checked_at: '2026-10-25T08:00:00Z',
};

describe('LineRow on a crm line', () => {
  it('the driver, its scope and the neutral webhook sentence; no Meta ids', () => {
    render(<LineRow line="notifications" view={crmView} />);
    expect(screen.getByText(t.integrations.options.crm)).toBeTruthy();
    expect(screen.getByText(s.crmScopeOk)).toBeTruthy();
    expect(screen.getByText(s.webhookCrm).closest('[data-tone]')?.getAttribute('data-tone')).toBe('neutral');
    expect(screen.queryByText(s.phoneNumberId)).toBeNull();
  });

  it('no webhook secret = act; a refused key is said in the CRM\'s words', () => {
    const errors: LineCheckView['errors'] = [{ step: 'crm_me', code: null, message: 'CRM refused the API key', credential: 'crm' }];
    render(<LineRow line="notifications" view={{ ...crmView, crm_webhook_secret: false, crm_send_scope: null, errors }} />);
    expect(screen.getByText(s.webhookCrmNoSecret).closest('[data-tone]')?.getAttribute('data-tone')).toBe('act');
    expect(screen.getByText(t.templates.error.crm_auth)).toBeTruthy();
  });
});
