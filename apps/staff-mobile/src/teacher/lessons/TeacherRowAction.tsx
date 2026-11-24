import type { PlanAction, ReportStage, WayIn } from '@ab/client-core';
import type { ReactNode } from 'react';
import { Linking } from 'react-native';
import { t, Button, type ButtonVariant } from '@ab/mobile-kit';
import type { LeadContext } from './use-teacher-plan';
import { RoomJoinButton } from '@/teacher/lesson-actions';

/** Cancel lives in the sheet only. */
export type LeadAction = Exclude<PlanAction, 'cancel'>;

const REPORT_LABEL: Record<ReportStage, string> = {
  write: t.reports.open,
  resume: t.reports.resume,
  window: t.reports.view,
  done: t.reports.view,
};

type Draw = (ctx: LeadContext, variant: ButtonVariant) => ReactNode;

/** Her own fixed link opens in the browser (lesson.meeting_link only, never her profile's). */
const openLink = (link: string | null) => void (link ? Linking.openURL(link) : undefined);

const JOIN: Record<WayIn, Draw> = {
  room: (ctx, variant) => <RoomJoinButton lesson={ctx.lesson} variant={variant} />,
  link: (ctx, variant) => (
    <Button
      variant={variant}
      label={t.teacherDash.join}
      onPress={() => openLink(ctx.lesson.meeting_link)}
    />
  ),
};

const LEAD: Record<LeadAction, Draw> = {
  join: (ctx, variant) => JOIN[ctx.way](ctx, variant),
  confirm: (ctx, variant) => (
    <Button
      variant={variant}
      label={t.teacherBoard.confirm}
      onPress={ctx.acts.confirm}
      busy={ctx.acts.busy}
    />
  ),
  report: (ctx, variant) => (
    <Button
      variant={variant}
      label={REPORT_LABEL[ctx.stage ?? 'write']}
      onPress={() => ctx.onReport(ctx.lesson.id)}
    />
  ),
};

interface TeacherRowActionProps {
  action: LeadAction;
  variant: ButtonVariant;
  ctx: LeadContext;
}

/** Filled on the hero, outlined on a row unless it is the live join (docs/48). */
export function TeacherRowAction({ action, variant, ctx }: TeacherRowActionProps) {
  return LEAD[action](ctx, variant);
}
