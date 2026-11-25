import { describe, expect, it } from 'vitest';
import {
  FAMILY_WEB_ORIGIN,
  LEGAL_PAGES,
  LEGAL_PATHS,
  LEGAL_UPDATED_ON,
  familyLegalUrl,
} from './legal-links';

describe('the family legal pages', () => {
  it('live on the family portal, over https', () => {
    expect(FAMILY_WEB_ORIGIN).toBe('https://family.ayatalbayan.com');
  });

  it('have fixed paths the web routes and the store listing share', () => {
    expect(LEGAL_PATHS).toEqual({ privacy: '/privacy', deleteAccount: '/delete-account' });
  });

  it('are listed in reading order: the policy, then the deletion page', () => {
    expect(LEGAL_PAGES).toEqual(['privacy', 'deleteAccount']);
  });

  it('build the absolute URL the app opens in the browser', () => {
    expect(familyLegalUrl('privacy')).toBe('https://family.ayatalbayan.com/privacy');
    expect(familyLegalUrl('deleteAccount')).toBe('https://family.ayatalbayan.com/delete-account');
  });

  it('carry one last-updated day (ISO), shown on both pages', () => {
    expect(LEGAL_UPDATED_ON).toBe('2026-11-21');
  });
});
