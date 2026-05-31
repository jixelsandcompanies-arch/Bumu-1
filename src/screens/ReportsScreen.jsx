import React, { useEffect, useMemo, useState } from 'react';
import { CalendarDays, Download, FileSpreadsheet, FileText } from 'lucide-react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button } from '../components/ui/Button.jsx';
import { Section } from '../components/ui/Section.jsx';
import { Text } from '../components/ui/Text.jsx';
import { agentPortalService } from '../services/agentPortalService.js';
import { commissionService } from '../services/commissionService.js';
import { emptyDashboardSummary, financeService } from '../services/financeService.js';
import { paymentService } from '../services/paymentService.js';
import { colors } from '../theme/colors.js';
import { formatKes } from '../utils/currency.js';
import { formatDate } from '../utils/dates.js';
import { Header } from './PaymentsScreen.jsx';

const reportTypes = ['Daily', 'Weekly', 'Monthly', 'Yearly', 'Custom'];
const reportCategories = [
  { value: 'payments', label: 'Payment / Riders report' },
  { value: 'commissions', label: 'Commission report' }
];
const reportBaseDate = new Date('2026-05-30T12:00:00');
const todayIso = toInputDate(reportBaseDate);

export function ReportsScreen() {
  const [active, setActive] = useState('Weekly');
  const [startDate, setStartDate] = useState(toInputDate(addDays(reportBaseDate, -6)));
  const [reportCategory, setReportCategory] = useState('payments');
  const [downloadType, setDownloadType] = useState('csv');
  const [payments, setPayments] = useState([]);
  const [customers, setCustomers] = useState([]);
  const [commissions, setCommissions] = useState([]);
  const [dashboardSummary, setDashboardSummary] = useState(emptyDashboardSummary);

  useEffect(() => {
    paymentService.listPayments().then(setPayments).catch(() => setPayments([]));
    agentPortalService.listRegisteredCustomers().then(setCustomers).catch(() => setCustomers([]));
    commissionService.listCommissions().then(setCommissions).catch(() => setCommissions([]));
    financeService.getDashboard().then((dashboard) => setDashboardSummary(dashboard.summary)).catch(() => setDashboardSummary(emptyDashboardSummary));
  }, []);

  useEffect(() => {
    if (active === 'Custom') return;

    const end = reportBaseDate;
    const start = rangeStartFor(active, end);

    setStartDate(toInputDate(start));
  }, [active]);

  const reportEndDate = rangeEndFor(active, startDate);
  const filteredPayments = useMemo(
    () => payments.filter((payment) => isWithinRange(payment.date, startDate, reportEndDate)),
    [payments, startDate, reportEndDate]
  );

  const filteredCommissions = useMemo(
    () => commissions.filter((commission) => isWithinRange(commission.earnedAt, startDate, reportEndDate)),
    [commissions, startDate, reportEndDate]
  );

  const reportRows = useMemo(
    () => buildReportRows(reportCategory, filteredPayments, customers, filteredCommissions),
    [reportCategory, filteredPayments, customers, filteredCommissions]
  );

  const totalCollected = getReportTotal(reportCategory, reportRows);
  const expectedFromRecords = filteredPayments.reduce((total, payment) => total + Number(payment.totalPayable || 0), 0);
  const expectedAmount = expectedFromRecords || dashboardSummary.expectedAmount;
  const overdueAmount = dashboardSummary.overdueAmount;
  const selectedReport = reportCategories.find((item) => item.value === reportCategory) ?? reportCategories[0];
  const reportTitle = `${active} ${selectedReport.label}`;
  const filenameBase = `bumu-${reportCategory}-${active.toLowerCase()}-${startDate}-to-${reportEndDate}`;
  const previewColumns = getPreviewColumns(reportCategory);

  return (
    <View style={styles.page}>
      <Header
        eyebrow="Review activity"
        title="Reports"
        subtitle="Generate collection reports by date range, then export CSV, XLSX, or PDF."
      />

      <Section title="Report generation">
        <View style={styles.controls}>
          <View style={styles.topControls}>
            <View style={styles.dateRow}>
              <DateField label="From" value={startDate} onChangeText={setStartDate} />
            </View>

            <View style={styles.periodGroup}>
              <Text style={styles.fieldLabel}>Period</Text>
              <View style={styles.tabs}>
                {reportTypes.map((type) => (
                  <Pressable
                    key={type}
                    onPress={() => setActive(type)}
                    style={[styles.tab, active === type && styles.tabActive]}
                  >
                    <Text style={[styles.tabText, active === type && styles.tabTextActive]}>{type}</Text>
                  </Pressable>
                ))}
              </View>
            </View>
          </View>

          <View style={styles.exportRow}>
            <View style={styles.exportField}>
              <Text style={styles.fieldLabel}>Report</Text>
              <select
                value={reportCategory}
                onChange={(event) => setReportCategory(event.target.value)}
                style={styles.selectInput}
              >
                {reportCategories.map((category) => (
                  <option key={category.value} value={category.value}>{category.label}</option>
                ))}
              </select>
            </View>
            <View style={styles.exportField}>
              <Text style={styles.fieldLabel}>Download type</Text>
              <select
                value={downloadType}
                onChange={(event) => setDownloadType(event.target.value)}
                style={styles.selectInput}
              >
                <option value="csv">CSV report</option>
                <option value="xlsx">XLSX report</option>
                <option value="pdf">PDF report</option>
              </select>
            </View>
            <Button
              icon={downloadType === 'xlsx' ? FileSpreadsheet : downloadType === 'pdf' ? FileText : Download}
              onPress={() => downloadSelectedReport(downloadType, filenameBase, reportTitle, startDate, reportEndDate, reportRows, totalCollected)}
              style={styles.downloadButton}
            >
              Download
            </Button>
          </View>
        </View>
      </Section>

      <Section title={`${active} ${selectedReport.label} preview`}>
        <View style={styles.previewHeader}>
          <View>
            <Text style={styles.reportName}>{selectedReport.label}</Text>
            <Text style={styles.meta}>{formatDate(startDate)} to {formatDate(reportEndDate)}</Text>
          </View>
          <FileText size={28} color={colors.primary} />
        </View>

        <View style={styles.metrics}>
          <ReportMetric label="Total amount" value={formatKes(totalCollected)} color={colors.success} />
          <ReportMetric label="Expected" value={formatKes(expectedAmount)} color={colors.violet} />
          <ReportMetric label="Overdue" value={formatKes(overdueAmount)} color={colors.danger} />
          <ReportMetric label="Records" value={reportRows.length} color={colors.orange} />
        </View>

        <View style={styles.table}>
          <View style={[styles.line, styles.tableHead]}>
            {previewColumns.map((column) => (
              <Text
                key={column}
                style={[
                  isMoneyColumn(column) ? styles.headAmount : styles.headText,
                  column === 'Total payable' && styles.totalPayableColumn
                ]}
              >
                {column}
              </Text>
            ))}
          </View>
          {reportRows.length > 0 ? (
            reportRows.map((row, index) => (
              <View key={`${reportCategory}-${index}`} style={styles.line}>
                {previewColumns.map((column) => (
                  <Text
                    key={column}
                    style={[
                      isMoneyColumn(column) ? styles.lineAmount : styles.lineText,
                      column === 'Total payable' && styles.totalPayableColumn
                    ]}
                  >
                    {formatPreviewValue(row[column], column)}
                  </Text>
                ))}
              </View>
            ))
          ) : (
            <View style={styles.emptyState}>
              <Text style={styles.emptyText}>No records found for this date range.</Text>
            </View>
          )}
        </View>
      </Section>
    </View>
  );
}

function DateField({ label, value, onChangeText }) {
  return (
    <View style={styles.dateField}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <View style={styles.dateInputWrap}>
        <CalendarDays size={17} color={colors.primary} />
        <input
          type="date"
          value={value}
          onChange={(event) => onChangeText(event.target.value)}
          style={styles.dateInput}
        />
      </View>
    </View>
  );
}

function ReportMetric({ label, value, color }) {
  return (
    <View style={[styles.metric, { borderTopWidth: 3, borderTopColor: color }]}>
      <Text style={styles.metricLabel}>{label}</Text>
      <Text style={styles.metricValue}>{value}</Text>
    </View>
  );
}

function buildReportRows(category, payments, riders, commissions) {
  if (category === 'riders') {
    return riders.map((rider) => ({
      Rider: rider.customerName,
      Phone: rider.customerPhone ?? rider.phone,
      Agent: rider.agentName,
      Bike: rider.bikeModel,
      Chassis: rider.serialNumber,
      'Total payable': rider.totalPayable,
      Paid: rider.paidAmount,
      Balance: rider.balance,
      Status: rider.status,
      'Due date': formatDate(rider.dueDate)
    }));
  }

  if (category === 'agents') {
    return buildAgentRows(riders, commissions);
  }

  if (category === 'commissions') {
    return commissions.map((commission) => ({
      Date: formatDate(commission.earnedAt),
      Agent: commission.agentName,
      Code: commission.agentCode,
      Customer: commission.customerName,
      Type: commission.type,
      Amount: commission.amount,
      Status: commission.status
    }));
  }

  return payments.map((payment) => ({
    Date: formatDate(payment.date),
    Customer: payment.customerName,
    'Phone number': payment.customerPhone,
    Agent: payment.agentName,
    Receipt: payment.receipt,
    Method: payment.method ?? 'No data yet',
    Status: payment.status,
    'PAYGO payment': payment.paygoPayment ?? 0,
    'Total payable': payment.totalPayable ?? 0
  }));
}

function buildAgentRows(riders, commissions) {
  const agents = new Map();

  riders.forEach((rider) => {
    const existing = agents.get(rider.agentId) ?? {
      Agent: rider.agentName,
      Code: rider.agentId,
      Riders: 0,
      'Commission balance': 0,
      Region: 'Kenya'
    };

    existing.Riders += 1;
    existing['Commission balance'] = commissions
      .filter((commission) => commission.agentCode === rider.agentId)
      .reduce((total, commission) => total + Number(commission.amount || 0), 0);

    agents.set(rider.agentId, existing);
  });

  return [...agents.values()];
}

function getPreviewColumns(category) {
  if (category === 'riders') return ['Rider', 'Agent', 'Balance'];
  if (category === 'agents') return ['Agent', 'Code', 'Riders'];
  if (category === 'commissions') return ['Agent', 'Customer', 'Amount'];
  return ['Customer', 'Phone number', 'Agent', 'Receipt', 'PAYGO payment', 'Total payable'];
}

function formatPreviewValue(value, column) {
  if (isMoneyColumn(column)) {
    return formatKes(value);
  }

  return value;
}

function isMoneyColumn(column) {
  return ['Amount', 'Balance', 'Paid', 'Total payable', 'Commission balance', 'PAYGO payment'].includes(column);
}

function getReportTotal(category, rows) {
  if (category === 'riders') {
    return rows.reduce((total, row) => total + Number(row.Paid || 0), 0);
  }

  if (category === 'agents') {
    return rows.reduce((total, row) => total + Number(row['Commission balance'] || 0), 0);
  }

  return rows.reduce((total, row) => total + Number(row['PAYGO payment'] || row.Amount || 0), 0);
}

function rangeStartFor(type, end) {
  if (type === 'Daily') return new Date(end.getFullYear(), end.getMonth(), end.getDate());
  if (type === 'Weekly') return addDays(end, -6);
  if (type === 'Monthly') return new Date(end.getFullYear(), end.getMonth(), 1);
  if (type === 'Yearly') return new Date(end.getFullYear(), 0, 1);
  return addDays(end, -6);
}

function rangeEndFor(type, startDate) {
  const start = new Date(`${startDate}T12:00:00`);

  if (Number.isNaN(start.getTime())) {
    return todayIso;
  }

  if (type === 'Daily') return toInputDate(start);
  if (type === 'Weekly') return toInputDate(addDays(start, 6));
  if (type === 'Monthly') return toInputDate(new Date(start.getFullYear(), start.getMonth() + 1, 0));
  if (type === 'Yearly') return toInputDate(new Date(start.getFullYear(), 11, 31));

  return todayIso;
}

function isWithinRange(value, startDate, endDate) {
  const date = new Date(value);
  const start = startDate ? new Date(`${startDate}T00:00:00`) : new Date(0);
  const end = endDate ? new Date(`${endDate}T23:59:59`) : new Date('2999-12-31T23:59:59');

  return date >= start && date <= end;
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function toInputDate(date) {
  return date.toISOString().slice(0, 10);
}

function exportCsv(filename, rows) {
  downloadFile(filename, toCsv(rows), 'text/csv;charset=utf-8;');
}

function downloadSelectedReport(type, filenameBase, title, startDate, endDate, rows, totalCollected) {
  if (type === 'xlsx') {
    exportXlsx(`${filenameBase}.xlsx`, rows);
    return;
  }

  if (type === 'pdf') {
    exportPdf(title, startDate, endDate, rows, totalCollected);
    return;
  }

  exportCsv(`${filenameBase}.csv`, rows);
}

async function exportXlsx(filename, rows) {
  const XLSX = await import('xlsx');
  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(workbook, worksheet, 'Report');
  XLSX.writeFile(workbook, filename, { bookType: 'xlsx' });
}

function exportPdf(title, startDate, endDate, rows, totalCollected) {
  const printable = window.open('', '_blank', 'width=960,height=720');

  if (!printable) return;

  printable.document.write(`
    <!doctype html>
    <html>
      <head>
        <title>${escapeHtml(title)}</title>
        <style>
          body { font-family: Arial, sans-serif; color: #0f172a; padding: 28px; }
          h1 { margin: 0 0 6px; font-size: 24px; }
          p { margin: 0 0 18px; color: #64748b; }
          .summary { display: flex; gap: 12px; margin: 18px 0; }
          .metric { border: 1px solid #d8e2f0; border-radius: 8px; padding: 12px; min-width: 170px; }
          .label { color: #64748b; font-size: 12px; }
          .value { font-size: 18px; font-weight: 700; margin-top: 4px; }
          table { width: 100%; border-collapse: collapse; margin-top: 18px; }
          th, td { border-bottom: 1px solid #d8e2f0; padding: 10px; text-align: left; font-size: 13px; }
          th { background: #f1f6fc; }
        </style>
      </head>
      <body>
        <h1>Bumu Paygo Finance Report</h1>
        <p>${escapeHtml(formatDate(startDate))} to ${escapeHtml(formatDate(endDate))}</p>
        <div class="summary">
          <div class="metric"><div class="label">Total collected</div><div class="value">${escapeHtml(formatKes(totalCollected))}</div></div>
          <div class="metric"><div class="label">Transactions</div><div class="value">${rows.length}</div></div>
        </div>
        <table>
          <thead>
            <tr>${Object.keys(rows[0] ?? { Customer: '', Receipt: '', Amount: '' }).map((header) => `<th>${escapeHtml(header)}</th>`).join('')}</tr>
          </thead>
          <tbody>
            ${rows.map((row) => `<tr>${Object.values(row).map((value) => `<td>${escapeHtml(value)}</td>`).join('')}</tr>`).join('')}
          </tbody>
        </table>
        <script>window.onload = () => { window.print(); };</script>
      </body>
    </html>
  `);
  printable.document.close();
}

function downloadFile(filename, content, type) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');

  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

function toCsv(rows) {
  if (!rows.length) return 'No data\n';

  const headers = Object.keys(rows[0]);
  const body = rows.map((row) => headers.map((header) => escapeCsv(row[header])).join(','));

  return [headers.join(','), ...body].join('\n');
}

function escapeCsv(value) {
  const text = value === null || value === undefined ? '' : String(value);

  if (/[",\n]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }

  return text;
}

function escapeHtml(value) {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

const styles = StyleSheet.create({
  page: { gap: 18 },
  controls: { padding: 16, gap: 16 },
  topControls: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    gap: 16,
    flexWrap: 'wrap'
  },
  periodGroup: { gap: 8, alignItems: 'flex-end' },
  fieldLabel: { color: 'var(--app-muted)', fontSize: 12, fontWeight: '600' },
  tabs: { flexDirection: 'row', gap: 8, flexWrap: 'wrap', justifyContent: 'flex-end' },
  tab: { borderWidth: 1, borderColor: 'var(--app-border)', borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9 },
  tabActive: { backgroundColor: colors.primarySoft, borderColor: '#cfe0fb' },
  tabText: { color: 'var(--app-muted)', fontWeight: '500' },
  tabTextActive: { color: colors.primary },
  dateRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  dateField: { width: 260, maxWidth: '100%', gap: 7 },
  dateInputWrap: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: 'var(--app-border)',
    borderRadius: 8,
    backgroundColor: 'var(--app-surface)',
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8
  },
  dateInput: { flex: 1, outlineStyle: 'none', borderWidth: 0, color: 'var(--app-text)' },
  exportRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, alignItems: 'flex-end' },
  exportField: { width: 260, maxWidth: '100%', gap: 7 },
  selectInput: {
    minHeight: 42,
    width: '100%',
    borderWidth: 1,
    borderStyle: 'solid',
    borderColor: 'var(--app-border)',
    borderRadius: 8,
    backgroundColor: 'var(--app-surface)',
    color: 'var(--app-text)',
    paddingLeft: 12,
    paddingRight: 12,
    outline: 'none'
  },
  downloadButton: { minWidth: 132 },
  previewHeader: { padding: 18, borderBottomWidth: 1, borderBottomColor: 'var(--app-border)', flexDirection: 'row', justifyContent: 'space-between', gap: 12 },
  reportName: { fontSize: 18, fontWeight: '500' },
  meta: { color: 'var(--app-muted)', marginTop: 4 },
  metrics: { flexDirection: 'row', flexWrap: 'wrap', borderBottomWidth: 1, borderBottomColor: 'var(--app-border)' },
  metric: { flex: 1, minWidth: 180, padding: 16, borderRightWidth: 1, borderRightColor: 'var(--app-border)' },
  metricLabel: { color: 'var(--app-muted)', fontSize: 12, fontWeight: '500' },
  metricValue: { fontSize: 19, fontWeight: '500', marginTop: 5 },
  table: { padding: 12, overflowX: 'auto' },
  line: { minHeight: 44, minWidth: 720, borderBottomWidth: 1, borderBottomColor: 'var(--app-border)', flexDirection: 'row', alignItems: 'center', gap: 8 },
  tableHead: { backgroundColor: colors.successSoft, borderRadius: 8, borderBottomWidth: 0, paddingHorizontal: 10, marginBottom: 4 },
  headText: { flex: 1, minWidth: 72, color: colors.slate, fontWeight: '700', fontSize: 12 },
  headAmount: { width: 124, textAlign: 'right', color: colors.slate, fontWeight: '700', fontSize: 12 },
  lineText: { flex: 1, minWidth: 72, color: 'var(--app-muted)', fontWeight: '500' },
  lineAmount: { width: 124, textAlign: 'right', fontWeight: '500' },
  totalPayableColumn: { marginLeft: 28 },
  emptyState: { minHeight: 64, alignItems: 'center', justifyContent: 'center' },
  emptyText: { color: 'var(--app-muted)' }
});
