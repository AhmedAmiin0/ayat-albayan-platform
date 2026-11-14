import { describe, expect, it } from 'vitest';
import { capsOf, windowless } from './driver-caps';
import { EVO_BAILEYS, EVO_CLOUD } from './evolution/evolution.fakes';
import { CRM_ENV } from './crm/crm.fakes';

// docs/19: what each driver can do, by capability instead of by name.

const META = { base: 'http://x', version: 'v21.0', phoneNumberId: 'p', wabaId: 'w', accessToken: 't' };

describe('driver capabilities', () => {
  it('only an Evolution Baileys number is windowless', () => {
    expect(windowless(EVO_BAILEYS)).toBe(true);
    expect([EVO_CLOUD, CRM_ENV, META, { ...META, provider: 'kapso' as const, apiKey: 'k' }, null].map(windowless))
      .toEqual([false, false, false, false, false]);
  });

  it('reactions on Graph lines only; template lists on Graph lines only', () => {
    expect(capsOf(META)).toEqual({
      window24h: true, reactions: true, templateList: true, mediaUpload: true,
    });
    expect(capsOf(CRM_ENV)).toMatchObject({ reactions: false, templateList: false });
    expect(capsOf(EVO_BAILEYS)).toMatchObject({ reactions: false, templateList: false });
    expect(capsOf(EVO_CLOUD)).toEqual({
      window24h: true, reactions: false, templateList: false, mediaUpload: false,
    });
  });

  it('a voice note by media id on Meta and Kapso only; crm and evolution keep the link', () => {
    const kapso = { ...META, provider: 'kapso' as const, apiKey: 'k' };
    expect([META, kapso, null].map((e) => capsOf(e).mediaUpload)).toEqual([true, true, true]);
    expect([CRM_ENV, EVO_BAILEYS, EVO_CLOUD].map((e) => capsOf(e).mediaUpload))
      .toEqual([false, false, false]);
  });
});
