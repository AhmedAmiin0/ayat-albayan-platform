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
};

describe('LineRow on a kapso line', () => {
  it('shows «Kapso» as the driver and the neutral Kapso webhook note, never «app id not set»', () => {
    render(<LineRow line="notifications" view={kapsoView} />);
    expect(screen.getByText(t.integrations.options.kapso)).toBeTruthy();
    const note = screen.getByText(s.webhookKapso);
    expect(note.closest('[data-tone]')?.getAttribute('data-tone')).toBe('neutral');
    expect(screen.queryByText(s.webhookUnverified)).toBeNull();
  });
});
