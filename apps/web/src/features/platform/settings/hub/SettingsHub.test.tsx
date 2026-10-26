import { counted } from '@ab/shared';
import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { answerHub, renderHub, settingsWith } from './hub-test-utils';
import { SettingsHub } from './SettingsHub';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/http/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

const H = t.settingsHub;
const search = () => screen.getByRole('searchbox', { name: t.config.search.label });

describe('SettingsHub (/admin/settings, R-MSG-01, docs/26b §1)', () => {
  afterEach(() => {
    apiFetch.mockReset();
    window.history.replaceState(null, '', '/');
  });

  it('the one title, the search, then the five-row table', async () => {
    answerHub(apiFetch, { settings: settingsWith({}) });
    renderHub(<SettingsHub />);
    expect(screen.getByRole('heading', { level: 1, name: t.settings.title })).toBeTruthy();
    expect(search().getAttribute('placeholder')).toBe(H.placeholder);
    expect(screen.getByRole('table', { name: H.caption })).toBeTruthy();
    expect(screen.getAllByRole('rowheader')).toHaveLength(5);
    expect(await screen.findByText(new RegExp(counted(H.valuesCount, 31)))).toBeTruthy();
  });

  it('says «5 أقسام» with the plural forms, and adds no frame of its own (the shell frames it)', () => {
    answerHub(apiFetch, {});
    const { container } = renderHub(<SettingsHub />);
    expect(screen.getByText(counted(H.sectionsCount, 5))).toBeTruthy();
    expect(counted(H.sectionsCount, 1)).toBe(H.sectionsCount.one);
    expect(container.querySelector('.\\@container')).toBeNull();
  });

  it('a search replaces the table with linked results', () => {
    answerHub(apiFetch, {});
    renderHub(<SettingsHub />);
    fireEvent.change(search(), { target: { value: 'upload_max_mb' } });
    expect(screen.queryByRole('table')).toBeNull();
    const link = screen.getAllByRole('link').find((a) => a.getAttribute('href')?.includes('group=uploads'));
    expect(link?.getAttribute('href')).toBe('/admin/settings/values?group=uploads&q=upload_max_mb');
  });

  it('nothing matches: «لا توجد إعدادات تطابق بحثك.»; clearing brings the table back', () => {
    answerHub(apiFetch, {});
    renderHub(<SettingsHub />);
    fireEvent.change(search(), { target: { value: 'zzzz-no-such-setting' } });
    expect(screen.getByRole('status').textContent).toBe(t.config.search.none);
    fireEvent.change(search(), { target: { value: '' } });
    expect(screen.getByRole('table')).toBeTruthy();
  });
});
