import { render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { MetaReady } from './MetaReady';

const s = t.templates.settings.lines;

describe('MetaReady (docs/19 «CRM → Meta»)', () => {
  it('all set: three «ok» sentences under the title', () => {
    render(<MetaReady ready={{ app_secret: true, verify_token: true, app_subscribed: true }} />);
    expect(screen.getByText(s.metaReady)).toBeTruthy();
    expect(screen.getByText(s.metaAppSecretSet).className).toContain('text-ok');
    expect(screen.getByText(s.metaVerifyTokenSet)).toBeTruthy();
    expect(screen.getByText(s.metaAppSubscribed)).toBeTruthy();
  });

  it('what is missing reads as the admin\'s turn; an unknown subscription is left out', () => {
    render(<MetaReady ready={{ app_secret: false, verify_token: false, app_subscribed: null }} />);
    expect(screen.getByText(s.metaAppSecretMissing).className).toContain('text-act');
    expect(screen.getByText(s.metaVerifyTokenMissing)).toBeTruthy();
    expect(screen.queryByText(s.metaAppSubscribed)).toBeNull();
    expect(screen.queryByText(s.metaAppNotSubscribed)).toBeNull();
  });

  it('nothing without the block (a kapso line, an older server)', () => {
    const { container } = render(<MetaReady ready={undefined} />);
    expect(container.textContent).toBe('');
  });
});
