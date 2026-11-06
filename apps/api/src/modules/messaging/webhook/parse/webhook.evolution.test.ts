import { describe, expect, it } from 'vitest';
import { parseEvolution } from './webhook.evolution';

// docs/19 «Evolution driver»: Evolution v2 webhook bodies → the inbound / tick / state events the
// Meta and Kapso webhooks already produce. Invented ids and numbers only.

const NOW = new Date('2026-11-06T10:00:00Z');
const where = { line: 'chat' as const, numberId: 'num-evo', phoneNumberId: 'secondary-1' };
const at = { now: NOW, where, instance: 'secondary-1' };
const JID = '966500000001@s.whatsapp.net';

const upsert = (data: unknown, event = 'messages.upsert') => ({ event, instance: 'secondary-1', data });
const msg = (message: unknown, over: Record<string, unknown> = {}) => ({
  key: { id: 'EVO-IN-1', remoteJid: JID, fromMe: false },
  pushName: 'ولي أمر',
  message,
  messageTimestamp: 1_793_000_000,
  ...over,
});

const inbound = (body: unknown) => {
  const d = parseEvolution(body, at);
  return d?.kind === 'inbound' ? d.events : [];
};

describe('parseEvolution — MESSAGES_UPSERT', () => {
  it('a text: same InboundEvent fields as Meta, stamped with the number', () => {
    const [e] = inbound(upsert(msg({ conversation: 'السلام عليكم' })));
    expect(e).toMatchObject({
      waMessageId: 'EVO-IN-1', from: '966500000001', name: 'ولي أمر', type: 'text',
      body: 'السلام عليكم', replyTo: null, mediaId: null, line: 'chat', numberId: 'num-evo',
      phoneNumberId: 'secondary-1', at: new Date(1_793_000_000 * 1000),
    });
  });

  it('a quoted reply carries the quoted id; the byEvents spelling reads the same', () => {
    const body = upsert(msg({ conversation: 'نعم' }, { contextInfo: { stanzaId: 'EVO-OUT-7' } }), 'MESSAGES_UPSERT');
    expect(inbound(body)[0]).toMatchObject({ replyTo: 'EVO-OUT-7', body: 'نعم' });
  });

  it('media: the Evolution id is the media id; mime, caption and a document name are kept', () => {
    const [img] = inbound(upsert(msg({ imageMessage: { caption: 'واجب', mimetype: 'image/jpeg' } })));
    expect(img).toMatchObject({ type: 'image', mediaId: 'EVO-IN-1', mediaMime: 'image/jpeg', body: 'واجب' });
    const wrapped = { documentWithCaptionMessage: { message: { documentMessage: { fileName: 'ملف.pdf', mimetype: 'application/pdf' } } } };
    const [doc] = inbound(upsert(msg(wrapped)));
    expect(doc).toMatchObject({ type: 'document', mediaId: 'EVO-IN-1', mediaName: 'ملف.pdf' });
    expect(inbound(upsert(msg({ audioMessage: { mimetype: 'audio/ogg; codecs=opus' } })))[0]?.type).toBe('audio');
  });

  it('a reaction becomes the marker the inbound path applies; anything else is unsupported', () => {
    expect(inbound(upsert(msg({ reactionMessage: { key: { id: 'EVO-OUT-1' }, text: '👍' } })))[0]).toMatchObject({ type: 'reaction' });
    expect(inbound(upsert(msg({ pollCreationMessage: {} })))[0]).toMatchObject({ type: 'unsupported' });
  });

  it('never ours (fromMe), a group, a status broadcast; a @lid chat uses its phone jid', () => {
    expect(inbound(upsert(msg({ conversation: 'x' }, { key: { id: 'a', remoteJid: JID, fromMe: true } })))).toEqual([]);
    expect(inbound(upsert(msg({ conversation: 'x' }, { key: { id: 'b', remoteJid: '1203630@g.us' } })))).toEqual([]);
    expect(inbound(upsert(msg({ conversation: 'x' }, { key: { id: 'c', remoteJid: 'status@broadcast' } })))).toEqual([]);
    const lid = { key: { id: 'd', remoteJid: '123@lid', remoteJidAlt: JID } };
    expect(inbound(upsert(msg({ conversation: 'x' }, lid)))[0]?.from).toBe('966500000001');
  });
});

describe('parseEvolution — ticks, state, envelope', () => {
  it('MESSAGES_UPDATE: our message ids move to delivered / read; the family\'s own are ignored', () => {
    const data = [
      { keyId: 'EVO-OUT-1', fromMe: true, status: 'DELIVERY_ACK' },
      { keyId: 'EVO-OUT-2', fromMe: true, status: 'READ' },
      { keyId: 'EVO-IN-3', fromMe: false, status: 'READ' },
      { keyId: 'EVO-OUT-4', fromMe: true, status: 'PENDING' },
    ];
    const d = parseEvolution({ event: 'messages.update', data }, at);
    expect(d?.kind === 'status' ? d.events.map((e) => [e.waMessageId, e.status]) : null)
      .toEqual([['EVO-OUT-1', 'delivered'], ['EVO-OUT-2', 'read']]);
  });

  it('CONNECTION_UPDATE and QRCODE_UPDATED are the number\'s state', () => {
    expect(parseEvolution({ event: 'connection.update', data: { state: 'open' } }, at)).toEqual({ kind: 'state', state: 'open' });
    expect(parseEvolution({ event: 'qrcode.updated', data: {} }, at)).toEqual({ kind: 'state', state: 'connecting' });
  });

  it('another instance\'s body or no envelope is dropped; other events are acknowledged', () => {
    expect(parseEvolution({ event: 'messages.upsert', instance: 'other', data: {} }, at)).toBeNull();
    expect(parseEvolution('junk', at)).toBeNull();
    expect(parseEvolution({ event: 'chats.update', data: {} }, at)).toEqual({ kind: 'ignored', event: 'chats.update' });
  });

  it('an event or status named after an Object property is never a reader (security review)', () => {
    for (const event of ['constructor', '__proto__', 'toString', 'hasOwnProperty']) {
      const events = [{ waMessageId: 'x', numberId: 'other' }];
      const forged = { event, data: { kind: 'inbound', events } };
      expect(parseEvolution(forged, at)).toMatchObject({ kind: 'ignored' });
    }
    const tick = [{ keyId: 'a', fromMe: true, status: 'constructor' }];
    const d = parseEvolution({ event: 'messages.update', data: tick }, at);
    expect(d).toEqual({ kind: 'status', events: [] });
  });
});
