import React, { useEffect, useState } from 'react';
import { CheckCircle2, Download } from 'lucide-react';
import { StyleSheet, View } from 'react-native';
import { Button } from '../components/ui/Button.jsx';
import { Section } from '../components/ui/Section.jsx';
import { StatusPill } from '../components/ui/StatusPill.jsx';
import { Text } from '../components/ui/Text.jsx';
import { commissionService } from '../services/commissionService.js';
import { colors } from '../theme/colors.js';
import { formatKes } from '../utils/currency.js';
import { formatDate } from '../utils/dates.js';
import { humanizeStatus } from '../utils/status.js';
import { Header } from './PaymentsScreen.jsx';

export function CommissionsScreen() {
  const [commissions, setCommissions] = useState([]);
  const pendingTotal = commissions
    .filter((commission) => commission.status === 'earned')
    .reduce((sum, commission) => sum + commission.amount, 0);

  useEffect(() => {
    commissionService.listCommissions().then(setCommissions);
  }, []);

  return (
    <View style={styles.page}>
      <Header
        eyebrow="Agent activity"
        title="Commissions"
        subtitle="Check agent earnings and clear payouts after finance approval."
        action={<Button icon={Download} variant="secondary">Export</Button>}
      />
      <View style={styles.summary}>
        <Text style={styles.summaryLabel}>Pending payout</Text>
        <Text style={styles.summaryValue}>{formatKes(pendingTotal)}</Text>
      </View>

      <Section title="Commission ledger">
        {commissions.map((commission) => (
          <View key={commission.id} style={styles.row}>
            <View style={styles.agent}>
              <Text style={styles.name}>{commission.agentName}</Text>
              <Text style={styles.meta}>{commission.agentCode} | {commission.customerName}</Text>
            </View>
            <Text style={styles.cell}>{humanizeStatus(commission.type)}</Text>
            <Text style={styles.amount}>{formatKes(commission.amount)}</Text>
            <Text style={styles.cell}>{formatDate(commission.earnedAt)}</Text>
            <StatusPill status={commission.status} />
            <Button icon={CheckCircle2} variant="secondary">Mark paid</Button>
          </View>
        ))}
      </Section>
    </View>
  );
}

const styles = StyleSheet.create({
  page: { gap: 18 },
  summary: { backgroundColor: 'var(--app-surface)', borderWidth: 1, borderColor: 'var(--app-border)', borderRadius: 8, padding: 16 },
  summaryLabel: { color: 'var(--app-muted)', fontSize: 12, fontWeight: '500' },
  summaryValue: { fontSize: 24, fontWeight: '500', marginTop: 4 },
  row: { padding: 14, borderBottomWidth: 1, borderBottomColor: 'var(--app-border)', flexDirection: 'row', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  agent: { flex: 1.4, minWidth: 210 },
  name: { fontWeight: '500' },
  meta: { color: 'var(--app-muted)', fontSize: 12, marginTop: 3 },
  cell: { flex: 1, minWidth: 120, color: 'var(--app-muted)', fontWeight: '500' },
  amount: { flex: 1, minWidth: 110, fontWeight: '500' }
});
