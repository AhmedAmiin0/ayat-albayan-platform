import { Injectable, Module } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { describe, expect, it } from 'vitest';
import { AuditService } from '@/common/audit/audit.service';
import { NotificationPolicy } from '@/modules/messaging/notification-rules';
import { WhatsappModule } from '@/modules/messaging/whatsapp';
import { featureRoot, messagingRoot } from '.';

@Injectable()
class NeedsGlobals {
  constructor(
    readonly audit: AuditService,
    readonly policy: NotificationPolicy,
  ) {}
}

@Module({ providers: [NeedsGlobals] })
class ProbeModule {}

describe('featureRoot', () => {
  it('lists the infrastructure, the placeholders and the given features', () => {
    const root = featureRoot(ProbeModule);
    expect(root.imports?.at(-1)).toBe(ProbeModule);
    expect(root.imports).not.toContain(WhatsappModule);
  });

  it('resolves a feature on the global infrastructure with an empty notification policy', async () => {
    const mod = await Test.createTestingModule({ imports: [featureRoot(ProbeModule)] }).compile();
    const probe = mod.get(NeedsGlobals);
    expect(probe.audit).toBeInstanceOf(AuditService);
    expect(probe.policy).toEqual({});
    await mod.close();
  });
});

describe('messagingRoot', () => {
  it('imports the real WhatsApp module instead of the placeholders', () => {
    const root = messagingRoot(ProbeModule);
    expect(root.imports).toContain(WhatsappModule);
    expect(root.imports?.at(-1)).toBe(ProbeModule);
  });
});
