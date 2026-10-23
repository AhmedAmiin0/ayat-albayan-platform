import { SETTING_DEFAULTS } from '@ab/shared';
import { Test, type TestingModule } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AppModule } from '../../app.module';
import { fakeSettings } from '../../common/settings/settings.fakes';
import { SettingsService } from '../../common/settings/settings.service';
import { ClassroomSettings } from '../classroom/classroom.settings';
import { DashboardSettings } from '../dashboard/dashboard.settings';
import { ExpensesSettings } from '../expenses/expenses.settings';
import { FeedbackSettings } from '../feedback/feedback.settings';
import { FollowUpsSettings } from '../follow-ups/follow-ups.settings';
import { FxSettings } from '../fx/fx.settings';
import { InvoicesSettings } from '../invoices/invoices.settings';
import { LeadsSettings } from '../leads/leads.settings';
import { LessonRatingSettings } from '../lesson-rating/lesson-rating.settings';
import { NotificationRulesSettings } from '../notification-rules/notification-rules.settings';
import { RulesService } from '../notification-rules/rules.service';
import { PaymentsSettings } from '../payments/payments.settings';
import { PayoutsSettings } from '../payouts/payouts.settings';
import { ReceivablesSettings } from '../receivables/receivables.settings';
import { RemindersSettings } from '../reminders/reminders.settings';
import { ReportPdfSettings } from '../report-pdf/report-pdf.settings';
import { ReportsSettings } from '../reports/reports.settings';
import { WebhookSettings } from '../webhook/webhook.settings';
import { SendGate } from './send-gate';
import { WhatsappSettings } from './whatsapp.settings';

// The classroom, reports, messaging and money readers as AppModule wires them: each resolves and reads the one
// SettingsService (here a fake), and SendGate (provided by WhatsappModule only) reads through WhatsappSettings.

const READERS = [
  ClassroomSettings, ReportsSettings, ReportPdfSettings, WhatsappSettings, NotificationRulesSettings, WebhookSettings,
  RemindersSettings, FollowUpsSettings, LeadsSettings, LessonRatingSettings, FeedbackSettings, PayoutsSettings,
  DashboardSettings, ExpensesSettings, ReceivablesSettings, FxSettings, InvoicesSettings, PaymentsSettings,
];

describe('settings readers inside AppModule', () => {
  const store = fakeSettings({ auto_messages_enabled: true, fx_fresh_hours: 6 });
  let mod: TestingModule;
  beforeAll(async () => {
    vi.stubGlobal('fetch', vi.fn(async () => new Response('{}')));
    mod = await Test.createTestingModule({ imports: [AppModule] }).overrideProvider(SettingsService).useValue(store).compile();
  });
  afterAll(async () => {
    await mod.close();
    vi.unstubAllGlobals();
  });

  it.each(READERS.map((R) => [R.name, R] as const))('%s resolves and answers its slice of the store', async (_name, Reader) => {
    const values: object = await mod.get<{ read(): Promise<object> }>(Reader, { strict: false }).read();
    const all = { ...SETTING_DEFAULTS, auto_messages_enabled: true, fx_fresh_hours: 6 };
    expect(Object.keys(values).length).toBeGreaterThan(0);
    expect(values).toEqual(Object.fromEntries(Object.keys(values).map((k) => [k, all[k as keyof typeof all]])));
  });

  it('SendGate reads the store through WhatsappSettings; RulesService resolves with its reader', async () => {
    await expect(mod.get(SendGate, { strict: false }).automaticOn()).resolves.toBe(true);
    expect(mod.get(RulesService, { strict: false })).toBeInstanceOf(RulesService);
    expect(store.all).toHaveBeenCalled();
  });
});
