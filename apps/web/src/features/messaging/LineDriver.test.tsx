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

  it('a half-configured kapso line names what it lacks by its Arabic label, never a key or a value', () => {
    const { container } = render(<LineDriver view={{ provider: 'kapso', gaps: ['KAPSO_API_BASE', 'KAPSO_API_KEY'], duplicate_chat_phone: false }} />);
    expect(screen.getByText(t.integrations.options.kapso)).toBeTruthy();
    const keys = t.integrations.keys;
    expect(container.textContent).toContain(`${keys.KAPSO_API_BASE.label}${t.common.listSeparator}${keys.KAPSO_API_KEY.label}`);
    expect(container.textContent).not.toContain('KAPSO_API_KEY');
    expect(container.textContent).toContain(s.provider);
  });

  it('a key outside the registry stays an LTR island that wraps at phone width (not nowrap)', () => {
    render(<LineDriver view={{ provider: 'kapso', gaps: ['WA_CHAT_PHONE_NUMBER_ID', 'SOME_NEW_KEY'], duplicate_chat_phone: false }} />);
    const island = screen.getByText('SOME_NEW_KEY');
    expect(island.className).not.toContain('whitespace-nowrap');
    expect(island.className).toContain('whitespace-normal');
    expect(island.className).toContain('break-all');
  });

  it('a duplicate chat phone id is said in its own Arabic sentence, not as a key', () => {
    render(<LineDriver view={{ provider: 'meta', gaps: [], duplicate_chat_phone: true }} />);
    expect(screen.getByText(s.duplicateChatPhone)).toBeTruthy();
    expect(screen.queryByText(/same as/)).toBeNull();
  });

  it('a crm line: «نظام CRM», and whether its key may send (unknown = nothing said)', () => {
    const { rerender } = render(<LineDriver view={{ provider: 'crm', gaps: [], duplicate_chat_phone: false, crm_send_scope: false }} />);
    expect(screen.getByText(t.integrations.options.crm)).toBeTruthy();
    expect(screen.getByText(s.crmScopeMissing)).toBeTruthy();
    rerender(<LineDriver view={{ provider: 'crm', gaps: [], duplicate_chat_phone: false, crm_send_scope: true }} />);
    expect(screen.getByText(s.crmScopeOk)).toBeTruthy();
    rerender(<LineDriver view={{ provider: 'crm', gaps: ['WACRM_API_KEY'], duplicate_chat_phone: false, crm_send_scope: null }} />);
    expect(screen.queryByText(s.crmScopeOk)).toBeNull();
    expect(screen.queryByText(s.crmScopeMissing)).toBeNull();
    expect(document.body.textContent).toContain(t.integrations.keys.WACRM_API_KEY.label);
  });
});

