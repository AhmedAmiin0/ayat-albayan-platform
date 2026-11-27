import { describe, expect, it } from 'vitest';
import { channelCallsByAudience } from '..';
import { clientAnswering, page, STUDENT } from './answers.test-util';

describe('channelCallsByAudience', () => {
  it.each([
    ['teacher', `/teachers/me/channels/${STUDENT}/messages`],
    ['portal', `/portal/students/${STUDENT}/channel/messages`],
    ['admin', `/students/${STUDENT}/channel/messages`],
    ['sales', `/sales/students/${STUDENT}/channel/messages`],
  ] as const)('reads the %s chat at its own route', async (audience, path) => {
    const { client, apiFetch } = clientAnswering(page);
    await channelCallsByAudience(client)[audience].page({ studentId: STUDENT });
    expect(apiFetch).toHaveBeenCalledWith(path);
  });
});
