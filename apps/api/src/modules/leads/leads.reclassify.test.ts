import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { applicant, APPLICANT_ID, lead, LEAD_ID, leadsService } from './leads.fakes';

const ACTOR = 'admin-1';

describe('LeadsService.reclassify → job applicant (R-LEAD-04)', () => {
  it('creates the applicant from the lead, audits, then deletes the lead', async () => {
    const { service, leads, applicants, audit } = leadsService();
    const row = lead({ name: 'أ. منى', status: 'contacted' });
    leads.findById.mockResolvedValue(row);
    applicants.insert.mockResolvedValue(applicant({ from_lead_id: LEAD_ID }));

    const res = await service.reclassify({ id: LEAD_ID, actorId: ACTOR });

    expect(res.id).toBe(APPLICANT_ID);
    expect(applicants.insert).toHaveBeenCalledWith({
      phone_e164: '+966501234567',
      name: 'أ. منى',
      from_lead_id: LEAD_ID,
      created_by: ACTOR,
    });
    expect(audit.record).toHaveBeenCalledWith({
      actorId: ACTOR,
      entity: 'leads',
      entityId: LEAD_ID,
      action: 'reclassify_to_job_applicant',
      before: row,
      after: { job_applicant_id: APPLICANT_ID },
    });
    expect(leads.remove).toHaveBeenCalledWith(LEAD_ID);
  });

  it('audits before deleting, so a failed audit leaves the lead in place', async () => {
    const { service, leads, applicants, audit } = leadsService();
    leads.findById.mockResolvedValue(lead());
    applicants.insert.mockResolvedValue(applicant());
    audit.record.mockRejectedValue(new Error('audit down'));
    await expect(service.reclassify({ id: LEAD_ID, actorId: ACTOR })).rejects.toThrow('audit down');
    expect(leads.remove).not.toHaveBeenCalled();
  });

  it('reuses an existing applicant with the same phone (retry converges)', async () => {
    const { service, leads, applicants } = leadsService();
    leads.findById.mockResolvedValue(lead());
    applicants.findByPhone.mockResolvedValue(applicant());
    await expect(service.reclassify({ id: LEAD_ID, actorId: ACTOR })).resolves.toEqual(applicant());
    expect(applicants.insert).not.toHaveBeenCalled();
    expect(leads.remove).toHaveBeenCalledWith(LEAD_ID);
  });

  it('404s for an unknown lead and writes nothing', async () => {
    const { service, leads, applicants } = leadsService();
    leads.findById.mockResolvedValue(null);
    await expect(service.reclassify({ id: LEAD_ID, actorId: ACTOR })).rejects.toBeInstanceOf(
      NotFoundException,
    );
    expect(applicants.insert).not.toHaveBeenCalled();
    expect(leads.remove).not.toHaveBeenCalled();
  });
});
