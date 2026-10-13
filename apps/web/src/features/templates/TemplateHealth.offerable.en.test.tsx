import en from '@ab/shared/i18n/en.json';
import { screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { template } from '@/features/inbox/inbox-fixture';
import { renderWithClient, routeFetch } from '@/features/inbox/test-utils';
import { TemplateHealth } from './TemplateHealth';

vi.mock('@/lib/i18n', async (orig) => ({ ...(await orig<object>()), t: en }));
vi.mock('@/lib/locale', async (orig) => ({ ...(await orig<object>()), locale: 'en' }));
const apiFetch = vi.hoisted(() => vi.fn());
vi.mock('@/lib/api', async (orig) => ({ ...(await orig<object>()), apiFetch }));

// Owner 2026-10-13, in English: a lesson reminder has no switch; free_trial_invite keeps its own.

const REMINDER = template({ key: 'lesson_reminder_plain', meta_name: 'lesson_reminder_plain', sales_starter: true });
const INVITE = template({ key: 'free_trial_invite', meta_name: 'free_trial_invite', line: 'chat', sales_starter: true });

describe('template health — offerable switches, English', () => {
  it('no switch on the lesson reminder, one on free_trial_invite, and the reworded intro', async () => {
    routeFetch(apiFetch, [['/messaging/templates', [REMINDER, INVITE]]]);
    renderWithClient(<TemplateHealth headingId="h" />);
    await screen.findByText(en.templates.names.lesson_reminder_plain);
    expect(screen.getAllByRole('checkbox')).toHaveLength(1);
    expect(screen.getByRole('checkbox', { name: 'free_trial_invite: available to teachers and sales' })).toBeTruthy();
    expect(screen.queryByRole('checkbox', { name: `${en.templates.names.lesson_reminder_plain}: available to teachers and sales` })).toBeNull();
    expect(screen.getByText(en.templates.salesStarterIntro).textContent).toContain('never offered to these roles');
  });
});
