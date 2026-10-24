import { fireEvent, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { t } from '@/lib/i18n';
import { findRow, renderRules } from './rules-test-kit';

const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));
vi.mock('@tanstack/react-router', async (orig) => ({ ...(await orig<object>()), Link: (await import('@/features/inbox/test-utils')).MockLink }));
vi.mock('@/features/auth/use-permissions', () => ({
  usePermissions: () => ({ permissions: ['settings.read'], can: () => true }),
}));

const a = t.notificationCatalogue.audience;
const tab = (label: string) => screen.getByRole('tab', { name: new RegExp(label) });

afterEach(() => apiFetch.mockReset());

// «ماذا يُرسل الآن» on «نظرة عامة» opens «الإشعارات» on the row's audience (`?audience=`).
describe('«الإشعارات» first audience', () => {
  it('starts on guardians when none is given', async () => {
    renderRules({ apiFetch });
    await findRow('lesson_reminder');
    expect(tab(a.guardian).getAttribute('aria-selected')).toBe('true');
  });

  it('starts on the given audience, then the tabs switch locally', async () => {
    renderRules({ apiFetch, audience: 'teacher' });
    await findRow('teacher_lesson_reminder');
    expect(tab(a.teacher).getAttribute('aria-selected')).toBe('true');
    expect(tab(a.guardian).getAttribute('aria-selected')).toBe('false');
    fireEvent.click(tab(a.lead));
    expect(tab(a.lead).getAttribute('aria-selected')).toBe('true');
    expect(tab(a.teacher).getAttribute('aria-selected')).toBe('false');
  });
});
