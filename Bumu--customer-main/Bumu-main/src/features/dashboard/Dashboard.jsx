import React, { useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView } from 'react-native';
import '../../../features/dashboard/dashboard.css';

const formatKes = (amount) => `KES ${Number(amount || 0).toLocaleString('en-KE')}`;

export default function Dashboard({ customers = [], notifications = [], tasks = [], commissions = [] }) {
  const styles = useMemo(() => createStyles(), []);

  const riderSummary = {
    total: customers.length,
    active: customers.filter((item) => item.status === 'Active').length,
    pending: customers.filter((item) => item.status === 'Pending' || item.status === 'Info Required').length,
    overdue: customers.filter((item) => item.overdue).length,
  };

  const alerts = [
    ...customers.filter((item) => item.overdue).slice(0, 2).map((item) => `${item.name}: overdue balance ${formatKes(item.remaining)}`),
    ...customers.filter((item) => Number(item.risk || 0) >= 70).slice(0, 2).map((item) => `${item.name}: high risk review`),
    ...notifications.filter((item) => item.unread).slice(0, 2).map((item) => item.title),
    ...tasks.filter((item) => item.status !== 'Done').slice(0, 2).map((item) => item.title),
  ].slice(0, 5);

  const statCards = [
    { label: 'Riders', value: riderSummary.total, letter: 'R', color: 'blue' },
    { label: 'Active', value: riderSummary.active, letter: 'A', color: 'green' },
    { label: 'Pending', value: riderSummary.pending, letter: 'P', color: 'amber' },
    { label: 'Overdue', value: riderSummary.overdue, letter: 'O', color: 'red' },
    { label: 'Commission Balance', value: formatKes(commissions.filter((item) => item.status !== 'Paid' && item.status !== 'Cancelled').reduce((sum, item) => sum + Number(item.amount || 0), 0)), letter: 'C', color: 'blue' },
  ];

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <View style={styles.pageHeader}>
        <Text style={styles.title}>Dashboard</Text>
        <Text style={styles.subtitle}>Quick agent summary</Text>
      </View>

      <View style={styles.statsGrid}>
        {statCards.map((item) => (
          <View key={item.label} style={styles.statsCard}>
            <View style={[styles.statIcon, styles[item.color]]}>
              <Text style={styles.statIconText}>{item.letter}</Text>
            </View>
            <Text style={styles.statLabel}>{item.label}</Text>
            <Text style={styles.statValue}>{item.value}</Text>
          </View>
        ))}
      </View>

      <View style={styles.premiumCard}>
        <View style={styles.cardHeader}>
          <Text style={styles.cardTitle}>Critical Alerts</Text>
          <Text style={[styles.badge, styles.badgeDanger]}>{alerts.length}</Text>
        </View>
        {alerts.length ? alerts.map((item) => (
          <Text key={item} style={styles.alert}>{item}</Text>
        )) : <Text style={styles.empty}>No critical alerts right now.</Text>}
      </View>

    </ScrollView>
  );
}

const createStyles = () => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  content: {
    paddingBottom: 36,
    gap: 16,
  },
  pageHeader: {
    gap: 4,
    marginBottom: 2,
  },
  title: {
    color: '#0b1730',
    fontSize: 26,
    fontWeight: '900',
    fontFamily: 'Georgia',
  },
  subtitle: {
    color: '#51627a',
    fontSize: 13,
    fontFamily: 'Georgia',
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  statsCard: {
    flexGrow: 1,
    flexBasis: 150,
    minHeight: 118,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d8e3f7',
    backgroundColor: '#ffffff',
    padding: 14,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#003040',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  statIcon: {
    width: 42,
    height: 42,
    borderRadius: 999,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 8,
  },
  blue: { backgroundColor: '#0f5fff' },
  green: { backgroundColor: '#23863a' },
  amber: { backgroundColor: '#b86800' },
  red: { backgroundColor: '#bd2a2a' },
  statIconText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '900',
    fontFamily: 'Georgia',
  },
  statLabel: {
    color: '#51627a',
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'Georgia',
    marginBottom: 5,
  },
  statValue: {
    color: '#0b1730',
    fontSize: 18,
    fontWeight: '900',
    fontFamily: 'Georgia',
    textAlign: 'center',
  },
  cardGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  premiumCard: {
    flexGrow: 1,
    flexBasis: 260,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#d8e3f7',
    backgroundColor: '#ffffff',
    padding: 14,
    shadowColor: '#003040',
    shadowOpacity: 0.08,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
  },
  cardHeader: {
    minHeight: 34,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#d8e3f7',
    marginBottom: 8,
  },
  cardTitle: {
    color: '#0b1730',
    fontSize: 15,
    fontWeight: '900',
    fontFamily: 'Georgia',
  },
  row: {
    minHeight: 38,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#eef3fb',
  },
  label: {
    color: '#51627a',
    fontSize: 13,
    fontFamily: 'Georgia',
    flex: 1,
  },
  value: {
    color: '#0b1730',
    fontSize: 13,
    fontWeight: '900',
    fontFamily: 'Georgia',
    textAlign: 'right',
  },
  badge: {
    minWidth: 28,
    borderRadius: 999,
    overflow: 'hidden',
    backgroundColor: '#0f5fff',
    color: '#ffffff',
    textAlign: 'center',
    paddingVertical: 4,
    paddingHorizontal: 8,
    fontSize: 12,
    fontWeight: '900',
    fontFamily: 'Georgia',
  },
  badgeDanger: {
    backgroundColor: '#bd2a2a',
  },
  alert: {
    color: '#0b1730',
    fontSize: 13,
    fontFamily: 'Georgia',
    lineHeight: 20,
    paddingVertical: 5,
    borderBottomWidth: 1,
    borderBottomColor: '#eef3fb',
  },
  empty: {
    color: '#51627a',
    fontSize: 13,
    fontFamily: 'Georgia',
    paddingVertical: 6,
  },
});
