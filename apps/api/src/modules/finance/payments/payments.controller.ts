import { paymentRoutes as routes, type SignedDownload, type SignedUpload } from '@ab/shared';
import type { PaymentAttachmentView, PaymentsPage, PaymentView } from '@ab/money';
import { uploadMaxBytes } from '@ab/settings';
import { Controller, HttpCode } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser, Permissions } from '@/common/auth/decorators';
import type { AuthUser } from '@/common/auth/verify-token';
import { Route, RouteInput, type RouteInputOf } from '@/common/http/route';
import { paymentFilter } from './payments.dto';
import { PaymentsService } from './payments.service';
import { PaymentsSettings } from './payments.settings';
import { ReceiptsService } from './attachments/receipts.service';

type In<K extends keyof typeof routes> = RouteInputOf<(typeof routes)[K]>;

/** Payments + receipts (P1–P7, R-PAY-01, R-MOB-02). Admin only. */
@ApiTags('payments')
@ApiBearerAuth()
@Permissions('payments.write')
@Controller()
export class PaymentsController {
  constructor(
    private readonly payments: PaymentsService,
    private readonly receipts: ReceiptsService,
    private readonly settings: PaymentsSettings,
  ) {}

  @Route(routes.list)
  @Permissions('payments.read')
  async list(@RouteInput() { query }: In<'list'>): Promise<PaymentsPage> {
    const { academy_timezone: tz } = await this.settings.read();
    return this.payments.list(paymentFilter(query, tz));
  }

  @Route(routes.create)
  create(@RouteInput() { body }: In<'create'>, @CurrentUser() user: AuthUser): Promise<PaymentView> {
    return this.payments.create(body, user.id);
  }

  /** Static segment, declared before `:id`. */
  @Route(routes.receiptUploadUrl)
  @HttpCode(200)
  async receiptUploadUrl(@RouteInput() { body }: In<'receiptUploadUrl'>): Promise<SignedUpload> {
    return this.receipts.uploadUrl(body, uploadMaxBytes(await this.settings.read()));
  }

  @Route(routes.get)
  @Permissions('payments.read')
  get(@RouteInput() { params }: In<'get'>): Promise<PaymentView> {
    return this.payments.get(params.id);
  }

  @Route(routes.receipt)
  @Permissions('payments.read')
  receipt(@RouteInput() { params }: In<'receipt'>): Promise<SignedDownload> {
    return this.payments.receipt(params.id);
  }

  @Route(routes.attachments)
  @Permissions('payments.read')
  attachments(@RouteInput() { params }: In<'attachments'>): Promise<PaymentAttachmentView[]> {
    return this.payments.attachments(params.id);
  }

  /** An optional field the patch leaves out stays out of the parsed body, so it is not touched. */
  @Route(routes.update)
  update(
    @RouteInput() { params, body }: In<'update'>,
    @CurrentUser() user: AuthUser,
  ): Promise<PaymentView> {
    return this.payments.update(params.id, body, user.id);
  }

  @Route(routes.remove)
  @HttpCode(204)
  async remove(@RouteInput() { params }: In<'remove'>, @CurrentUser() user: AuthUser): Promise<void> {
    await this.payments.remove(params.id, user.id);
  }
}
