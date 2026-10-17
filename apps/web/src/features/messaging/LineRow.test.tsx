import type { LineCheckView } from '@ab/shared';
import { render, screen, within } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { LineRow } from './LineRow';

const s = t.templates.settings.lines;
const view = (patch: Partial<LineCheckView> = {}): LineCheckView => ({
  line: 'notifications',
  configured: true,
  phone_number_id: '1111',
  waba_id: '2222',
  app_id: 'ours',
  display_phone_number: null,
  verified_name: null,
  quality_rating: null,
  status: null,
  name_status: null,
  code_verification_status: null,
  subscribed_apps: null,
  errors: [],
  checked_at: '2026-10-10T08:00:00Z',
  provider: 'meta',
  gaps: [],
  duplicate_chat_phone: false,
  ...patch,
});
const unconfigured = (line: LineCheckView['line']) => view({ line, configured: false, phone_number_id: null, waba_id: null, app_id: null });
const toneOf = (el: HTMLElement) => el.closest('[data-tone]')?.getAttribute('data-tone');

describe('LineRow (review W2, W4, W7)', () => {
  it('W2: a known Meta code is said in words with the code; Meta’s raw text stays as the title', () => {
    const message = 'Error validating access token: Session has expired';
    render(<LineRow line="notifications" view={view({ errors: [{ step: 'phone', code: 190, message }] })} />);
    const words = screen.getByText(t.messages.errors['190']);
    expect(screen.queryByText(message)).toBeNull();
    const item = words.closest('li');
    expect(item?.querySelector('[title]')?.getAttribute('title')).toBe(message);
    expect(within(item as HTMLElement).getByText('(190)').closest('bdi')?.getAttribute('dir')).toBe('ltr');
  });

  it('W2: permissions (10 / 200) in words; an unknown code falls back to Meta’s message', () => {
    const errors = [
      { step: 'phone' as const, code: 10, message: 'Permission denied' },
      { step: 'subscribed_apps' as const, code: null, message: 'Network down' },
    ];
    render(<LineRow line="chat" view={view({ line: 'chat', errors })} />);
    expect(screen.getByText(t.messages.errors['10'])).toBeTruthy();
    expect(screen.getByText('Network down')).toBeTruthy();
    expect(screen.getAllByRole('listitem')).toHaveLength(2);
  });

  it('W4: an unconfigured notifications line is act (struck); nothing can send', () => {
    render(<LineRow line="notifications" view={unconfigured('notifications')} />);
    expect(toneOf(screen.getByText(s.notConfigured))).toBe('act');
    expect(screen.queryByText(s.chatOptional)).toBeNull();
  });

  it('W4: an unconfigured chat line stays neutral with the «optional» hint', () => {
    render(<LineRow line="chat" view={unconfigured('chat')} />);
    expect(toneOf(screen.getByText(s.notConfigured))).toBe('neutral');
    expect(screen.getByText(s.chatOptional)).toBeTruthy();
  });

  it('W7: long app names and override URLs may wrap (phone width)', () => {
    const uri = 'https://api.staging.ayatalbayan.com/webhooks/whatsapp';
    const apps = [{ id: 'ours', name: 'Ayat Al-Bayan Academy production app', override_callback_uri: uri }];
    render(<LineRow line="notifications" view={view({ subscribed_apps: apps })} />);
    for (const text of [uri, 'Ayat Al-Bayan Academy production app · ours']) {
      const island = screen.getByText(text).closest('bdi');
      expect(island?.className).toContain('break-all');
      expect(island?.className).not.toContain('whitespace-nowrap');
    }
  });

  it('docs/19: a kapso line gets its own webhook note, never the Meta verdict blaming a missing app id', () => {
    const apps = [{ id: 'meta-app', name: 'Kapso', override_callback_uri: null }];
    render(<LineRow line="notifications" view={view({ provider: 'kapso', app_id: null, subscribed_apps: apps })} />);
    expect(screen.getByText(s.kapsoWebhook)).toBeTruthy();
    expect(screen.queryByText(s.webhookUnverified)).toBeNull();
    expect(screen.queryByText(s.webhook)).toBeNull();
  });

  it('a meta line keeps the Meta verdict', () => {
    render(<LineRow line="notifications" view={view({ app_id: null, subscribed_apps: [{ id: 'x', name: null, override_callback_uri: null }] })} />);
    expect(screen.getByText(s.webhookUnverified)).toBeTruthy();
    expect(screen.queryByText(s.kapsoWebhook)).toBeNull();
  });
});
