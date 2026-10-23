import { describe, expect, it } from 'vitest';
import { SINGLETON_ENTITY_ID } from './singleton-entity';

describe('SINGLETON_ENTITY_ID (R-NFR-03)', () => {
  it('is the nil UUID, so audit_log.entity_id (a uuid column) accepts it', () => {
    expect(SINGLETON_ENTITY_ID).toBe('00000000-0000-0000-0000-000000000000');
    expect(SINGLETON_ENTITY_ID).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/);
  });
});
