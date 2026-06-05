import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';

const formatKes = (amount) => `KES ${Number(amount || 0).toLocaleString('en-KE')}`;

export default function Screening({ theme, customers = [], onDecision }) {
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [reasonById, setReasonById] = useState({});
  const queue = customers.filter((customer) => (
    customer.backOfficeQueue
    || customer.screeningStatus === 'Queued'
    || customer.status === 'Pending'
    || customer.status === 'Info Required'
  ));

  const setReason = (id, value) => {
    setReasonById((current) => ({ ...current, [id]: value }));
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Screening Queue</Text>
      <Text style={styles.subtle}>Review pending applications and send approval, rejection, or information requests.</Text>

      {queue.map((customer) => (
        <View key={customer.id} style={styles.card}>
          <View style={styles.header}>
            <View style={styles.headerCopy}>
              <Text style={styles.name}>{customer.name}</Text>
              <Text style={styles.meta}>{customer.cardId || customer.contractId || 'Pending card'} | {customer.phone}</Text>
            </View>
            <Text style={styles.status}>{customer.screeningStatus || customer.status || 'Queued'}</Text>
          </View>

          <View style={styles.grid}>
            <Info styles={styles} label="National ID" value={customer.nationalId || '-'} />
            <Info styles={styles} label="Bike" value={customer.bike || '-'} />
            <Info styles={styles} label="Chassis" value={customer.chassis || '-'} />
            <Info styles={styles} label="Deposit" value={customer.deposit || formatKes(customer.paid || 0)} />
            <Info styles={styles} label="Installment" value={customer.installment || '-'} />
            <Info styles={styles} label="Queue Ref" value={customer.screeningQueueId || customer.backOfficeQueue?.id || '-'} />
          </View>

          <TextInput
            style={styles.input}
            value={reasonById[customer.id] || ''}
            onChangeText={(value) => setReason(customer.id, value)}
            placeholder="Reason for rejection or info request"
            placeholderTextColor={theme === 'dark' ? '#7f93a8' : '#8a97a8'}
          />

          <View style={styles.actions}>
            <TouchableOpacity style={styles.approveButton} onPress={() => onDecision(customer.id, 'approve', reasonById[customer.id] || '')}>
              <Text style={styles.actionText}>Approve</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.infoButton} onPress={() => onDecision(customer.id, 'info-required', reasonById[customer.id] || 'More information required.')}>
              <Text style={styles.actionText}>Info Required</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.rejectButton} onPress={() => onDecision(customer.id, 'reject', reasonById[customer.id] || 'Application rejected.')}>
              <Text style={styles.actionText}>Reject</Text>
            </TouchableOpacity>
          </View>
        </View>
      ))}

      {!queue.length && <Text style={styles.empty}>No applications are waiting for screening.</Text>}
    </ScrollView>
  );
}

function Info({ styles, label, value }) {
  return (
    <View style={styles.infoBox}>
      <Text style={styles.infoLabel}>{label}</Text>
      <Text style={styles.infoValue}>{value}</Text>
    </View>
  );
}

const createStyles = (theme) => {
  const dark = theme === 'dark';
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: '#ffffff' },
    content: { paddingBottom: 36, gap: 12 },
    title: { color: dark ? '#f3f6fb' : '#0b1730', fontSize: 24, fontWeight: '900', fontFamily: 'Georgia' },
    subtle: { color: dark ? '#b8c3d7' : '#627083', fontSize: 13, lineHeight: 19, fontFamily: 'Georgia', marginBottom: 6 },
    card: { borderWidth: 1, borderColor: dark ? '#11264b' : '#d8e3f7', backgroundColor: dark ? '#092a75' : '#ffffff', borderRadius: 8, padding: 14, gap: 12 },
    header: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', gap: 10 },
    headerCopy: { gap: 4, flex: 1, minWidth: 220 },
    name: { color: dark ? '#f3f6fb' : '#0b1730', fontSize: 16, fontWeight: '900', fontFamily: 'Georgia' },
    meta: { color: dark ? '#b8c3d7' : '#627083', fontSize: 12, fontFamily: 'Georgia' },
    status: { color: '#ffffff', backgroundColor: '#b86800', borderRadius: 999, overflow: 'hidden', paddingVertical: 6, paddingHorizontal: 10, fontSize: 12, fontWeight: '900', fontFamily: 'Georgia' },
    grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 10 },
    infoBox: { flexGrow: 1, flexBasis: 150, borderWidth: 1, borderColor: dark ? '#26364a' : '#eef3fb', borderRadius: 8, padding: 10, backgroundColor: dark ? '#0f1720' : '#f8fafc' },
    infoLabel: { color: dark ? '#b8c3d7' : '#627083', fontSize: 11, fontWeight: '900', fontFamily: 'Georgia', marginBottom: 4 },
    infoValue: { color: dark ? '#f3f6fb' : '#0b1730', fontSize: 13, fontWeight: '800', fontFamily: 'Georgia' },
    input: { borderWidth: 1, borderColor: dark ? '#334155' : '#dce3ea', borderRadius: 10, padding: 12, color: dark ? '#f8fafc' : '#0f1720', backgroundColor: dark ? '#030814' : '#f8fafc', fontFamily: 'Georgia' },
    actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
    approveButton: { backgroundColor: '#23863a', borderRadius: 9, paddingVertical: 10, paddingHorizontal: 12 },
    infoButton: { backgroundColor: '#0f5fff', borderRadius: 9, paddingVertical: 10, paddingHorizontal: 12 },
    rejectButton: { backgroundColor: '#bd2a2a', borderRadius: 9, paddingVertical: 10, paddingHorizontal: 12 },
    actionText: { color: '#ffffff', fontSize: 12, fontWeight: '900', fontFamily: 'Georgia' },
    empty: { color: dark ? '#b8c3d7' : '#627083', fontSize: 13, textAlign: 'center', paddingVertical: 24, fontFamily: 'Georgia' },
  });
};
