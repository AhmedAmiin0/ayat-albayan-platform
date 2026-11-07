import { renderTemplateBody } from '@ab/shared';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  CRM_REMINDER_BODY, FOOTER, LINE, REMINDER_COPY, REMINDER_MEET, reminderRow, sentViews,
} from './crm-sent.fakes';

// Owner 2026-11-07: «the reminder is not right»: a row sent through the CRM shows the CRM's text.

const sentText = renderTemplateBody(CRM_REMINDER_BODY, { 1: 'محمد', 2: LINE });

describe('MessageViews on a crm line: the teacher reminder', () => {
  beforeEach(() => vi.stubEnv('WA_PROVIDER', 'crm'));
  afterEach(() => vi.unstubAllEnvs());

  it('shows the CRM template teacher_lesson_reminder with the full line, its footer and NO button', async () => {
    const { views, find } = sentViews([REMINDER_MEET], REMINDER_COPY);
    const v = await views.view(reminderRow({ status: 'sent' }));
    expect(find).toHaveBeenCalledWith('teacher_lesson_reminder', 'ar');
    expect(v.body).toBe(sentText);
    expect(v.template).toEqual({ header: null, footer: FOOTER, buttons: [] });
    expect(v.click_to_chat).toBeNull();
  });

  it('a failed row hands off the same sent text on wa.me', async () => {
    const { views } = sentViews([REMINDER_MEET], REMINDER_COPY);
    const v = await views.view(reminderRow({ status: 'failed' }));
    const text = decodeURIComponent(new URL(v.click_to_chat ?? 'x:').searchParams.get('text') ?? '');
    expect(text).toBe(`${sentText}\n\n${FOOTER}`);
  });

  it('no copy of the CRM template yet: the registry rendering as before', async () => {
    const { views } = sentViews([REMINDER_MEET], {});
    const v = await views.view(reminderRow({ status: 'sent' }));
    expect(v.body).toBe('حلقتك مع طالب الساعة 5:00 م');
    expect(v.template?.buttons).toEqual([{ type: 'url', text: 'ادخل الحلقة', url: 'https://meet.jit.si/ab-x1' }]);
  });

  it('values that would not build a send (a body value missing): the registry rendering', async () => {
    const { views } = sentViews([REMINDER_MEET], REMINDER_COPY);
    const v = await views.view(reminderRow({ template_params: { 1: 'طالب' } }));
    expect(v.body).toBe('حلقتك مع طالب الساعة {{2}}');
  });

  it('an imported row that stored its own text keeps it', async () => {
    const { views } = sentViews([REMINDER_MEET], REMINDER_COPY);
    expect((await views.view(reminderRow({ body: 'نص محفوظ' }))).body).toBe('نص محفوظ');
  });
});

describe('MessageViews on a meta line', () => {
  afterEach(() => vi.unstubAllEnvs());

  it('the same row is unchanged: the registry text and button', async () => {
    vi.stubEnv('WA_PROVIDER', 'meta');
    const { views, find } = sentViews([REMINDER_MEET], REMINDER_COPY);
    const v = await views.view(reminderRow({ status: 'sent' }));
    expect(v.body).toBe('حلقتك مع طالب الساعة 5:00 م');
    expect(v.template?.buttons).toHaveLength(1);
    expect(find).not.toHaveBeenCalled();
  });
});
