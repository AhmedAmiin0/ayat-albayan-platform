import { describe, expect, it } from 'vitest';
import { t } from '@/lib/i18n/i18n';
import { sendingChip } from './sending-chip';

const s = t.templates.settings;

describe('sendingChip: the switch, honest about the server', () => {
  it('off is off whatever the gate says', () => {
    expect(sendingChip(false, { open: false, reason: 'switch_off', queued: 0 })).toEqual({ tone: 'neutral', glyph: 'struck', label: s.off });
  });

  it('on but WhatsApp not set up: «nothing is sent», never a green «يعمل»', () => {
    expect(sendingChip(true, { open: false, reason: 'not_configured', queued: 3 })).toEqual({ tone: 'act', glyph: 'half', label: s.onBlocked });
  });

  it('on under the allow-list: allowed numbers only; on and open: on', () => {
    expect(sendingChip(true, { open: true, reason: null, queued: 0, restricted: true }).label).toBe(s.onRestricted);
    expect(sendingChip(true, { open: true, reason: null, queued: 0 })).toEqual({ tone: 'ok', glyph: 'fill', label: s.on });
  });

  it('on while the server is not known yet (loading or failed): never a green «يعمل»', () => {
    expect(sendingChip(true, undefined)).toEqual({ tone: 'act', glyph: 'half', label: s.onUnknown });
  });
});
