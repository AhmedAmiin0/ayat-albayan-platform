import { describe, expect, it } from 'vitest';
import { transportFor } from './event-transport.registry';
import { EVENTS_SHAPE } from './events-transport.schemas';
import { OutboxTickerTransport } from './outbox/event-transport.outbox.adapter';
import { FakeOutboxStore } from './outbox/outbox.fake';

const parse = (value: string | undefined) => EVENTS_SHAPE.EVENTS_TRANSPORT.safeParse(value);

describe('EVENTS_TRANSPORT', () => {
  it.each([undefined, '', '  '])('defaults to the outbox when %j', (value) => {
    expect(parse(value)).toMatchObject({ success: true, data: 'outbox' });
  });

  it('refuses a transport nobody wrote an adapter for (boot fails fast)', () => {
    expect(parse('kafka').success).toBe(false);
  });
});

describe('transportFor', () => {
  it('builds the outbox ticker on the outbox store', () => {
    const transport = transportFor('outbox', { outbox: new FakeOutboxStore() });
    expect(transport).toBeInstanceOf(OutboxTickerTransport);
  });
});
