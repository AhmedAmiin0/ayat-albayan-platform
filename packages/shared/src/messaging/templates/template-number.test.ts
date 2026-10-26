import { describe, expect, it } from 'vitest';
import { templateNumberSchema } from './template-number.js';

describe('templateNumberSchema', () => {
  it('takes a uuid or null', () => {
    expect(templateNumberSchema.safeParse({ number_id: '6f1c2a5e-6a7b-4c3d-9e8f-0a1b2c3d4e5f' }).success).toBe(true);
    expect(templateNumberSchema.safeParse({ number_id: null }).success).toBe(true);
  });

  it('refuses anything else', () => {
    expect(templateNumberSchema.safeParse({ number_id: 'chat' }).success).toBe(false);
    expect(templateNumberSchema.safeParse({}).success).toBe(false);
  });
});
