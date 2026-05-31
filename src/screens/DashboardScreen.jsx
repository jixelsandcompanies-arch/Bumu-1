import React, { useEffect, useState } from 'react';
import { AlertTriangle, Bell, CreditCard, Download, HandCoins, Users } from 'lucide-react';
import { Pressable, StyleSheet, View } from 'react-native';
import { Button } from '../components/ui/Button.jsx';
import { Section } from '../components/ui/Section.jsx';
import { StatusPill } from '../components/ui/StatusPill.jsx';
import { Text } from '../components/ui/Text.jsx';
import { agentPortalService } from '../services/agentPortalService.js';
import { emptyDashboardSummary, financeService } from '../services/financeService.js';
import { paymentService } from '../services/paymentService.js';
import { colors } from '../theme/colors.js';
import { formatKes } from '../utils/currency.js';
import { formatShortDate } from '../utils/dates.js';

export function DashboardScreen({ onNavigate, notifications = [] }) {
  const [payments, setPayments] = useState([]);
  const [dashboard, setDashboard] = useState({ summary: emptyDashboardSummary, trend: [] });
  const [customers, setCustomers] = useState([]);
  const maxAmount = Math.max(...dashboard.trend.map((item) => item.amount), 1);
  const overdueCustomers = customers.filter((customer) => Number(customer.overdueDays || 0) > 0);
  const latestAlerts = notifications.slice(0, 3);

  useEffect(() => {
    paymentService.listPayments().then(setPayments).catch(() => setPayments([]));
    financeService.getDashboard().then(setDashboard).catch(() => setDashboard({ summary: emptyDashboardSummary, trend: [] }));
    agentPortalService.listRegisteredCustomers().then(setCustomers).catch(() => setCustomers([]));
  }, []);

  return (
    <View style={styles.page}>
      <View style={styles.header}>
        <View>
          <View style={styles.activityLine}>
            <View style={styles.activityDot} />
            <Text style={styles.eyebrow}>Today activity</Text>
          </View>
          <Text style={styles.title}>Home</Text>
          <Text style={styles.subtitle}>Collections, repayment risk, commissions, and alerts.</Text>
        </View>
        <Button icon={Download} variant="secondary">Export</Button>
      </View>

      <View style={styles.metricStrip}>
        <Metric label="Total collected" value={formatKes(dashboard.summary.totalCollected)} icon={CreditCard} tone="success" />
        <Metric label="Expected" value={formatKes(dashboard.summary.expectedAmount)} icon={Download} tone="violet" />
        <Metric label="Overdue" value={formatKes(dashboard.summary.overdueAmount)} icon={AlertTriangle} tone="danger" />
        <Metric label="Active accounts" value={dashboard.summary.activeAccounts} icon={Users} tone="teal" />
      </View>

      <View style={styles.grid}>
        <Section title="Collections trend" style={styles.largeSection}>
          <View style={styles.chart}>
            {dashboard.trend.map((item, index) => (
              <View key={item.date} style={styles.barItem}>
                <View style={styles.barWrap}>
                  <View
                    style={[
                      styles.bar,
                      {
                        height: `${(item.amount / maxAmount) * 100}%`,
                        backgroundColor: chartColors[index % chartColors.length]
                      }
                    ]}
                  />
                </View>
                <Text style={styles.barLabel}>{formatShortDate(item.date)}</Text>
              </View>
            ))}
          </View>
        </Section>

        <Section
          title="Alerts"
          action={
            <Pressable onPress={() => onNavigate('notifications')}>
              <Text style={styles.link}>View all</Text>
            </Pressable>
          }
        >
          {latestAlerts.map((notification) => (
            <View key={notification.id} style={styles.alertRow}>
              <View style={styles.alertIcon}>
                <Bell size={16} color={notification.isRead ? colors.warning : colors.danger} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{notification.title}</Text>
                <Text style={styles.rowMuted}>{notification.message}</Text>
              </View>
            </View>
          ))}
          {latestAlerts.length === 0 && (
            <View style={styles.alertRow}>
              <View style={styles.alertIcon}>
                <Bell size={16} color={colors.muted} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>No alerts yet</Text>
                <Text style={styles.rowMuted}>New activity will appear here.</Text>
              </View>
            </View>
          )}
        </Section>
      </View>

      <View style={styles.grid}>
        <Section title="Recent payments" style={styles.largeSection}>
          {payments.slice(0, 4).map((payment) => (
            <View key={payment.id} style={styles.dataRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{payment.customerName}</Text>
                <Text style={styles.rowMuted}>{payment.agentName} | {payment.receipt}</Text>
              </View>
              <Text style={styles.amount}>{formatKes(Number(payment.depositCredit || 0) + Number(payment.paygoPayment || 0))}</Text>
              <StatusPill status={payment.status} />
            </View>
          ))}
        </Section>

        <Section title="Overdue accounts">
          {overdueCustomers.map((customer) => (
            <View key={customer.id} style={styles.dataRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.rowTitle}>{customer.customerName}</Text>
                <Text style={styles.rowMuted}>{customer.overdueDays} days overdue</Text>
              </View>
              <Text style={styles.amount}>{formatKes(customer.balance)}</Text>
            </View>
          ))}
        </Section>
      </View>

      <View style={styles.quickActions}>
        <Button icon={CreditCard} onPress={() => onNavigate('payments')}>Review payments</Button>
        <Button icon={HandCoins} variant="secondary" onPress={() => onNavigate('commissions')}>Pay commissions</Button>
      </View>
    </View>
  );
}

const metricTones = {
  success: { soft: colors.successSoft, color: colors.success },
  violet: { soft: colors.violetSoft, color: colors.violet },
  danger: { soft: colors.dangerSoft, color: colors.danger },
  teal: { soft: colors.tealSoft, color: colors.teal }
};

const chartColors = [colors.success, colors.primary, colors.warning, colors.teal, colors.violet, colors.orange, colors.rose];

function Metric({ label, value, icon: Icon, tone }) {
  const selectedTone = metricTones[tone] ?? metricTones.violet;

  return (
    <View style={styles.metric}>
      <View style={[styles.metricIcon, { backgroundColor: selectedTone.soft }]}>
        <Icon size={19} color={selectedTone.color} />
      </View>
      <View style={{ minWidth: 0 }}>
        <Text style={styles.metricLabel}>{label}</Text>
        <Text numberOfLines={1} style={styles.metricValue}>{value}</Text>
      </View>
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
  metricStrip: { backgroundColor: 'var(--app-surface)', borderWidth: 1, borderColor: 'var(--app-border)', borderRadius: 8, flexDirection: 'row', flexWrap: 'wrap' },
  metric: { flex: 1, minWidth: 210, padding: 16, borderRightWidth: 1, borderRightColor: 'var(--app-border)', flexDirection: 'row', alignItems: 'center', gap: 12 },
  metricIcon: { width: 38, height: 38, borderRadius: 8, backgroundColor: colors.primarySoft, alignItems: 'center', justifyContent: 'center' },
  metricLabel: { color: 'var(--app-muted)', fontSize: 12, fontWeight: '500' },
  metricValue: { fontSize: 21, fontWeight: '500', marginTop: 4 },
  grid: { flexDirection: 'row', gap: 18, flexWrap: 'wrap' },
  largeSection: { flex: 1.5, minWidth: 320 },
  chart: { height: 240, padding: 16, flexDirection: 'row', alignItems: 'flex-end', gap: 12 },
  barItem: { flex: 1, alignItems: 'center', gap: 8 },
  barWrap: { height: 180, width: '100%', backgroundColor: 'var(--app-bg)', borderRadius: 8, justifyContent: 'flex-end', overflow: 'hidden' },
  bar: { backgroundColor: colors.primary, borderRadius: 8 },
  barLabel: { color: 'var(--app-muted)', fontSize: 11, fontWeight: '500' },
  alertRow: { padding: 14, borderBottomWidth: 1, borderBottomColor: 'var(--app-border)', flexDirection: 'row', gap: 10 },
  alertIcon: { width: 30, height: 30, borderRadius: 8, backgroundColor: colors.orangeSoft, alignItems: 'center', justifyContent: 'center' },
  dataRow: { padding: 14, borderBottomWidth: 1, borderBottomColor: 'var(--app-border)', flexDirection: 'row', alignItems: 'center', gap: 12 },
  rowTitle: { fontWeight: '500', fontSize: 14 },
  rowMuted: { color: 'var(--app-muted)', fontSize: 12, marginTop: 3 },
  amount: { fontWeight: '500' },
  link: { color: colors.primary, fontWeight: '500', fontSize: 13 },
  quickActions: { flexDirection: 'row', gap: 10, flexWrap: 'wrap' }
});
