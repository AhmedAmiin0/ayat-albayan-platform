import { Injectable } from '@nestjs/common';
import { TemplatesRepo } from '@/modules/messaging/whatsapp/templates/catalog/templates.repo';
import type { TemplateRow } from '@/modules/messaging/whatsapp/whatsapp.types';
import { templateByName } from './template-match';

/** How long the catalog copy is trusted (as TemplatesRepo.cached). */
const NAMES_COPY_MS = 60_000;

/**
 * A template by any of its names (key, Meta's, the CRM's), from one catalog read a minute shared
 * by every caller: the chat renders a page of relayed rows without a read per row. Display only.
 */
@Injectable()
export class TemplateNames {
  private copy: { rows: Promise<TemplateRow[]>; at: number } | null = null;

  constructor(private readonly templates: TemplatesRepo) {}

  async find(name: string, now = Date.now()): Promise<TemplateRow | null> {
    return templateByName(await this.rows(now), name);
  }

  private rows(now: number): Promise<TemplateRow[]> {
    const copy = this.copy;
    if (copy && now - copy.at < NAMES_COPY_MS) return copy.rows;
    const rows = this.templates.all();
    this.copy = { rows, at: now };
    rows.catch(() => {
      this.copy = null;
    });
    return rows;
  }
}
