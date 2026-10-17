import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n';
import { LineDriver } from './LineDriver';

const s = t.templates.settings.lines;

describe('LineDriver (docs/19)', () => {
  it('names the provider and nothing else when the line can send', () => {
    render(<LineDriver view={{ provider: 'meta', gaps: [], duplicate_chat_phone: false }} />);
    expect(screen.getByText(t.integrations.options.meta)).toBeTruthy();
    expect(screen.queryByText(s.gaps.split('{keys}')[0] ?? '', { exact: false })).toBeNull();
    expect(screen.queryByText(s.duplicateChatPhone)).toBeNull();
  });

  it('a half-configured kapso line names the missing keys, never a value', () => {
    const { container } = render(<LineDriver view={{ provider: 'kapso', gaps: ['KAPSO_API_BASE', 'KAPSO_API_KEY'], duplicate_chat_phone: false }} />);
    expect(screen.getByText(t.integrations.options.kapso)).toBeTruthy();
    expect(screen.getByText('KAPSO_API_BASE, KAPSO_API_KEY')).toBeTruthy();
    expect(container.textContent).toContain(s.provider);
  });

  it('the missing-keys island wraps at phone width (not nowrap)', () => {
    render(<LineDriver view={{ provider: 'kapso', gaps: ['WA_CHAT_PHONE_NUMBER_ID', 'WA_CHAT_WABA_ID', 'KAPSO_API_KEY'], duplicate_chat_phone: false }} />);
    const island = screen.getByText('WA_CHAT_PHONE_NUMBER_ID, WA_CHAT_WABA_ID, KAPSO_API_KEY');
    expect(island.className).not.toContain('whitespace-nowrap');
    expect(island.className).toContain('whitespace-normal');
    expect(island.className).toContain('break-all');
  });

  it('a duplicate chat phone id is said in its own Arabic sentence, not as a key', () => {
    render(<LineDriver view={{ provider: 'meta', gaps: [], duplicate_chat_phone: true }} />);
    expect(screen.getByText(s.duplicateChatPhone)).toBeTruthy();
    expect(screen.queryByText(/same as/)).toBeNull();
  });
});
