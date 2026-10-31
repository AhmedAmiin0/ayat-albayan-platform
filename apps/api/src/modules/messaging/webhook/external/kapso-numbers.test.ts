import { afterEach, describe, expect, it } from 'vitest';
import { setNumbersOverlay } from '@/common/configuration/integrations/numbers-overlay';
import type { LineEnvs } from '@/config/env/env';
import { kapsoChatNumbers, kapsoNumberFor } from './kapso-numbers';
import { KAPSO_NUMBER_ID, KAPSO_PHONE_ID, kapsoEnv, kapsoOverlay } from './external.fakes';

const meta = { base: 'http://localhost:4010', version: 'v21.0', phoneNumberId: 'meta-1', wabaId: 'w', accessToken: 't' };
const legacy = (lines: Partial<LineEnvs>) => () => ({ notifications: null, chat: null, ...lines });

afterEach(() => setNumbersOverlay(null));

describe('kapsoNumberFor / kapsoChatNumbers', () => {
  it('module mode: the numbers overlay row on Kapso, with its wa_numbers id', () => {
    kapsoOverlay();
    expect(kapsoNumberFor(KAPSO_PHONE_ID)).toEqual({ env: kapsoEnv(), line: 'chat', numberId: KAPSO_NUMBER_ID });
    expect(kapsoNumberFor('other')).toBeNull();
    expect(kapsoChatNumbers()).toEqual([{ env: kapsoEnv(), line: 'chat', numberId: KAPSO_NUMBER_ID }]);
  });

  it('module mode: a disabled number is not caught up; one on Meta (or without credentials) is not Kapso', () => {
    kapsoOverlay({ enabled: false });
    expect(kapsoChatNumbers()).toEqual([]);
    kapsoOverlay({ env: meta });
    expect(kapsoNumberFor(KAPSO_PHONE_ID)).toBeNull();
    kapsoOverlay({ env: null });
    expect(kapsoChatNumbers()).toEqual([]);
  });

  it('legacy: the line whose driver is Kapso, by phone_number_id', () => {
    const read = legacy({ chat: kapsoEnv(), notifications: meta });
    expect(kapsoNumberFor(KAPSO_PHONE_ID, read)).toEqual({ env: kapsoEnv(), line: 'chat' });
    expect(kapsoNumberFor('meta-1', read)).toBeNull();
    expect(kapsoChatNumbers(read)).toEqual([{ env: kapsoEnv(), line: 'chat' }]);
    expect(kapsoChatNumbers(legacy({ notifications: kapsoEnv() }))).toEqual([]);
  });
});
