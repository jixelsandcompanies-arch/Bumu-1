import React, { useDeferredValue, useEffect, useMemo, useRef, useState } from 'react';
import { Download, Plus } from 'lucide-react';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Button } from '../components/ui/Button.jsx';
import { SearchInput } from '../components/ui/SearchInput.jsx';
import { Section } from '../components/ui/Section.jsx';
import { StatusPill } from '../components/ui/StatusPill.jsx';
import { Text } from '../components/ui/Text.jsx';
import { paymentService } from '../services/paymentService.js';
import { colors } from '../theme/colors.js';
import { formatKes } from '../utils/currency.js';
import { formatDate } from '../utils/dates.js';
import { downloadSpreadsheet } from '../utils/spreadsheetExport.js';

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

function isPhoneIdentifier(value) {
  const text = String(value || '').trim().toLowerCase();
  const digits = text.replace(/\D/g, '');

  return text.includes('imei') || digits.length >= 14;
}

function identifierForPayment(payment) {
  if (String(payment.productType || '').toLowerCase() === 'phone') {
    return payment.imei || payment.serialNumber;
  }

  return payment.chassisNumber || payment.serialNumber || payment.imei;
}

export function PaymentsScreen({ onPaymentRecordsChange }) {
  const manualActionRef = useRef(null);
  const manualFormRef = useRef(null);
  const [query, setQuery] = useState('');
  const deferredQuery = useDeferredValue(query);
  const [paymentRecords, setPaymentRecords] = useState([]);
  const [manualFormOpen, setManualFormOpen] = useState(false);
  const [statusToast, setStatusToast] = useState(null);
  const [manualPayment, setManualPayment] = useState({
    customerName: '',
    customerPhone: '',
    agentName: '',
    serialNumber: '',
    totalPayable: '',
    depositCredit: '',
    paygoPayment: '',
    date: new Date().toISOString().slice(0, 10),
    status: 'paid'
  });

  useEffect(() => {
    paymentService.listPayments().then(setPaymentRecords).catch(() => setPaymentRecords([]));
  }, []);

  useEffect(() => {
    if (!manualFormOpen) return undefined;

    function elementContains(ref, target) {
      return (
        ref.current &&
        typeof ref.current.contains === 'function' &&
        ref.current.contains(target)
      );
    }

    function handleOutsideClick(event) {
      if (elementContains(manualFormRef, event.target) || elementContains(manualActionRef, event.target)) {
        return;
      }
      setManualFormOpen(false);
    }

    function handleEscape(event) {
      if (event.key === 'Escape') {
        setManualFormOpen(false);
      }
    }

    document.addEventListener('pointerdown', handleOutsideClick);
    document.addEventListener('keydown', handleEscape);
    return () => {
      document.removeEventListener('pointerdown', handleOutsideClick);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [manualFormOpen]);

  useEffect(() => {
    if (!statusToast) return undefined;
    const timer = window.setTimeout(() => setStatusToast(null), 2500);
    return () => window.clearTimeout(timer);
  }, [statusToast]);

  const payments = useMemo(() => {
    const value = deferredQuery.trim().toLowerCase();
    if (!value) return paymentRecords;

    return paymentRecords.filter((payment) =>
      String(payment.searchIndex ?? '').includes(value)
    );
  }, [paymentRecords, deferredQuery]);

  function getExportRows() {
    const headers = [
      'Customer',
      'Phone',
      'Receipt',
      'Chassis / IMEI Number',
      'Total Payable',
      'Deposit / Credit',
      'Paygo Payment',
      'Daily Target',
      'Balance',
      'Date',
      'Agent / Agent code',
      'Status',
      'Paygo Account',
      'Follow Up',
      'Source'
    ];
    const rows = payments.map((payment) => [
      payment.customerName,
      payment.customerPhone,
      payment.receipt,
      identifierForPayment(payment),
      displayMoney(payment.totalPayable),
      displayMoney(payment.depositCredit),
      displayMoney(payment.paygoPayment),
      displayMoney(payment.dailyTarget),
      displayMoney(payment.balance),
      displayDate(payment.date),
      `${payment.agentName} / ${displayAgentCode(payment)}`,
      payment.status === 'paid' ? 'Paid' : 'Unpaid',
      payment.paygoState,
      payment.followUp,
      payment.sourcePortal
    ]);

    return { headers, rows };
  }

  function downloadCsv() {
    const { headers, rows } = getExportRows();
    downloadCsvTable('payment-records.csv', headers, rows);
  }

  function updateManualPayment(field, value) {
    setManualPayment((current) => ({ ...current, [field]: value }));
  }

  function setManualStatus(status) {
    updateManualPayment('status', status);
    setStatusToast({
      tone: status === 'paid' ? 'success' : 'danger',
      message: status === 'paid' ? 'Marked paid' : 'Marked unpaid'
    });
  }

  function generateReceipt() {
    return `BUMU-CM-${Date.now()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
  }

  function generatePaymentId() {
    return `MAN-${window.crypto?.randomUUID?.() ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`}`;
  }

  async function saveManualPayment() {
    const depositCredit = Number(manualPayment.depositCredit);
    const paygoPayment = Number(manualPayment.paygoPayment);
    const totalPayable = Number(manualPayment.totalPayable);
    const hasValidDate = /^\d{4}-\d{2}-\d{2}$/.test(manualPayment.date);

    if (
      !manualPayment.customerName.trim() ||
      !manualPayment.customerPhone.trim() ||
      !manualPayment.agentName.trim() ||
      Number.isNaN(totalPayable) ||
      Number.isNaN(depositCredit) ||
      Number.isNaN(paygoPayment) ||
      !hasValidDate
    ) {
      window.alert('Complete customer, phone, agent, total payable, deposit, Paygo payment, and date as YYYY-MM-DD.');
      return;
    }

    let savedPayment;

    try {
      const identifier = manualPayment.serialNumber.trim() || 'Manual entry';
      const phoneIdentifier = isPhoneIdentifier(identifier);

      savedPayment = await paymentService.saveManualPayment({
        id: generatePaymentId(),
        customerName: manualPayment.customerName.trim(),
        customerPhone: manualPayment.customerPhone.trim(),
        receipt: generateReceipt(),
        agentName: manualPayment.agentName.trim(),
        serialNumber: identifier,
        chassisNumber: phoneIdentifier ? '' : identifier,
        imei: phoneIdentifier ? identifier : '',
        totalPayable,
        depositCredit,
        paygoPayment,
        date: `${manualPayment.date}T12:00:00`,
        status: manualPayment.status,
        sourcePortal: 'Manual payment'
      });
    } catch (error) {
      window.alert('Payment was not saved. Check the local app state and try again.');
      return;
    }

    setPaymentRecords((records) => [savedPayment, ...records]);
    onPaymentRecordsChange?.();
    setManualFormOpen(false);
    setManualPayment({
      customerName: '',
      customerPhone: '',
      agentName: '',
      serialNumber: '',
      totalPayable: '',
      depositCredit: '',
      paygoPayment: '',
      date: new Date().toISOString().slice(0, 10),
      status: 'paid'
    });
  }

  function downloadXls() {
    const { headers, rows } = getExportRows();
    downloadExcelTable('payment-records.xlsx', 'Payment Records', headers, rows).catch(() => {
      window.alert('Excel export failed. Try CSV export or reload the app.');
    });
  }

  return (
    <View style={styles.page}>
      <Header
        eyebrow="Money activity"
        title="Payments"
        subtitle="Records are matched with customer details registered by agents in the agent portal."
        action={
          <View ref={manualActionRef}>
            <Button icon={Plus} onPress={() => setManualFormOpen((open) => !open)}>Manual payment</Button>
          </View>
        }
      />

      {manualFormOpen && (
        <View ref={manualFormRef} style={styles.manualOverlay}>
          <Pressable onPress={(event) => event.stopPropagation()}>
            <Section title="Manual payment">
              <View style={styles.manualForm}>
            <TextInput
              value={manualPayment.customerName}
              onChangeText={(value) => updateManualPayment('customerName', value)}
              style={styles.formInput}
              placeholder="Customer name"
              placeholderTextColor="var(--app-muted)"
            />
            <TextInput
              value={manualPayment.customerPhone}
              onChangeText={(value) => updateManualPayment('customerPhone', value)}
              style={styles.formInput}
              placeholder="Customer phone"
              placeholderTextColor="var(--app-muted)"
            />
            <TextInput
              value={manualPayment.agentName}
              onChangeText={(value) => updateManualPayment('agentName', value)}
              style={styles.formInput}
              placeholder="Agent name"
              placeholderTextColor="var(--app-muted)"
            />
            <TextInput
              value={manualPayment.serialNumber}
              onChangeText={(value) => updateManualPayment('serialNumber', value)}
              style={styles.formInput}
              placeholder="Chassis number or phone IMEI"
              placeholderTextColor="var(--app-muted)"
            />
            <TextInput
              value={manualPayment.totalPayable}
              onChangeText={(value) => updateManualPayment('totalPayable', value)}
              style={styles.formInput}
              placeholder="Total payable"
              placeholderTextColor="var(--app-muted)"
            />
            <TextInput
              value={manualPayment.depositCredit}
              onChangeText={(value) => updateManualPayment('depositCredit', value)}
              style={styles.formInput}
              placeholder="Deposit / Credit"
              placeholderTextColor="var(--app-muted)"
            />
            <TextInput
              value={manualPayment.paygoPayment}
              onChangeText={(value) => updateManualPayment('paygoPayment', value)}
              style={styles.formInput}
              placeholder="Paygo payment"
              placeholderTextColor="var(--app-muted)"
            />
            <TextInput
              value={manualPayment.date}
              onChangeText={(value) => updateManualPayment('date', value)}
              style={styles.formInput}
              placeholder="YYYY-MM-DD"
              placeholderTextColor="var(--app-muted)"
            />
            <View style={styles.manualActions}>
              <Pressable
                onPress={() => setManualStatus('paid')}
                style={[
                  styles.statusChoice,
                  manualPayment.status === 'paid' && styles.statusChoiceActive
                ]}
              >
                <Text style={[styles.statusChoiceText, manualPayment.status === 'paid' && styles.statusChoiceTextActive]}>Paid</Text>
              </Pressable>
              <Pressable
                onPress={() => setManualStatus('unpaid')}
                style={[
                  styles.statusChoice,
                  manualPayment.status === 'unpaid' && styles.statusChoiceActive
                ]}
              >
                <Text style={[styles.statusChoiceText, manualPayment.status === 'unpaid' && styles.statusChoiceTextActive]}>Unpaid</Text>
              </Pressable>
              <Button onPress={saveManualPayment}>Save payment</Button>
            </View>
            {statusToast && (
              <View
                style={[
                  styles.statusToast,
                  statusToast.tone === 'success' ? styles.statusToastSuccess : styles.statusToastDanger
                ]}
              >
                <Text
                  style={[
                    styles.statusToastText,
                    statusToast.tone === 'success' ? styles.statusToastTextSuccess : styles.statusToastTextDanger
                  ]}
                >
                  {statusToast.message}
                </Text>
              </View>
            )}
              </View>
            </Section>
          </Pressable>
        </View>
      )}

      <Section
        title={`Payment records (${payments.length})`}
        action={<SearchInput value={query} onChangeText={setQuery} placeholder="Search payments" />}
      >
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
              <Text style={[styles.th, styles.chassisCol]}>Chassis / IMEI</Text>
              <Text style={[styles.th, styles.moneyCol]}>Total Payable</Text>
              <Text style={[styles.th, styles.moneyCol]}>Deposit / Credit</Text>
              <Text style={[styles.th, styles.moneyCol]}>Paygo Payment</Text>
              <Text style={[styles.th, styles.moneyCol]}>Daily Target</Text>
              <Text style={[styles.th, styles.moneyCol]}>Balance</Text>
              <Text style={[styles.th, styles.dateCol]}>Date</Text>
              <Text style={[styles.th, styles.agentCol]}>Agent / Agent code</Text>
              <Text style={[styles.th, styles.statusCol]}>Status</Text>
              <Text style={[styles.th, styles.statusCol]}>Paygo Account</Text>
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
                <Text style={[styles.cell, styles.chassisCol]}>{displayValue(identifierForPayment(payment))}</Text>
                <Text style={[styles.cellStrong, styles.moneyCol]}>{displayMoney(payment.totalPayable)}</Text>
                <Text style={[styles.cellStrong, styles.moneyCol]}>{displayMoney(payment.depositCredit)}</Text>
                <Text style={[styles.cellStrong, styles.moneyCol]}>{displayMoney(payment.paygoPayment)}</Text>
                <Text style={[styles.cellStrong, styles.moneyCol]}>{displayMoney(payment.dailyTarget)}</Text>
                <Text style={[styles.cellStrong, styles.moneyCol]}>{displayMoney(payment.balance)}</Text>
                <Text style={[styles.cell, styles.dateCol]}>{displayDate(payment.date)}</Text>
                <View style={styles.agentCol}>
                  <Text style={styles.cell}>{displayValue(payment.agentName)}</Text>
                  <Text style={styles.muted}>{displayAgentCode(payment)}</Text>
                </View>
                <View style={styles.statusCol}><StatusPill status={payment.status} /></View>
                <View style={styles.statusCol}><StatusPill status={payment.paygoState} /></View>
              </View>
            ))}
          </View>
        </ScrollView>
      </Section>

      <View style={styles.footerActions}>
        <Button icon={Download} variant="secondary" onPress={downloadCsv}>Export CSV</Button>
        <Button icon={Download} variant="secondary" onPress={downloadXls}>Export Excel</Button>
      </View>
    </View>
  );
}

async function downloadExcelTable(filename, sheetName, headers, rows) {
  downloadSpreadsheet(filename, [{ name: sheetName, rows: [headers, ...rows] }]);
}

function downloadCsvTable(filename, headers, rows) {
  const escapeCsv = (value) => {
    const text = String(value ?? '');
    return /[",\r\n]/.test(text) ? `"${text.replace(/"/g, '""')}"` : text;
  };
  const content = [headers, ...rows]
    .map((row) => row.map(escapeCsv).join(','))
    .join('\r\n');
  const blob = new Blob([`\uFEFF${content}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export function Header({ eyebrow = 'Activity', title, subtitle, action }) {
  return (
    <View style={styles.header}>
      <View>
        <View style={styles.activityLine}>
          <View style={styles.activityDot} />
          <Text style={styles.eyebrow}>{eyebrow}</Text>
        </View>
        <Text style={styles.title}>{title}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>
      {action}
    </View>
  );
}

const styles = StyleSheet.create({
  page: { gap: 18 },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', gap: 12, flexWrap: 'wrap' },
  activityLine: { flexDirection: 'row', alignItems: 'center', gap: 7, marginBottom: 5 },
  activityDot: { width: 8, height: 8, borderRadius: 999, backgroundColor: colors.success },
  eyebrow: { color: 'var(--app-muted)', fontSize: 12, fontWeight: '500' },
  title: { fontSize: 24, fontWeight: '500' },
  subtitle: { color: 'var(--app-muted)', marginTop: 4 },
  tableScroll: { width: '100%' },
  tableScrollContent: { minWidth: '100%', flexGrow: 1, paddingLeft: 1 },
  table: { width: '100%', minWidth: 1270, flexGrow: 1 },
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
  manualOverlay: { width: '100%' },
  manualForm: { padding: 14, gap: 10 },
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
  manualActions: { flexDirection: 'row', alignItems: 'center', gap: 10, flexWrap: 'wrap' },
  statusChoice: {
    minHeight: 34,
    paddingHorizontal: 12,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: 'var(--app-border)',
    alignItems: 'center',
    justifyContent: 'center'
  },
  statusChoiceActive: {
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  statusChoiceText: { color: 'var(--app-muted)', fontSize: 13, fontWeight: '500' },
  statusChoiceTextActive: { color: '#ffffff' },
  statusToast: {
    alignSelf: 'flex-start',
    minHeight: 34,
    borderRadius: 6,
    paddingHorizontal: 12,
    alignItems: 'center',
    justifyContent: 'center'
  },
  statusToastSuccess: {
    backgroundColor: colors.successSoft
  },
  statusToastDanger: {
    backgroundColor: colors.dangerSoft
  },
  statusToastText: { fontSize: 13, fontWeight: '500' },
  statusToastTextSuccess: { color: colors.success },
  statusToastTextDanger: { color: colors.danger },
  footerActions: { alignItems: 'flex-start', flexDirection: 'row', gap: 10, flexWrap: 'wrap' }
});
