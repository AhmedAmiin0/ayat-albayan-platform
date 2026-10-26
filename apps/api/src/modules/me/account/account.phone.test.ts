import { profileUpdateSchema } from '@ab/shared';
import { BadRequestException, ConflictException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { accountKit, ME, PASSWORD } from './account.fakes';

// R-ACC-02: the name is trimmed (2-80); a phone is normalised to E.164 (rule 7), unique, and
// changing it needs the current password.

describe('PATCH /me/profile name and phone (R-ACC-02)', () => {
  it('normalises a typed number to E.164 and stores it', async () => {
    const kit = accountKit();
    const body = profileUpdateSchema.parse({ phone_e164: '0501234567', current_password: PASSWORD });
    const view = await kit.account.updateProfile(ME, body);
    expect(view.phone_e164).toBe('+966501234567');
  });

  it('refuses a name outside 2-80 characters and a bad number', () => {
    expect(profileUpdateSchema.safeParse({ full_name: ' a ' }).success).toBe(false);
    expect(profileUpdateSchema.safeParse({ full_name: 'x'.repeat(81) }).success).toBe(false);
    expect(profileUpdateSchema.safeParse({ phone_e164: 'abc', current_password: PASSWORD }).success).toBe(false);
  });

  it('needs the current password for a phone change, and checks it', async () => {
    expect(profileUpdateSchema.safeParse({ phone_e164: '0501234567' }).success).toBe(false);
    const kit = accountKit();
    await expect(kit.account.updateProfile(ME, { phone_e164: '+966501234567', current_password: 'nope' })).rejects.toMatchObject({
      response: { code: 'wrong_password' },
    });
    expect(kit.store.patches).toEqual([]);
  });

  it('a wrong password is a 400 and writes nothing (the activity log keeps the 400 row)', async () => {
    const kit = accountKit();
    await expect(kit.account.updateProfile(ME, { phone_e164: '+966501234567', full_name: 'X Y', current_password: 'guess-123' })).rejects.toBeInstanceOf(
      BadRequestException,
    );
    expect(kit.store.patches).toEqual([]);
  });

  it('409 phone_taken when another login holds the number', async () => {
    const kit = accountKit();
    kit.store.takenPhones.add('+966501234567');
    await expect(kit.account.updateProfile(ME, { phone_e164: '+966501234567', current_password: PASSWORD })).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(kit.store.patches).toEqual([]);
  });

  it('a blank number removes it (with the password)', async () => {
    const kit = accountKit();
    const body = profileUpdateSchema.parse({ phone_e164: ' ', current_password: PASSWORD });
    expect(body.phone_e164).toBeNull();
    expect((await kit.account.updateProfile(ME, body)).phone_e164).toBeNull();
  });

  it('a name-only change needs no password', async () => {
    const kit = accountKit();
    expect((await kit.account.updateProfile(ME, { full_name: 'Huda Ali' })).full_name).toBe('Huda Ali');
  });
});
