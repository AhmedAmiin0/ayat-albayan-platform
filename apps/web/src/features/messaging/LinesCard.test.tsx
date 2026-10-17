import type { LineCheckView } from '@ab/shared';
import en from '@ab/shared/i18n/en.json';
import { fireEvent, screen, within } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderWithClient } from '@/features/inbox/test-utils';
import { t } from '@/lib/i18n';
import { LinesCard } from './LinesCard';

const apiSend = vi.hoisted(() => vi.fn());
const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch, apiSend }));
const lang = vi.hoisted(() => ({ en: false }));
vi.mock('@/lib/i18n', async (orig) => {
  const real = await orig<{ t: object }>();
  return {
    ...real,
    get t() {
      return lang.en ? en : real.t;
    },
  };
});

const s = t.templates.settings.lines;
const app = (id: string | null, uri: string | null = null) => ({ id, name: `app-${id ?? 'x'}`, override_callback_uri: uri });
const view = (patch: Partial<LineCheckView> = {}): LineCheckView => ({
  line: 'notifications',
  configured: true,
  phone_number_id: '1111',
  waba_id: '2222',
  app_id: 'ours',
  display_phone_number: '+1 555-000-1111',
  verified_name: 'Ayat',
  quality_rating: 'GREEN',
  status: 'CONNECTED',
  name_status: 'APPROVED',
  code_verification_status: 'NOT_VERIFIED',
  subscribed_apps: [app('ours')],
  errors: [],
  checked_at: '2026-10-10T08:00:00Z',
  provider: 'meta',
  gaps: [],
  duplicate_chat_phone: false,
  ...patch,
});
const row = (line: 'notifications' | 'chat') => {
  const el = screen.getAllByTestId('line-row').find((r) => r.getAttribute('data-line') === line);
  if (!el) throw new Error(`no row ${line}`);
  return within(el);
};
const toneOf = (el: HTMLElement) => el.closest('[data-tone]')?.getAttribute('data-tone');

async function checkWith(result: LineCheckView[]) {
  apiSend.mockResolvedValue(result);
  renderWithClient(<LinesCard />);
  fireEvent.click(screen.getByRole('button', { name: s.check }));
  await screen.findAllByText(new RegExp(s.checkedAt.replace('{time}', '')));
}

afterEach(() => {
  apiSend.mockReset();
  apiFetch.mockReset();
  lang.en = false;
});

describe('LinesCard (docs/12 §13.9–13.10, R-MSG-05)', () => {
  it('at rest: two rows, «not checked», no request, no role=status or role=alert', () => {
    renderWithClient(<LinesCard />);
    expect(screen.getAllByTestId('line-row').map((r) => r.getAttribute('data-line'))).toEqual(['notifications', 'chat']);
    expect(screen.getByText(s.notChecked)).toBeTruthy();
    expect(row('chat').getByText(t.enums.waLine.chat)).toBeTruthy();
    expect(apiSend).not.toHaveBeenCalled();
    expect(apiFetch).not.toHaveBeenCalled();
    expect(screen.queryAllByRole('status')).toHaveLength(0);
    expect(screen.queryAllByRole('alert')).toHaveLength(0);
  });

  it('a check posts once and shows the facts: number in an LTR island, raw Graph words with tones', async () => {
    await checkWith([view(), view({ line: 'chat', configured: false, ...NULLS })]);
    expect(apiSend).toHaveBeenCalledWith('POST', '/messaging/lines/check');
    const n = row('notifications');
    expect(n.getByText('+1 555-000-1111').closest('bdi')?.getAttribute('dir')).toBe('ltr');
    expect(n.getByText('2222').closest('bdi')?.getAttribute('dir')).toBe('ltr');
    expect(toneOf(n.getByText(s.configured))).toBe('ok');
    expect(toneOf(n.getByText('CONNECTED'))).toBe('ok');
    expect(toneOf(n.getByText('NOT_VERIFIED'))).toBe('neutral');
    expect(toneOf(n.getByText(s.subscribed))).toBe('ok');
    expect(screen.queryByText(s.notChecked)).toBeNull();
    const c = row('chat');
    expect(toneOf(c.getByText(s.notConfigured))).toBe('neutral');
    expect(c.queryByText(s.webhook)).toBeNull();
  });

  it('webhook states: none and other app are act, unverified is neutral with the apps listed', async () => {
    await checkWith([view({ subscribed_apps: [], status: 'FLAGGED' }), view({ line: 'chat', subscribed_apps: [app('crm')] })]);
    expect(toneOf(row('notifications').getByText(s.notSubscribed))).toBe('act');
    expect(toneOf(row('notifications').getByText('FLAGGED'))).toBe('act');
    expect(toneOf(row('chat').getByText(s.webhookOtherApp))).toBe('act');
  });

  it('an app the server cannot verify, with an override callback URL in an LTR island', async () => {
    const uri = 'https://crm.example.com/hook';
    await checkWith([view({ app_id: null, subscribed_apps: [app('crm', uri)] }), view({ line: 'chat', subscribed_apps: null })]);
    const n = row('notifications');
    expect(toneOf(n.getByText(s.webhookUnverified))).toBe('neutral');
    expect(n.getByText('app-crm · crm').closest('bdi')?.getAttribute('dir')).toBe('ltr');
    expect(n.getByText(uri).closest('bdi')?.getAttribute('dir')).toBe('ltr');
    expect(n.getByText(new RegExp(s.callbackOverride.replace('{url}', '').trim()))).toBeTruthy();
    expect(row('chat').queryByText(s.webhook)).toBeNull();
  });

  it('a failed Graph call is listed with Meta’s message', async () => {
    const errors = [{ step: 'phone' as const, code: 4242, message: 'Invalid OAuth access token' }];
    await checkWith([view({ errors, status: null, quality_rating: null }), view({ line: 'chat' })]);
    const item = row('notifications').getByText('Invalid OAuth access token').closest('li');
    expect(item?.textContent).toBe(`${s.callFailed.replace('{message}', 'Invalid OAuth access token')}(4242)`);
  });

  it('a rejected check shows a Toast and no role=alert', async () => {
    apiSend.mockRejectedValue(new Error('boom'));
    renderWithClient(<LinesCard />);
    fireEvent.click(screen.getByRole('button', { name: s.check }));
    expect((await screen.findByRole('status')).textContent).toContain(s.checkFailed);
    expect(screen.queryAllByRole('alert')).toHaveLength(0);
    expect(screen.getByText(s.notChecked)).toBeTruthy();
  });

  it('in English', async () => {
    lang.en = true;
    renderWithClient(<LinesCard />);
    expect(screen.getByRole('button', { name: 'Check lines' })).toBeTruthy();
    expect(screen.getByText('Not checked yet')).toBeTruthy();
    expect(screen.getByText('Chat line')).toBeTruthy();
  });
});

const NULLS = {
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
};
