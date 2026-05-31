import React, { useMemo, useState } from 'react';
import { ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Button } from '../components/ui/Button.jsx';
import { SearchInput } from '../components/ui/SearchInput.jsx';
import { Section } from '../components/ui/Section.jsx';
import { StatusPill } from '../components/ui/StatusPill.jsx';
import { Text } from '../components/ui/Text.jsx';
import { customerService } from '../services/customerService.js';
import { formatKes } from '../utils/currency.js';
import { formatDate } from '../utils/dates.js';
import { Header } from './PaymentsScreen.jsx';

const NO_DATA = 'No data yet';

function hasValue(value) {
  return value !== null && value !== undefined && value !== '';
}

function displayValue(value) {
  return hasValue(value) ? value : NO_DATA;
}

function displayMoney(value) {
  return hasValue(value) && !Number.isNaN(Number(value)) ? formatKes(Number(value)) : NO_DATA;
}

function displayDate(value) {
  return hasValue(value) ? formatDate(value) : NO_DATA;
}

function displayAgentCode(payment) {
  const agentCodes = {
    'Mary Wanjiku': 'BUMU-AG-001',
    'Peter Kariuki': 'BUMU-AG-002',
    'Grace Atieno': 'BUMU-AG-003'
  };

  return payment.agentId || agentCodes[payment.agentName] || NO_DATA;
}

export function CustomersScreen() {
  const [query, setQuery] = useState('');
  const [agentName, setAgentName] = useState('');
  const [agentId, setAgentId] = useState('');
  const [hasSearched, setHasSearched] = useState(false);
  const [agentPayments, setAgentPayments] = useState([]);

  const payments = useMemo(() => {
    const value = query.toLowerCase();
    return agentPayments.filter((payment) =>
      `${payment.customerName} ${payment.customerPhone} ${payment.receipt} ${payment.agentName} ${payment.serialNumber} ${payment.status}`
        .toLowerCase()
        .includes(value)
    );
  }, [agentPayments, query]);

  async function findAgentCustomers() {
    const records = await customerService
      .listPaymentRecordsByAgent({ agentName, agentId })
      .catch(() => []);
    setAgentPayments(records);
    setHasSearched(true);
    setAgentName('');
    setAgentId('');
    setQuery('');
  }

  function closeRecords() {
    setAgentPayments([]);
    setHasSearched(false);
    setQuery('');
  }

  return (
    <View style={styles.page}>
      <Header eyebrow="Rider activity" title="Riders" subtitle="See who is paying well, who is behind, and what each rider still owes." />

      <Section title="Agent lookup">
        <View style={styles.lookupForm}>
          <TextInput
            value={agentName}
            onChangeText={setAgentName}
            style={styles.formInput}
            placeholder="Agent name"
            placeholderTextColor="var(--app-muted)"
          />
          <TextInput
            value={agentId}
            onChangeText={setAgentId}
            style={styles.formInput}
            placeholder="Agent ID"
            placeholderTextColor="var(--app-muted)"
          />
          <Button onPress={findAgentCustomers}>Show customers</Button>
        </View>
      </Section>

      {hasSearched && (
        <Section
          title={`Payment records (${payments.length})`}
          action={
            <View style={styles.recordsActions}>
              <SearchInput value={query} onChangeText={setQuery} placeholder="Search shown payments" />
              <Button variant="secondary" onPress={closeRecords}>Close records</Button>
            </View>
          }
        >
          {payments.length > 0 ? (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.tableScroll}
              contentContainerStyle={styles.tableScrollContent}
            >
              <View style={styles.table}>
                <View style={styles.tableHeader}>
                  <Text style={[styles.th, styles.customerCol]}>Customer</Text>
                  <Text style={[styles.th, styles.phoneCol]}>Phone / Receipt</Text>
                  <Text style={[styles.th, styles.chassisCol]}>Chassis Number</Text>
                  <Text style={[styles.th, styles.moneyCol]}>Total Payable</Text>
                  <Text style={[styles.th, styles.moneyCol]}>Deposit / Credit</Text>
                  <Text style={[styles.th, styles.moneyCol]}>Paygo Payment</Text>
                  <Text style={[styles.th, styles.dateCol]}>Date</Text>
                  <Text style={[styles.th, styles.agentCol]}>Agent / Agent code</Text>
                  <Text style={[styles.th, styles.statusCol]}>Status</Text>
                </View>
                {payments.map((payment) => (
                  <View key={payment.id} style={styles.tableRow}>
                    <View style={styles.customerCol}>
                      <Text style={styles.primary}>{displayValue(payment.customerName)}</Text>
                    </View>
                    <View style={styles.phoneCol}>
                      <Text style={styles.cell}>{displayValue(payment.customerPhone)}</Text>
                      <Text style={styles.muted}>{displayValue(payment.receipt)}</Text>
                    </View>
                    <Text style={[styles.cell, styles.chassisCol]}>{displayValue(payment.serialNumber)}</Text>
                    <Text style={[styles.cellStrong, styles.moneyCol]}>{displayMoney(payment.totalPayable)}</Text>
                    <Text style={[styles.cellStrong, styles.moneyCol]}>{displayMoney(payment.depositCredit)}</Text>
                    <Text style={[styles.cellStrong, styles.moneyCol]}>{displayMoney(payment.paygoPayment)}</Text>
                    <Text style={[styles.cell, styles.dateCol]}>{displayDate(payment.date)}</Text>
                    <View style={styles.agentCol}>
                      <Text style={styles.cell}>{displayValue(payment.agentName)}</Text>
                      <Text style={styles.muted}>{displayAgentCode(payment)}</Text>
                    </View>
                    <View style={styles.statusCol}><StatusPill status={payment.status} /></View>
                  </View>
                ))}
              </View>
            </ScrollView>
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyTitle}>No payments found</Text>
              <Text style={styles.emptyText}>Check the agent name and agent ID, then try again.</Text>
            </View>
          )}
        </Section>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { gap: 18 },
  lookupForm: { padding: 14, gap: 10 },
  recordsActions: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  formInput: {
    minHeight: 40,
    borderWidth: 1,
    borderColor: 'var(--app-border)',
    borderRadius: 6,
    paddingHorizontal: 10,
    color: 'var(--app-text)',
    backgroundColor: 'var(--app-surface)',
    outlineStyle: 'none',
    fontSize: 14
  },
  tableScroll: { width: '100%' },
  tableScrollContent: { minWidth: '100%', flexGrow: 1, paddingLeft: 1 },
  table: { width: '100%', minWidth: 1030, flexGrow: 1 },
  tableHeader: { minHeight: 42, backgroundColor: 'var(--app-bg)', borderBottomWidth: 1, borderBottomColor: 'var(--app-border)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 6 },
  th: { color: 'var(--app-muted)', fontSize: 12, fontWeight: '500' },
  tableRow: { minHeight: 68, borderBottomWidth: 1, borderBottomColor: 'var(--app-border)', flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, gap: 6 },
  customerCol: { width: 150, flexShrink: 0 },
  phoneCol: { width: 140, flexShrink: 0 },
  agentCol: { width: 130, flexShrink: 0 },
  chassisCol: { width: 130, flexShrink: 0 },
  moneyCol: { width: 120, flexShrink: 0 },
  dateCol: { width: 115, flexShrink: 0 },
  statusCol: { width: 100, flexShrink: 0 },
  primary: { fontWeight: '500' },
  muted: { color: 'var(--app-muted)', fontSize: 12, marginTop: 3 },
  cell: { color: 'var(--app-muted)', fontSize: 13, fontWeight: '500' },
  cellStrong: { fontWeight: '500' },
  emptyState: { padding: 18 },
  emptyTitle: { fontSize: 15, fontWeight: '500' },
  emptyText: { color: 'var(--app-muted)', marginTop: 4 }
});
