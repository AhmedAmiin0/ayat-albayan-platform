import { translationRoutes } from '@ab/i18n';
import { describe, expect, it } from 'vitest';
import { IS_PUBLIC, OWN_PUBLIC } from '@/common/auth/decorators';
import { routeOf } from '@/common/http/route';
import { TranslationsController } from './translations.controller';

describe('TranslationsController: overrides public through its route object', () => {
  const handler = TranslationsController.prototype.overrides;

  it('serves the overrides route and is public from it alone', () => {
    expect(routeOf(handler)).toBe(translationRoutes.overrides);
    expect(Reflect.getMetadata(IS_PUBLIC, handler)).toBe(true);
    expect(Reflect.getMetadata(OWN_PUBLIC, handler)).toBeUndefined();
    expect(Reflect.getMetadata(OWN_PUBLIC, TranslationsController)).toBeUndefined();
  });
});
