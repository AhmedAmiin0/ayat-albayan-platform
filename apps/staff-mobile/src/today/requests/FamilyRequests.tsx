import type { FamilyRequestView } from '@ab/schedule';
import { Fragment, useState } from 'react';
import { StyleSheet, View } from 'react-native';
import { t, AppText, raisedCard, type, useTheme } from '@ab/mobile-kit';
import { useViewerClock } from '@/core/lib/clock';
import { useFamilyRequests } from './family-requests-api';
import { RequestRow } from './RequestRow';
import { RequestSheet } from './RequestSheet';

const bodySize = { fontSize: type.size.body, lineHeight: type.lineHeight(type.size.body) };

interface FamilyRequestsProps {
  /** The assistant's tree: her slot grid (GET /sales/booking/slots); default staff's. */
  slotsPath?: string;
}

/** Admins see all requests, assistants only their families'; nothing when none. */
export function FamilyRequests({ slotsPath }: FamilyRequestsProps) {
  const { color } = useTheme();
  const viewer = useViewerClock();
  const requests = useFamilyRequests();
  const [open, setOpen] = useState<FamilyRequestView | null>(null);
  const list = requests.data ?? [];
  const rule = { backgroundColor: color.rule };
  if (list.length === 0) return null;
  return (
    <View style={{ gap: 8 }}>
      <AppText
        accessibilityRole="header"
        style={{ fontFamily: type.ui[700], ...bodySize, color: color.ink }}
      >
        {`${t.lessons.proposal.familyRequests} · ${list.length}`}
      </AppText>
      <View style={{ ...raisedCard(color), paddingHorizontal: 16 }}>
        {list.map((request, i) => (
          <Fragment key={request.id}>
            {i > 0 ? <View style={{ height: StyleSheet.hairlineWidth, ...rule }} /> : null}
            <RequestRow request={request} viewer={viewer} onOpen={setOpen} />
          </Fragment>
        ))}
      </View>
      <RequestSheet request={open} onClose={() => setOpen(null)} slotsPath={slotsPath} />
    </View>
  );
}
