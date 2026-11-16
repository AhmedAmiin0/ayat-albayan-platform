import { seatError, seatState, type SeatError, type SeatState } from '@ab/client-core';
import type { ChannelSeat } from '@ab/shared';
import { router } from 'expo-router';
import type { ReactNode } from 'react';
import { ActivityIndicator, View } from 'react-native';
import {
  t,
  useTheme,
  BackButton,
  Button,
  ErrorLine,
  ErrorState,
  Note,
  Screen,
  ScreenHeader,
} from '@ab/mobile-kit';
import type { ChannelSeatApi } from './use-channel-seat';

const S = t.studentChannel.seat;

/** 409: another assistant got there first; anything else: try again. */
const ERRORS: Readonly<Record<SeatError, string>> = {
  taken: S.taken,
  failed: t.studentChannel.actions.failed,
};

const holderOf = (data: ChannelSeat): string => data.holder?.name ?? '';

/** Why, «تولَّ المحادثة» or «انقل المحادثة إليك», and why it failed. */
const takeBody = ({ take }: ChannelSeatApi, hint: string, label: string) => (
  <>
    <Note>{hint}</Note>
    <Button
      label={take.isPending ? S.taking : label}
      busy={take.isPending}
      onPress={() => take.mutate()}
    />
    {take.error ? <ErrorLine message={ERRORS[seatError(take.error)]} /> : null}
  </>
);

/**
 * Free (a former assistant's too) → «تولَّ المحادثة»; my own student's, held by a colleague →
 * who, and «انقل المحادثة إليك»; else who follows it.
 */
const BODY: Readonly<Record<SeatState, (seat: ChannelSeatApi, data: ChannelSeat) => ReactNode>> = {
  mine: () => null,
  held: (_seat, data) => <Note>{S.heldBy.replace('{name}', holderOf(data))}</Note>,
  take: (seat) => takeBody(seat, S.takeHint, S.take),
  takeover: (seat, data) =>
    takeBody(seat, S.takeOverHint.replace('{name}', holderOf(data)), S.takeOver),
};

/**
 * A student chat that is not mine (owner 2026-11-16 «any assistant can subscribe to the chating
 * channel but only 1»): a calm card with who follows it, «تولَّ المحادثة» when it is free, or
 * «انقل المحادثة إليك» from the colleague named when I brought the student («who brought the
 * student have the priority»). Taken, the chat replaces it.
 */
export function SeatCard({ seat }: { seat: ChannelSeatApi }) {
  const { color } = useTheme();
  const { data, isError, isPending, refetch } = seat.query;
  return (
    <Screen>
      <ScreenHeader
        title={t.studentChannel.monitorTitle}
        leading={<BackButton onPress={() => router.back()} />}
      />
      {data ? <View style={{ gap: 12 }}>{BODY[seatState(data)](seat, data)}</View> : null}
      {isError ? (
        <ErrorState message={t.studentChannel.loadFailed} onRetry={() => void refetch()} />
      ) : null}
      {isPending ? (
        <ActivityIndicator
          accessibilityLabel={t.common.loading}
          color={color.lapis}
          style={{ paddingVertical: 32 }}
        />
      ) : null}
    </Screen>
  );
}
