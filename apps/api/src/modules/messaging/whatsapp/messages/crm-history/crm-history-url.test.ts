import { describe, expect, it } from 'vitest';
import { allowedCrmUrl, crmMediaUrl, isCrmHistoryRow, looksCrmHistory } from './crm-history-url';
import { CRM_HOST, crmLink, crmRow } from './crm-history.fakes';

// Owner 2026-10-27: an imported CRM file's body is only its storage link. Only that exact shape, on
// exactly the configured host, is ever fetched (SSRF guard); everything else is refused before fetch.

describe('crmMediaUrl (the shape of an old-CRM file link)', () => {
  it('takes one https link under the chat-media prefix, trimmed', () => {
    expect(crmMediaUrl(`  ${crmLink()}\n`)?.href).toBe(crmLink());
  });

  it.each([
    ['http', crmLink().replace('https://', 'http://')],
    ['extra text', `صورة ${crmLink()}`],
    ['two links', `${crmLink()} ${crmLink()}`],
    ['a query', `${crmLink()}?x=1`],
    ['a fragment', `${crmLink()}#a`],
    ['a port', crmLink().replace(CRM_HOST, `${CRM_HOST}:8443`)],
    ['userinfo', crmLink().replace('https://', 'https://u:p@')],
    ['another bucket', `https://${CRM_HOST}/storage/v1/object/public/other/x.webp`],
    ['a signed path', `https://${CRM_HOST}/storage/v1/object/sign/chat-media/x.webp`],
    ['dot segments', `https://${CRM_HOST}/storage/v1/object/public/chat-media/../secret/x`],
    ['an encoded dot', `https://${CRM_HOST}/storage/v1/object/public/chat-media/%2e%2e/x`],
    ['an encoded slash', `https://${CRM_HOST}/storage/v1/object/public/chat-media/a%2Fb`],
    ['a backslash', `https://${CRM_HOST}/storage/v1/object/public/chat-media/a\\b`],
    ['the bare prefix', `https://${CRM_HOST}/storage/v1/object/public/chat-media/`],
    ['not canonical (upper-case host)', crmLink().replace(CRM_HOST, CRM_HOST.toUpperCase())],
    ['empty', ''],
  ])('refuses %s', (_name, body) => {
    expect(crmMediaUrl(body)).toBeNull();
  });

  it('refuses null', () => {
    expect(crmMediaUrl(null)).toBeNull();
  });
});

describe('allowedCrmUrl (the host is the setting, exactly)', () => {
  it('allows the configured host only (case-insensitive setting, trimmed)', () => {
    expect(allowedCrmUrl(crmLink(), CRM_HOST)?.hostname).toBe(CRM_HOST);
    expect(allowedCrmUrl(crmLink(), ` ${CRM_HOST.toUpperCase()} `)?.hostname).toBe(CRM_HOST);
  });

  it.each([
    ['an empty setting (feature off)', crmLink(), ''],
    ['another host', crmLink('a.webp', 'evil.example'), CRM_HOST],
    ['a host that only ends with it', crmLink('a.webp', `evil-${CRM_HOST}`), CRM_HOST],
    ['a sub-domain of it', crmLink('a.webp', `x.${CRM_HOST}`), CRM_HOST],
    ['a host that only starts with it', crmLink('a.webp', `${CRM_HOST}.evil.example`), CRM_HOST],
    ['a parent of the setting', crmLink('a.webp', 'crm.example'), CRM_HOST],
    ['extra text', `see ${crmLink()}`, CRM_HOST],
    ['an IP literal setting', crmLink('a.webp', '169.254.169.254'), '169.254.169.254'],
    ['a localhost setting', crmLink('a.webp', 'localhost'), 'localhost'],
    ['a setting with a scheme', crmLink(), `https://${CRM_HOST}`],
  ])('refuses %s', (_name, body, host) => {
    expect(allowedCrmUrl(body, host)).toBeNull();
  });
});

describe('isCrmHistoryRow / looksCrmHistory', () => {
  it('an inbound row with a mime, no media id and a link body; still one once cached', () => {
    expect(isCrmHistoryRow(crmRow())).toBe(true);
    expect(isCrmHistoryRow(crmRow({ media_path: 'm-crm-1.webp' }))).toBe(true);
  });

  it.each([
    ['a Meta media id', { media_id: 'wamid-1' }],
    ['no mime', { media_mime: null }],
    ['outbound', { direction: 'outbound' as const }],
    ['a caption', { body: 'شكرًا' }],
  ])('not with %s', (_name, over) => {
    expect(isCrmHistoryRow(crmRow(over))).toBe(false);
  });

  it('looksCrmHistory reads a v_threads last message (no media columns)', () => {
    expect(looksCrmHistory({ direction: 'inbound', media_mime: 'audio/ogg; codecs=opus', body: crmLink('v.ogg') })).toBe(true);
    expect(looksCrmHistory({ direction: 'inbound', media_mime: null, body: crmLink() })).toBe(false);
  });
});
