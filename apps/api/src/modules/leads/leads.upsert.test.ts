import { BadRequestException, ConflictException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { applicant, lead, LEAD_ID, leadsService } from './leads.fakes';

const AT = new Date('2026-10-01T08:00:00Z');

describe('LeadsService.upsertByPhone (R-LEAD-01)', () => {
  it('creates a lead keyed by the normalised E.164 phone', async () => {
    const { service, leads } = leadsService();
    leads.insert.mockResolvedValue(lead());
    await service.upsertByPhone({ phone: '٠٥٠١٢٣٤٥٦٧ ', name: ' أم سهيلة ', source: 'facebook_ad', at: AT });
    expect(leads.findByPhone).toHaveBeenCalledWith('+966501234567');
    expect(leads.insert).toHaveBeenCalledWith({
      phone_e164: '+966501234567',
      name: 'أم سهيلة',
      source: 'facebook_ad',
      last_inbound_at: '2026-10-01T08:00:00.000Z',
    });
  });

  it('updates last_inbound_at on an existing lead without touching status or source', async () => {
    const { service, leads } = leadsService();
    leads.findByPhone.mockResolvedValue(lead({ status: 'trial_booked', name: 'أم جود' }));
    await service.upsertByPhone({ phone: '+966501234567', name: 'Other', source: 'referral', at: AT });
    expect(leads.insert).not.toHaveBeenCalled();
    const [id, patch] = leads.update.mock.calls[0] ?? [];
    expect(id).toBe(LEAD_ID);
    expect(patch).toEqual({ last_inbound_at: '2026-10-01T08:00:00.000Z', name: 'أم جود' });
    expect(patch).not.toHaveProperty('status');
    expect(patch).not.toHaveProperty('source');
  });

  it('fills an empty name from the WhatsApp profile name', async () => {
    const { service, leads } = leadsService();
    leads.findByPhone.mockResolvedValue(lead({ name: null }));
    await service.upsertByPhone({ phone: '+966501234567', name: 'أم جود', at: AT });
    expect(leads.update.mock.calls[0]?.[1]).toMatchObject({ name: 'أم جود' });
  });

  it('never moves last_inbound_at backwards (out-of-order webhook)', async () => {
    const { service, leads } = leadsService();
    leads.findByPhone.mockResolvedValue(lead({ last_inbound_at: '2026-10-01T09:00:00+00:00' }));
    await service.upsertByPhone({ phone: '+966501234567', at: AT });
    expect(leads.update.mock.calls[0]?.[1]).toMatchObject({
      last_inbound_at: '2026-10-01T09:00:00.000Z',
    });
  });

  it('on a concurrent first insert (409) updates the winning row instead', async () => {
    const { service, leads } = leadsService();
    leads.findByPhone.mockResolvedValueOnce(null).mockResolvedValueOnce(lead());
    leads.insert.mockRejectedValue(new ConflictException());
    leads.update.mockResolvedValue(lead());
    await expect(service.upsertByPhone({ phone: '+966501234567', at: AT })).resolves.toEqual(lead());
    expect(leads.update).toHaveBeenCalledTimes(1);
  });

  it('rejects a phone that cannot be normalised', async () => {
    const { service, leads } = leadsService();
    await expect(service.upsertByPhone({ phone: 'abc' })).rejects.toBeInstanceOf(BadRequestException);
    expect(leads.insert).not.toHaveBeenCalled();
  });

  it('returns null and writes nothing for a job applicant phone (R-LEAD-04)', async () => {
    const { service, leads, applicants } = leadsService();
    applicants.findByPhone.mockResolvedValue(applicant());
    await expect(service.upsertByPhone({ phone: '+966501234567' })).resolves.toBeNull();
    expect(leads.insert).not.toHaveBeenCalled();
    expect(leads.update).not.toHaveBeenCalled();
  });
});
