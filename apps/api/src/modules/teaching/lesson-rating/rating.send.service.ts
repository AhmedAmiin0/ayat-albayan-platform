import { lessonRatingMessage, RATING_TEMPLATE } from '@ab/shared';
import { Injectable } from '@nestjs/common';
import { Outbox, type Sent } from '@/modules/messaging/inbox/send/outbox';
import { TemplateRegistry } from '@/modules/messaging/whatsapp/templates/catalog/template.registry';
import { ratingFamilies } from './rating.plan';
import { RatingRepo } from './rating.repo';
import { httpError } from '@/common/http/errors';

interface RatingSend {
  phone: string;
  actorId: string;
  clientRequestId: string;
}

/** Admin send skips the automatic-messages switch but not the send gate; own dedup key (rule 8). */
@Injectable()
export class RatingSendService {
  constructor(
    private readonly queries: RatingRepo,
    private readonly templates: TemplateRegistry,
    private readonly outbox: Outbox,
  ) {}

  async send(input: RatingSend, now = new Date()): Promise<Sent> {
    if (!(await this.templates.approved(RATING_TEMPLATE))) throw httpError(409, 'template_not_approved');
    const guardian = await this.queries.guardianByPhone(input.phone);
    if (!guardian) throw httpError(404, 'not_a_guardian');
    const lesson = await this.queries.latestHeld({ guardianId: guardian.id, now });
    const family = lesson ? ratingFamilies(lesson).find((f) => f.guardian.id === guardian.id) : undefined;
    if (!lesson || !family) throw httpError(404, 'no_completed_lesson');
    const { key, params } = lessonRatingMessage({
      lessonId: lesson.id,
      studentNames: family.names,
      startsAt: new Date(lesson.starts_at),
      tz: guardian.tz,
    });
    return this.outbox.send({
      phone_e164: input.phone,
      guardian_id: guardian.id,
      lesson_id: lesson.id,
      template_key: key,
      template_params: { '1': params['1'] ?? '', '2': params['2'] ?? '', payloads: params.payloads ?? [] },
      dedup_key: `admin:${input.phone}:rating:${input.clientRequestId}`,
      created_by: input.actorId,
    });
  }
}
