import en from '@ab/shared/i18n/en.json';
import { render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { ServerGateNote } from './ServerGateNote';

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

afterEach(() => {
  lang.en = false;
});

describe('ServerGateNote: the staging allow-list (docs/12 §13.5)', () => {
  it('says sending is limited to test numbers when the gate is restricted', () => {
    render(<ServerGateNote gate={{ open: true, reason: null, queued: 0, restricted: true }} />);
    expect(screen.getByText(t.templates.settings.recipientsRestricted)).toBeTruthy();
  });

  it('no note when the key is absent or false', () => {
    render(
      <>
        <ServerGateNote gate={{ open: true, reason: null, queued: 0 }} />
        <ServerGateNote gate={{ open: true, reason: null, queued: 0, restricted: false }} />
      </>,
    );
    expect(screen.queryByText(t.templates.settings.recipientsRestricted)).toBeNull();
    expect(screen.queryAllByRole('alert')).toHaveLength(0);
  });

  it('in English', async () => {
    // ServerGateNote reads its strings at module load: load a fresh copy under the English bundle.
    lang.en = true;
    vi.resetModules();
    const { ServerGateNote: EnNote } = await import('./ServerGateNote');
    render(<EnNote gate={{ open: false, reason: 'switch_off', queued: 2, restricted: true }} />);
    expect(screen.getByText(en.templates.settings.recipientsRestricted)).toBeTruthy();
  });
});
