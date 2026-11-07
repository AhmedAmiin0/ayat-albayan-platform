import { SETTING_DEFAULTS } from '@ab/shared';
import { Test, type TestingModule } from '@nestjs/testing';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';
import { AppModule } from '@/app.module';
import { fakeSettings } from '@/common/settings/settings.fakes';
import { SettingsService } from '@/common/settings/settings.service';
import { ClassroomSettings } from '@/modules/teaching/classroom/classroom.settings';
import { DashboardSettings } from '@/modules/reporting/dashboard/dashboard.settings';
import { ExpensesSettings } from '@/modules/finance/expenses/expenses.settings';
import { FeedbackSettings } from '@/modules/teaching/feedback/feedback.settings';
import { FollowUpsSettings } from '@/modules/messaging/follow-ups/follow-ups.settings';
import { FxSettings } from '@/modules/finance/fx/fx.settings';
import { InvoicesSettings } from '@/modules/finance/invoices/invoices.settings';
import { LessonRatingSettings } from '@/modules/teaching/lesson-rating/lesson-rating.settings';
import { NotificationRulesSettings } from '@/modules/messaging/notification-rules/notification-rules.settings';
import { RulesService } from '@/modules/messaging/notification-rules/rules.service';
import { PaymentsSettings } from '@/modules/finance/payments/payments.settings';
import { PayoutsSettings } from '@/modules/finance/payouts/payouts.settings';
import { ReceivablesSettings } from '@/modules/finance/receivables/receivables.settings';
import { RemindersSettings } from '@/modules/messaging/reminders/reminders.settings';
import { ReportPdfSettings } from '@/modules/reporting/report-pdf/report-pdf.settings';
import { ReportsSettings } from '@/modules/reporting/reports/reports.settings';
import { WebhookSettings } from '@/modules/messaging/webhook/webhook.settings';
import { SendGate } from './gate/send-gate';
import { WhatsappSettings } from './whatsapp.settings';

// The classroom, reports, messaging and money readers as AppModule wires them: each resolves and reads the one
// SettingsService (here a fake). SendGate (provided by WhatsappModule only) reads its switches through
// WhatsappSettings straight from the DB, never from this store (docs/26 §5 26-P4).

const READERS = [
  ClassroomSettings, ReportsSettings, ReportPdfSettings, NotificationRulesSettings, WebhookSettings,
  RemindersSettings, FollowUpsSettings, LessonRatingSettings, FeedbackSettings, PayoutsSettings,
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

  it('SendGate never answers from the cached store (it says ON here); RulesService resolves with its reader', async () => {
    vi.mocked(store.all).mockClear();
    const auto = await mod.get(SendGate, { strict: false }).automaticOn().catch(() => false);
    expect(auto).toBe(false);
    expect(store.all).not.toHaveBeenCalled();
    expect(mod.get(WhatsappSettings, { strict: false })).toBeInstanceOf(WhatsappSettings);
    expect(mod.get(RulesService, { strict: false })).toBeInstanceOf(RulesService);
  });
});
