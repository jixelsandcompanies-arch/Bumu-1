import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet, useWindowDimensions } from 'react-native';
import '../../../features/commissions/commissions.css';

const formatKes = (amount) => `KES ${Number(amount || 0).toLocaleString('en-KE')}`;

const commissionRate = (progress) => {
  const percent = Number(progress || 0);
  if (percent >= 85) return 0.03;
  if (percent >= 75) return 0.02;
  if (percent >= 65) return 0.01;
  return 0;
};

export default function Commissions({ theme, selectedAction = '', commissions = [], customers = [], onExportCsv }) {
  const { width } = useWindowDimensions();
  const isPhone = width < 720;
  const paid = commissions.filter((item) => item.status === 'Paid').length;
  const pending = commissions.filter((item) => item.status === 'Pending').length;
  const cancelled = commissions.filter((item) => item.status === 'Cancelled').length;
  const totalEarned = commissions.reduce((sum, item) => sum + Number(item.amount || 0), 0);
  const ledgerByRider = commissions.reduce((acc, item) => {
    const key = String(item.rider || '').trim().toLowerCase();
    if (!key) return acc;
    if (!acc[key] || item.status === 'Paid') acc[key] = item;
    return acc;
  }, {});
  const estimatedRows = customers.map((customer) => {
    const paidAmount = Number(customer.paid || 0);
    const total = Number(customer.totalPrice || 0);
    const progress = total ? Math.round((paidAmount / total) * 100) : Number(customer.progress || 0);
    const rate = commissionRate(progress);
    const ledger = ledgerByRider[String(customer.name || '').trim().toLowerCase()];
    const financeStatus = ledger?.status || (rate > 0 ? 'Waiting Finance' : 'Not eligible yet');
    return {
      id: customer.id,
      rider: customer.name,
      cardId: customer.cardId,
      paidAmount,
      progress,
      rate,
      commission: Math.round(paidAmount * rate),
      status: ledger?.status === 'Paid' ? 'Paid by Finance' : rate > 0 ? 'Estimated / Waiting Finance' : 'Not eligible yet',
      financeStatus,
      paidByFinance: ledger?.status === 'Paid',
    };
  });
  const eligibleEstimates = estimatedRows.filter((item) => item.rate > 0);
  const totalEstimated = eligibleEstimates.reduce((sum, item) => sum + item.commission, 0);

  const styles = useMemo(() => createStyles(theme), [theme]);
  const show = (...actions) => !selectedAction || actions.includes(selectedAction);

  return (
    <ScrollView style={styles.container}>
      {show('Read totals') && <View style={styles.summaryGrid}>
        <View style={[styles.summaryCard, styles.primaryCard]}>
          <Text style={styles.summaryLabel}>Finance Ledger</Text>
          <Text style={styles.summaryValue}>{formatKes(totalEarned)}</Text>
        </View>
        <View style={[styles.summaryCard, styles.successCard]}>
          <Text style={styles.summaryLabel}>Estimated Commission</Text>
          <Text style={styles.summaryValue}>{formatKes(totalEstimated)}</Text>
        </View>
        <View style={[styles.summaryCard, styles.warningCard]}>
          <Text style={styles.summaryLabel}>Eligible Riders</Text>
          <Text style={styles.summaryValue}>{eligibleEstimates.length}</Text>
        </View>
        <View style={[styles.summaryCard, styles.dangerCard]}>
          <Text style={styles.summaryLabel}>Finance Records</Text>
          <Text style={styles.summaryValue}>{paid + pending + cancelled}</Text>
        </View>
      </View>}

      {show('Read totals', 'Review ledger', 'Export report') && <View style={styles.ruleBox}>
        <Text style={styles.tableTitle}>Commission Estimate Rules</Text>
        <Text style={styles.ruleText}>65% - 74% paid progress: 1% of rider paid amount</Text>
        <Text style={styles.ruleText}>75% - 84% paid progress: 2% of rider paid amount</Text>
        <Text style={styles.ruleText}>85% - 100% paid progress: 3% of rider paid amount</Text>
        <Text style={styles.ruleNote}>Agent portal estimate only. Finance confirms final payout.</Text>
      </View>}

      {show('Read totals', 'Review ledger', 'Export report') && <View style={styles.tableHeader}>
        <Text style={styles.tableTitle}>Commission Estimate Per Rider</Text>
        {show('Export report') && <TouchableOpacity
          style={styles.exportButton}
          onPress={() => onExportCsv('bumu-commission-estimates.csv', [
            ['Rider', 'Card ID', 'Paid Amount', 'Progress %', 'Rate %', 'Estimated Commission', 'Status'],
            ...estimatedRows.map((item) => [item.rider, item.cardId || '', item.paidAmount, item.progress, item.rate * 100, item.commission, item.financeStatus, item.status]),
          ])}
        >
          <Text style={styles.exportButtonText}>Export Estimate</Text>
        </TouchableOpacity>}
      </View>}

      {show('Read totals', 'Review ledger', 'Export report') && isPhone && (
        <View style={styles.mobileList}>
          {estimatedRows.map((item) => (
            <View key={`estimate-card-${item.id}`} style={styles.mobileCard}>
              <View style={styles.mobileCardHeader}>
                <Text style={styles.mobileTitle}>{item.rider || '-'}</Text>
                <Text style={[styles.mobileStatus, item.paidByFinance ? styles.statusTextPaid : item.rate > 0 ? styles.statusTextPending : styles.statusTextCancelled]}>
                  {item.paidByFinance ? 'Paid' : item.rate > 0 ? 'Estimate' : 'No commission'}
                </Text>
              </View>
              <InfoRow styles={styles} label="Card ID" value={item.cardId || '-'} />
              <InfoRow styles={styles} label="Paid Amount" value={formatKes(item.paidAmount)} />
              <InfoRow styles={styles} label="Progress" value={`${item.progress}%`} />
              <InfoRow styles={styles} label="Rate" value={item.rate ? `${item.rate * 100}%` : '0%'} />
              <InfoRow styles={styles} label="Commission" value={formatKes(item.commission)} strong />
            </View>
          ))}
          {!estimatedRows.length && <Text style={styles.emptyText}>No riders available for commission estimates.</Text>}
        </View>
      )}

      {show('Read totals', 'Review ledger', 'Export report') && !isPhone && (
        <ScrollView horizontal showsHorizontalScrollIndicator style={styles.tableWrap}>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHead]}>
              {['Rider', 'Card ID', 'Paid Amount', 'Progress', 'Rate', 'Commission', 'Status'].map((label) => (
                <Text key={label} style={[styles.tableCell, styles.tableHeadText]}>{label}</Text>
              ))}
            </View>
            {estimatedRows.map((item) => (
              <View key={`estimate-${item.id}`} style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.tableStrong]}>{item.rider || '-'}</Text>
                <Text style={styles.tableCell}>{item.cardId || '-'}</Text>
                <Text style={styles.tableCell}>{formatKes(item.paidAmount)}</Text>
                <Text style={styles.tableCell}>{item.progress}%</Text>
                <Text style={styles.tableCell}>{item.rate ? `${item.rate * 100}%` : '0%'}</Text>
                <Text style={[styles.tableCell, styles.tableStrong]}>{formatKes(item.commission)}</Text>
                <Text style={[styles.tableCell, item.paidByFinance ? styles.statusTextPaid : item.rate > 0 ? styles.statusTextPending : styles.statusTextCancelled]}>
                  {item.paidByFinance ? 'Paid' : item.rate > 0 ? 'Estimate' : 'No commission'}
                </Text>
              </View>
            ))}
            {!estimatedRows.length && <Text style={styles.emptyText}>No riders available for commission estimates.</Text>}
          </View>
        </ScrollView>
      )}

      {show('Review ledger', 'Filter by status mentally', 'Export report') && <View style={styles.tableHeader}>
        <Text style={styles.tableTitle}>Finance Commission Ledger</Text>
        {show('Export report') && <TouchableOpacity
          style={styles.exportButton}
          onPress={() => onExportCsv('bumu-commissions.csv', [['Rider', 'Type', 'Amount', 'Status', 'Date'], ...commissions.map((item) => [item.rider, item.type, `KES ${item.amount}`, item.status, item.date])])}
        >
          <Text style={styles.exportButtonText}>Export CSV</Text>
        </TouchableOpacity>}
      </View>}

      {show('Review ledger', 'Filter by status mentally', 'Export report') && isPhone && (
        <View style={styles.mobileList}>
          {commissions.map((item) => (
            <View key={`ledger-card-${item.id}`} style={styles.mobileCard}>
              <View style={styles.mobileCardHeader}>
                <Text style={styles.mobileTitle}>{item.rider || '-'}</Text>
                <Text style={[styles.mobileStatus, item.status === 'Paid' ? styles.statusTextPaid : item.status === 'Pending' ? styles.statusTextPending : styles.statusTextCancelled]}>{item.status || '-'}</Text>
              </View>
              <InfoRow styles={styles} label="Type" value={item.type || '-'} />
              <InfoRow styles={styles} label="Amount" value={formatKes(item.amount)} strong />
              <InfoRow styles={styles} label="Date" value={item.date || '-'} />
            </View>
          ))}
          {!commissions.length && <Text style={styles.emptyText}>No commission records yet.</Text>}
        </View>
      )}

      {show('Review ledger', 'Filter by status mentally', 'Export report') && !isPhone && (
        <ScrollView horizontal showsHorizontalScrollIndicator style={styles.tableWrap}>
          <View style={styles.table}>
            <View style={[styles.tableRow, styles.tableHead]}>
              {['Rider', 'Type', 'Amount', 'Status', 'Date'].map((label) => (
                <Text key={label} style={[styles.tableCell, styles.tableHeadText]}>{label}</Text>
              ))}
            </View>
            {commissions.map((item) => (
              <View key={item.id} style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.tableStrong]}>{item.rider || '-'}</Text>
                <Text style={styles.tableCell}>{item.type || '-'}</Text>
                <Text style={[styles.tableCell, styles.tableStrong]}>{formatKes(item.amount)}</Text>
                <Text style={[styles.tableCell, item.status === 'Paid' ? styles.statusTextPaid : item.status === 'Pending' ? styles.statusTextPending : styles.statusTextCancelled]}>{item.status || '-'}</Text>
                <Text style={styles.tableCell}>{item.date || '-'}</Text>
              </View>
            ))}
            {!commissions.length && <Text style={styles.emptyText}>No commission records yet.</Text>}
          </View>
        </ScrollView>
      )}
    </ScrollView>
  );
}

function InfoRow({ styles, label, value, strong = false }) {
  return (
    <View style={styles.infoRow}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={[styles.infoValue, strong && styles.tableStrong]}>{value}</Text>
    </View>
  );
}

const createStyles = (theme) => {
  const dark = theme === 'dark';
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#ffffff',
      paddingVertical: 16,
      paddingHorizontal: 0,
    },
    summaryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: 14,
      marginHorizontal: 16,
      marginBottom: 16,
    },
    summaryCard: {
      flexGrow: 1,
      flexBasis: 220,
      backgroundColor: dark ? '#092a75' : '#f5f8ff',
      borderRadius: 8,
      padding: 18,
      minHeight: 110,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 14,
      elevation: 3,
    },
    summaryLabel: {
      fontSize: 13,
      color: dark ? '#aebbd0' : '#627083',
      marginBottom: 10,
      fontFamily: 'Georgia',
    },
    summaryValue: {
      fontSize: 20,
      fontWeight: '800',
      color: dark ? '#f3f6fb' : '#0b1730',
      fontFamily: 'Georgia',
    },
    primaryCard: {
      borderColor: '#dce3ea',
      borderWidth: 1,
    },
    successCard: {
      borderColor: '#2f7cff',
      borderWidth: 1,
    },
    warningCard: {
      borderColor: '#b86800',
      borderWidth: 1,
    },
    dangerCard: {
      borderColor: '#bd2a2a',
      borderWidth: 1,
    },
    tableHeader: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      alignItems: 'center',
      gap: 10,
      marginHorizontal: 16,
      marginBottom: 12,
    },
    tableTitle: {
      fontSize: 18,
      fontWeight: '800',
      color: dark ? '#f3f6fb' : '#0b1730',
      fontFamily: 'Georgia',
    },
    ruleBox: {
      marginHorizontal: 16,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: dark ? '#11264b' : '#d8e3f7',
      backgroundColor: dark ? '#092a75' : '#f5f8ff',
      borderRadius: 8,
      padding: 16,
      gap: 6,
    },
    ruleText: {
      color: dark ? '#f3f6fb' : '#0b1730',
      fontSize: 13,
      fontFamily: 'Georgia',
      lineHeight: 19,
    },
    ruleNote: {
      color: '#0f5fff',
      fontSize: 12,
      fontWeight: '900',
      fontFamily: 'Georgia',
      marginTop: 4,
    },
    exportButton: {
      backgroundColor: '#0f5fff',
      borderRadius: 8,
      paddingVertical: 10,
      paddingHorizontal: 16,
    },
    exportButtonText: {
      color: '#ffffff',
      fontSize: 13,
      fontFamily: 'Georgia',
      fontWeight: '700',
    },
    tableWrap: {
      marginHorizontal: 16,
      marginBottom: 18,
    },
    mobileList: {
      marginHorizontal: 16,
      marginBottom: 18,
      gap: 10,
    },
    mobileCard: {
      borderWidth: 1,
      borderColor: dark ? '#11264b' : '#d8e3f7',
      borderRadius: 8,
      backgroundColor: dark ? '#092a75' : '#ffffff',
      padding: 12,
      gap: 8,
    },
    mobileCardHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
      gap: 10,
      borderBottomWidth: 1,
      borderBottomColor: dark ? '#11264b' : '#eef3fb',
      paddingBottom: 8,
    },
    mobileTitle: {
      flex: 1,
      color: dark ? '#f3f6fb' : '#0b1730',
      fontSize: 15,
      fontWeight: '900',
      fontFamily: 'Georgia',
    },
    mobileStatus: {
      fontSize: 12,
      fontFamily: 'Georgia',
      textAlign: 'right',
    },
    infoRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      gap: 12,
      minHeight: 28,
      alignItems: 'center',
    },
    infoLabel: {
      color: dark ? '#aebbd0' : '#627083',
      fontSize: 12,
      fontWeight: '800',
      fontFamily: 'Georgia',
      flex: 1,
    },
    infoValue: {
      color: dark ? '#f3f6fb' : '#0b1730',
      fontSize: 13,
      fontFamily: 'Georgia',
      textAlign: 'right',
      flex: 1,
    },
    table: {
      minWidth: 920,
      borderWidth: 1,
      borderColor: dark ? '#11264b' : '#d8e3f7',
      borderRadius: 8,
      overflow: 'hidden',
      backgroundColor: dark ? '#092a75' : '#ffffff',
    },
    tableRow: {
      flexDirection: 'row',
      minHeight: 48,
      borderBottomWidth: 1,
      borderBottomColor: dark ? '#11264b' : '#eef3fb',
      alignItems: 'center',
    },
    tableHead: {
      backgroundColor: dark ? '#0f1720' : '#f5f8ff',
    },
    tableCell: {
      width: 132,
      paddingVertical: 11,
      paddingHorizontal: 10,
      fontSize: 12,
      color: dark ? '#f3f6fb' : '#0b1730',
      fontFamily: 'Georgia',
    },
    tableHeadText: {
      color: '#0f5fff',
      fontWeight: '900',
    },
    tableStrong: {
      fontWeight: '900',
    },
    statusTextPaid: {
      color: '#0f5fff',
      fontWeight: '900',
    },
    statusTextPending: {
      color: '#b86800',
      fontWeight: '900',
    },
    statusTextCancelled: {
      color: '#bd2a2a',
      fontWeight: '900',
    },
    emptyText: {
      padding: 18,
      color: dark ? '#aebbd0' : '#627083',
      fontFamily: 'Georgia',
    },
  });
};
