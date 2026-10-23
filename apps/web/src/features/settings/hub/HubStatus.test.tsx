import { counted } from '@ab/shared';
import { screen, waitFor } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { fill } from '@/features/google-sync/google-format';
import { t } from '@/lib/i18n';
import { THEME_KEY } from '@/lib/theme';
import { answerHub, googleStatus, item, renderHub, settingsWith } from './hub-test-utils';
import { HubStatus } from './HubStatus';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const H = t.settingsHub;
const GATE_OPEN = { open: true, reason: null, queued: 0 } as const;

describe('HubStatus («الحالة الآن» of each hub row)', () => {
  afterEach(() => {
    apiFetch.mockReset();
    localStorage.clear();
  });

  it('«القيم»: the counts from GET /settings', async () => {
    answerHub(apiFetch, { settings: settingsWith({ late_cancel_hours: 99 }) });
    renderHub(<HubStatus destination="values" />);
    expect(await screen.findByText(new RegExp(fill(H.valuesModified, { n: 1 })))).toBeTruthy();
  });

  it('«التواصل» off: the struck chip and why', async () => {
    answerHub(apiFetch, { settings: settingsWith({ messaging_enabled: false }), gate: GATE_OPEN });
    renderHub(<HubStatus destination="communications" />);
    expect(await screen.findByText(t.templates.settings.off)).toBeTruthy();
    expect(screen.getByText(H.sendingOffWhy)).toBeTruthy();
    expect(document.querySelector('[data-glyph="struck"]')).toBeTruthy();
  });

  it('«التواصل» on: the server gate decides the word; no reason line', async () => {
    answerHub(apiFetch, { settings: settingsWith({ messaging_enabled: true }), gate: GATE_OPEN });
    renderHub(<HubStatus destination="communications" />);
    expect(await screen.findByText(t.templates.settings.on)).toBeTruthy();
    expect(screen.queryByText(H.sendingOffWhy)).toBeNull();
  });

  it('«التكاملات» and «مزامنة Google» from their reads', async () => {
    answerHub(apiFetch, { integrations: [item('FX_API_URL', 'fx', { set: true })], google: googleStatus() });
    renderHub(
      <>
        <HubStatus destination="integrations" />
        <HubStatus destination="google" />
      </>,
    );
    expect(await screen.findByText(counted(H.servicesOk, 1))).toBeTruthy();
    expect(screen.getByText(counted(H.servicesUnset, 3))).toBeTruthy();
    expect(await screen.findByText(t.googleSync.connection.status.connected)).toBeTruthy();
    expect(screen.getByText(t.googleSync.switches.dryRun)).toBeTruthy();
  });

  it('a forbidden or failed read is a dash, never a crash', async () => {
    answerHub(apiFetch, {});
    renderHub(
      <>
        <HubStatus destination="values" />
        <HubStatus destination="communications" />
        <HubStatus destination="integrations" />
        <HubStatus destination="google" />
      </>,
    );
    await waitFor(() => expect(apiFetch).toHaveBeenCalledWith('/admin/google/status'));
    await waitFor(() => expect(screen.getAllByText(H.unknown)).toHaveLength(4));
  });

  it('«المظهر»: the theme of this browser', () => {
    localStorage.setItem(THEME_KEY, 'dark');
    renderHub(<HubStatus destination="appearance" />);
    expect(screen.getByText(fill(H.themeNow, { theme: t.theme.dark }))).toBeTruthy();
  });
});
