import { describe, expect, it } from 'vitest';
import { appSendable } from './app-send.rules';
import { ID, NOW, setup, staffText } from './app-send.test-util';

describe('appSendable: only a staff text the window stopped', () => {
  it.each([
    ['held', {}],
    ['failed reopen_failed', { status: 'failed', error_code: 'reopen_failed' }],
    ['failed hold_expired', { status: 'failed', error_code: 'hold_expired' }],
    ['failed 131047', { status: 'failed', error_code: '131047' }],
    ['unconfirmed (send it again)', { status: 'failed', error_code: 'app_send_unconfirmed' }],
    ['a row never routed (line null)', { line: null }],
  ])('%s: allowed', (_name, over) => {
    expect(appSendable(staffText(over))).toBe(true);
  });

  it.each([
    ['a job row (no staff)', { created_by: null }],
    ['a file', { media_path: 'out/u1/r1/a.jpg', media_mime: 'image/jpeg' }],
    ['a template', { template_key: 'welcome_greeting' }],
    ['claimed by the sender', { error_code: 'sending' }],
    ['sent', { status: 'sent', error_code: null }],
    ['failed for another reason', { status: 'failed', error_code: 'network' }],
    ['the calls number', { line: 'calls' }],
    ['the notifications line (no echo comes back)', { line: 'notifications' }],
    ['the crm line', { line: 'crm' }],
    ['inbound', { direction: 'inbound' }],
    ['a wamid (131047 after WhatsApp took it)', { status: 'failed', error_code: '131047', wa_message_id: 'wamid.X' }],
  ])('%s: refused', (_name, over) => {
    expect(appSendable(staffText(over))).toBe(false);
  });
});

describe('AppSend.start', () => {
  it('a window of 10 minutes, compare-and-set on the status and code it read', async () => {
    const { svc, repo } = setup(staffText());
    const out = await svc.start(ID, NOW);
    expect(repo.start).toHaveBeenCalledWith({
      id: ID,
      status: 'queued',
      errorCode: 'awaiting_reply',
      until: new Date('2026-11-06T10:10:00Z'),
    });
    expect(out.view).toMatchObject({ app_send_until: '2026-11-06T10:10:00.000Z' });
  });

  it('idempotent: a second tap (still pending) extends the window', async () => {
    const { svc, repo } = setup(staffText({ app_send_until: '2026-11-06T10:05:00Z' }));
    await svc.start(ID, NOW);
    expect(repo.start).toHaveBeenCalledWith(expect.objectContaining({ until: new Date('2026-11-06T10:10:00Z') }));
  });

  it('refused rows: 409 not_app_send with the row as it is, nothing written', async () => {
    const { svc, repo } = setup(staffText({ media_path: 'out/a.jpg', media_mime: 'image/jpeg' }));
    await expect(svc.start(ID, NOW)).rejects.toMatchObject({
      status: 409,
      response: { code: 'not_app_send', status: 'queued', error_code: 'awaiting_reply' },
    });
    expect(repo.start).not.toHaveBeenCalled();
  });

  it('lost the compare-and-set (the sender claimed it): 409 with the status read again', async () => {
    const { svc, repo } = setup(staffText());
    repo.start.mockResolvedValue(null as never);
    repo.get.mockResolvedValueOnce(staffText()).mockResolvedValueOnce(staffText({ error_code: 'sending' }));
    await expect(svc.start(ID, NOW)).rejects.toMatchObject({
      response: { code: 'not_app_send', status: 'queued', error_code: 'sending' },
    });
  });

  it('unknown id: 404', async () => {
    const { svc, repo } = setup(staffText());
    repo.get.mockResolvedValue(null);
    await expect(svc.start(ID, NOW)).rejects.toMatchObject({ status: 404 });
  });

  it('sent from the app before the tap: adopted, no window, 409 with the row now sent', async () => {
    const { svc, repo, adopts } = setup(staffText());
    adopts.adopt.mockResolvedValue(true);
    repo.get
      .mockResolvedValueOnce(staffText())
      .mockResolvedValueOnce(staffText({ status: 'sent', error_code: null }));
    await expect(svc.start(ID, NOW)).rejects.toMatchObject({
      status: 409,
      response: { code: 'not_app_send', status: 'sent' },
    });
    expect(adopts.adopt).toHaveBeenCalledWith(expect.objectContaining({ id: ID }), NOW);
    expect(repo.start).not.toHaveBeenCalled();
  });

  it('a refused row never looks for the app message', async () => {
    const { svc, adopts } = setup(staffText({ line: 'notifications' }));
    await expect(svc.start(ID, NOW)).rejects.toMatchObject({ status: 409 });
    expect(adopts.adopt).not.toHaveBeenCalled();
  });
});
