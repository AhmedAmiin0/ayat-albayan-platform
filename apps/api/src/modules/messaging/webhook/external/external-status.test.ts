import { Logger } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { setNumbersOverlay } from '../../../../common/integrations/numbers-overlay';
import type { StatusEvent } from '../webhook.events';
import { outbound, services } from '../webhook.fakes';
import { KAPSO_NUMBER_ID, KAPSO_PHONE_ID, kapsoEnv, kapsoOverlay, kapsoText, SENT_AT } from './external.fakes';

// A status for a wamid we hold no row for (staff sent it from Kapso's inbox): read back and stored.

const LATER = new Date(SENT_AT.getTime() + 30_000);
const status = (over: Partial<StatusEvent> = {}): StatusEvent => ({
  waMessageId: 'wamid.EXT1', status: 'read', at: LATER, errorCode: null, errorText: null, conversationId: null, pricingCategory: null,
  line: 'chat', numberId: KAPSO_NUMBER_ID, phoneNumberId: KAPSO_PHONE_ID, ...over,
});

beforeEach(() => kapsoOverlay());
afterEach(() => {
  setNumbersOverlay(null);
  vi.restoreAllMocks();
});

describe('StatusService + ExternalStatus', () => {
  it('unknown wamid on a Kapso number → one outbound row with WhatsApp\'s time and the event status', async () => {
    const s = services();
    await s.statuses.handle(status());
    expect(s.external.kapso.message).toHaveBeenCalledWith(kapsoEnv(), 'wamid.EXT1');
    expect(s.queries.stored).toEqual([
      expect.objectContaining({
        direction: 'outbound', status: 'read', wa_message_id: 'wamid.EXT1', created_by: null, phone_e164: '+966501234567',
        created_at: SENT_AT.toISOString(), sent_at: SENT_AT.toISOString(), read_at: LATER.toISOString(), line: 'chat', number_id: KAPSO_NUMBER_ID,
      }),
    ]);
    expect(s.push.notifyAdmins).not.toHaveBeenCalled();
    expect(s.push.notifySales).not.toHaveBeenCalled();
    expect(s.leads.upsertByPhone).not.toHaveBeenCalled();
  });

  it('twice → still one row, and Kapso is not asked again once the row exists', async () => {
    const s = services();
    s.queries.outboundByWaId.mockImplementation(async () => (s.queries.stored.length ? outbound({ id: 'x', status: 'read', attempts: 0 }) : null));
    await s.statuses.handle(status());
    await s.statuses.handle(status());
    expect(s.queries.stored).toHaveLength(1);
    expect(s.external.kapso.message).toHaveBeenCalledTimes(1);
  });

  it('a row stored meanwhile (catch-up) is not duplicated: the insert finds the wamid, the status path runs', async () => {
    const s = services();
    s.queries.stored.push({ direction: 'outbound', phone_e164: '+966501234567', wa_message_id: 'wamid.EXT1', status: 'sent' });
    await s.statuses.handle(status());
    expect(s.queries.stored).toHaveLength(1);
    expect(s.queries.outboundByWaId).toHaveBeenCalledTimes(2);
  });

  it('known wamid → the status path unchanged, Kapso never called', async () => {
    const s = services();
    s.queries.outboundByWaId.mockResolvedValue(outbound());
    await s.statuses.handle(status({ waMessageId: 'wamid.OUT1' }));
    expect(s.queries.moveStatus).toHaveBeenCalledWith(expect.objectContaining({ id: 'msg-out-1', from: 'sent' }));
    expect(s.external.kapso.message).not.toHaveBeenCalled();
    expect(s.queries.stored).toEqual([]);
  });

  it('unknown wamid on a number that is not on Kapso (or no number id) → still ignored', async () => {
    const s = services();
    kapsoOverlay({ env: null });
    await s.statuses.handle(status());
    setNumbersOverlay(null);
    await s.statuses.handle(status({ phoneNumberId: 'meta-line' }));
    await s.statuses.handle(status({ phoneNumberId: undefined }));
    expect(s.external.kapso.message).not.toHaveBeenCalled();
    expect(s.queries.stored).toEqual([]);
  });

  it('Kapso read error → logged (no phone, no body), nothing stored, no throw: the webhook still answers 200', async () => {
    const warn = vi.spyOn(Logger.prototype, 'warn').mockImplementation(() => undefined);
    const s = services();
    s.external.kapso.message.mockRejectedValue(new Error('WhatsApp HTTP 500'));
    await expect(s.statuses.handle(status())).resolves.toBeUndefined();
    expect(s.queries.stored).toEqual([]);
    const logged = warn.mock.calls.map((c) => String(c[0])).join('\n');
    expect(logged).toContain('catch-up job retries');
    expect(logged).not.toContain('966501234567');
  });

  it('a later «failed» on a message sent outside the app moves it but never pushes reminder_failed', async () => {
    const s = services();
    s.queries.outboundByWaId.mockResolvedValue(outbound({ attempts: 0 }));
    await s.statuses.handle(status({ status: 'failed', errorCode: '131026' }));
    expect(s.queries.moveStatus).toHaveBeenCalled();
    expect(s.push.notifyAdmins).not.toHaveBeenCalled();
  });

  it('an inbound item or an unreadable message from Kapso is skipped', async () => {
    const s = services();
    s.external.kapso.message.mockResolvedValueOnce(kapsoText({ kapso: { direction: 'inbound' } })).mockResolvedValueOnce(null);
    await s.statuses.handle(status());
    await s.statuses.handle(status());
    expect(s.queries.stored).toEqual([]);
  });
});
