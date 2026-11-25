import { describe, expect, it } from 'vitest';
import { staleAfter } from '@/test/stale-after';
import { catalogueKeys, messagingKeys, templateKeys } from './messaging.keys';

describe('messaging keys', () => {
  it('keeps the key shapes the messaging screens already cache under', () => {
    expect(templateKeys.all).toEqual(['templates']);
    expect(templateKeys.lines()).toEqual(['templates', 'lines']);
    expect(templateKeys.authored()).toEqual(['templates', 'authored']);
    expect(messagingKeys.sendGate()).toEqual(['send-gate']);
    expect(messagingKeys.linesCheck()).toEqual(['messaging', 'lines-check']);
    expect(catalogueKeys.all).toEqual(['admin-notifications']);
    expect(catalogueKeys.version(3)).toEqual(['admin-notifications', 3]);
  });

  it('refreshes the lines and the authored list after a templates write', async () => {
    const under = [templateKeys.lines(), templateKeys.authored()];
    const keys = [...under, messagingKeys.linesCheck(), catalogueKeys.version(1)];
    expect(await staleAfter(keys, templateKeys.all)).toEqual(under);
  });

  it('refreshes every catalogue version from its root and leaves the gate', async () => {
    const versions = [catalogueKeys.version(1), catalogueKeys.version(2)];
    const keys = [...versions, messagingKeys.sendGate()];
    expect(await staleAfter(keys, catalogueKeys.all)).toEqual(versions);
  });
});
