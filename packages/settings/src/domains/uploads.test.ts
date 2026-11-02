import { describe, expect, it } from 'vitest';
import { PUBLIC_SETTING_DEFAULTS } from '../public.js';
import { SETTING_DEFAULTS } from '../registry.js';
import { uploadMaxBytes, UPLOAD_SETTINGS } from './uploads.js';

describe('upload limit', () => {
  it('converts megabytes to bytes', () => {
    expect(uploadMaxBytes({ upload_max_mb: 2 })).toBe(2 * 1024 * 1024);
    expect(uploadMaxBytes(SETTING_DEFAULTS)).toBe(10 * 1024 * 1024);
    expect(uploadMaxBytes(PUBLIC_SETTING_DEFAULTS)).toBe(10 * 1024 * 1024);
  });

  it('is public and capped at the buckets\' 10 MB', () => {
    expect(UPLOAD_SETTINGS.upload_max_mb).toMatchObject({ type: 'int', default: 10, min: 1, max: 10, public: true });
  });
});
