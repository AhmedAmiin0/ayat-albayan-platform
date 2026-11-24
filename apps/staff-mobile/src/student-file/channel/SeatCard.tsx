import { seatErrorText, seatState, type SeatState } from '@ab/client-core';
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

const holderOf = (data: ChannelSeat): string => data.holder?.name ?? '';

const takeBody = ({ take }: ChannelSeatApi, hint: string, label: string) => (
  <>
    <Note>{hint}</Note>
    <Button
      label={take.isPending ? S.taking : label}
      busy={take.isPending}
      onPress={() => take.mutate()}
    />
    {take.error ? <ErrorLine message={seatErrorText(take.error, t.studentChannel)} /> : null}
  </>
);

/** Free seats can be taken; my own student's seat held by a colleague can move to me. */
const BODY: Readonly<Record<SeatState, (seat: ChannelSeatApi, data: ChannelSeat) => ReactNode>> = {
  mine: () => null,
  held: (_seat, data) => <Note>{S.heldBy.replace('{name}', holderOf(data))}</Note>,
  take: (seat) => takeBody(seat, S.takeHint, S.take),
  takeover: (seat, data) =>
    takeBody(seat, S.takeOverHint.replace('{name}', holderOf(data)), S.takeOver),
};

/** One assistant per student chat; the one who brought the student has priority. */
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
