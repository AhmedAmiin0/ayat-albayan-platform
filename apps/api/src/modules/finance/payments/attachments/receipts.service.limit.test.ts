import { uploadMaxBytes } from '@ab/shared';
import { HttpException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { StorageService } from '../../../../common/storage/storage.service';
import type { PaymentAttachmentsQueries } from './payment-attachments.queries';
import type { PaymentsQueries } from '../payments.queries';
import { ReceiptsService } from './receipts.service';

const SUB = '00000000-0000-4000-8000-000000000001';

function setup() {
  const payments = { subscription: vi.fn().mockResolvedValue({ id: SUB }) };
  const storage = { signedUpload: vi.fn().mockResolvedValue({ bucket: 'receipts', path: 'p', token: 't', signed_url: 'u' }) };
  const files = {} as unknown as PaymentAttachmentsQueries;
  const svc = new ReceiptsService(payments as unknown as PaymentsQueries, storage as unknown as StorageService, files);
  return { svc, storage };
}
const input = (size: number) => ({ subscriptionId: SUB, mime: 'image/png' as const, size });

describe('ReceiptsService.uploadUrl follows settings.upload_max_mb', () => {
  it('the 10 MB default signs a 5 MB receipt', async () => {
    const { svc, storage } = setup();
    await svc.uploadUrl(input(5 * 1024 * 1024));
    expect(storage.signedUpload).toHaveBeenCalledTimes(1);
  });

  it('a 2 MB setting refuses the same file 400 receipt_too_large before signing', async () => {
    const { svc, storage } = setup();
    const err = await svc.uploadUrl(input(5 * 1024 * 1024), uploadMaxBytes({ upload_max_mb: 2 })).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(HttpException);
    expect((err as HttpException).getResponse()).toMatchObject({ code: 'receipt_too_large' });
    expect(storage.signedUpload).not.toHaveBeenCalled();
  });
});
