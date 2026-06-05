import React, { useMemo, useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ScrollView } from 'react-native';
import '../../../features/security/security.css';

export default function Security({ theme, selectedAction = '', security, customers, onTogglePrivacy, onLock, onChangePin, onExportAudit }) {
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [pin, setPin] = useState('');
  const [confirmPin, setConfirmPin] = useState('');
  const [message, setMessage] = useState('');

  const highRisk = customers.filter((customer) => Number(customer.risk || customer.riskScore || 0) >= 70).length;
  const auditRows = (security.auditLog || []).slice(0, 12);
  const show = (...actions) => !selectedAction || actions.includes(selectedAction);

  const savePin = () => {
    if (!/^\d{4,6}$/.test(pin)) {
      setMessage('Use a 4 to 6 digit PIN.');
      return;
    }
    if (pin !== confirmPin) {
      setMessage('PINs do not match.');
      return;
    }
    onChangePin(pin);
    setPin('');
    setConfirmPin('');
    setMessage('Secure PIN updated.');
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      {show('Lock session') && <View style={styles.hero}>
        <View style={styles.heroText}>
          <Text style={styles.title}>Security Center</Text>
          <Text style={styles.subtle}>Privacy masking, session lock, PIN control, audit trail, and high-risk rider visibility.</Text>
        </View>
        <TouchableOpacity style={styles.primaryButton} onPress={onLock}>
          <Text style={styles.primaryText}>Lock Session</Text>
        </TouchableOpacity>
      </View>}

      {show('Mask private data', 'Export audit trail') && <View style={styles.stats}>
        <Stat styles={styles} label="Privacy Mode" value={security.privacyMode ? 'On' : 'Off'} />
        <Stat styles={styles} label="Audit Events" value={(security.auditLog || []).length} />
        <Stat styles={styles} label="High Risk" value={highRisk} />
        <Stat styles={styles} label="Failed Unlocks" value={security.failedUnlocks || 0} />
      </View>}

      {show('Mask private data', 'Lock session') && <View style={styles.card}>
        <Text style={styles.heading}>Protection Controls</Text>
        {show('Mask private data') && <TouchableOpacity style={styles.row} onPress={() => onTogglePrivacy(!security.privacyMode)}>
          <View style={styles.rowCopy}>
            <Text style={styles.rowTitle}>Privacy Mask</Text>
            <Text style={styles.subtle}>Hide parts of rider names, phones, and IDs on screen.</Text>
          </View>
          <Text style={styles.stateText}>{security.privacyMode ? 'On' : 'Off'}</Text>
        </TouchableOpacity>}
        {show('Lock session') && <TouchableOpacity style={styles.row} onPress={onLock}>
          <View style={styles.rowCopy}>
            <Text style={styles.rowTitle}>Session Lock</Text>
            <Text style={styles.subtle}>Require a PIN before the agent continues using the portal.</Text>
          </View>
          <Text style={styles.stateText}>Lock now</Text>
        </TouchableOpacity>}
      </View>}

      {show('Change PIN') && <View style={styles.card}>
        <Text style={styles.heading}>Change Secure PIN</Text>
        <TextInput style={styles.input} placeholder="New PIN" value={pin} onChangeText={setPin} keyboardType="number-pad" secureTextEntry />
        <TextInput style={styles.input} placeholder="Confirm PIN" value={confirmPin} onChangeText={setConfirmPin} keyboardType="number-pad" secureTextEntry />
        {!!message && <Text style={styles.message}>{message}</Text>}
        <TouchableOpacity style={styles.primaryButton} onPress={savePin}>
          <Text style={styles.primaryText}>Update PIN</Text>
        </TouchableOpacity>
      </View>}

      {show('Export audit trail') && <View style={styles.card}>
        <View style={styles.cardHeader}>
          <Text style={styles.heading}>Audit Trail</Text>
          <TouchableOpacity style={styles.secondaryButton} onPress={onExportAudit}>
            <Text style={styles.secondaryText}>Export CSV</Text>
          </TouchableOpacity>
        </View>
        {auditRows.length ? auditRows.map((entry, index) => (
          <View key={`${entry.time}-${index}`} style={styles.auditRow}>
            <Text style={styles.rowTitle}>{entry.action}</Text>
            <Text style={styles.subtle}>{entry.details || 'No details'}</Text>
            <Text style={styles.auditMeta}>{entry.time} - {entry.agent}</Text>
          </View>
        )) : <Text style={styles.subtle}>No audit events yet.</Text>}
      </View>}
    </ScrollView>
  );
}

function Stat({ styles, label, value }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

const createStyles = (theme) => {
  const dark = theme === 'dark';
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: '#ffffff' },
    content: { padding: 16, paddingBottom: 48 },
    hero: { backgroundColor: dark ? '#092a75' : '#f5f8ff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: dark ? '#183054' : '#e7eef4', gap: 14 },
    heroText: { gap: 6 },
    title: { color: dark ? '#f3f6fb' : '#0b1730', fontSize: 24, fontWeight: '800', fontFamily: 'Georgia' },
    subtle: { color: dark ? '#b8c3d7' : '#627083', fontSize: 13, lineHeight: 19, fontFamily: 'Georgia' },
    stats: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, marginVertical: 16 },
    statCard: { flexGrow: 1, minWidth: 140, backgroundColor: dark ? '#092a75' : '#f5f8ff', borderRadius: 14, padding: 14, borderWidth: 1, borderColor: dark ? '#183054' : '#e7eef4' },
    statLabel: { color: dark ? '#b8c3d7' : '#627083', fontSize: 12, fontFamily: 'Georgia' },
    statValue: { color: dark ? '#f3f6fb' : '#0b1730', fontSize: 24, fontWeight: '800', marginTop: 4, fontFamily: 'Georgia' },
    card: { backgroundColor: dark ? '#092a75' : '#f5f8ff', borderRadius: 14, padding: 16, borderWidth: 1, borderColor: dark ? '#183054' : '#e7eef4', marginBottom: 16 },
    cardHeader: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, marginBottom: 8 },
    heading: { color: dark ? '#f3f6fb' : '#0b1730', fontSize: 16, fontWeight: '800', fontFamily: 'Georgia', marginBottom: 10 },
    row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingVertical: 12, borderTopWidth: 1, borderTopColor: dark ? '#183054' : '#edf2f7', gap: 12 },
    rowCopy: { flex: 1 },
    rowTitle: { color: dark ? '#f3f6fb' : '#0b1730', fontSize: 14, fontWeight: '800', fontFamily: 'Georgia' },
    stateText: { color: '#0f5fff', fontSize: 13, fontWeight: '800', fontFamily: 'Georgia' },
    input: { borderWidth: 1, borderColor: dark ? '#334155' : '#dce3ea', borderRadius: 10, padding: 12, marginBottom: 12, color: dark ? '#f8fafc' : '#0f1720', backgroundColor: dark ? '#030814' : '#f8fafc', fontFamily: 'Georgia' },
    primaryButton: { backgroundColor: '#0f5fff', borderRadius: 10, paddingVertical: 12, paddingHorizontal: 16, alignSelf: 'flex-start' },
    primaryText: { color: '#ffffff', fontWeight: '800', fontFamily: 'Georgia' },
    secondaryButton: { backgroundColor: dark ? '#223044' : '#edf3ff', borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12 },
    secondaryText: { color: dark ? '#f3f6fb' : '#0f5fff', fontWeight: '800', fontFamily: 'Georgia' },
    message: { color: '#0f5fff', fontSize: 13, marginBottom: 12, fontFamily: 'Georgia' },
    auditRow: { borderTopWidth: 1, borderTopColor: dark ? '#183054' : '#edf2f7', paddingVertical: 12 },
    auditMeta: { color: dark ? '#7f93a8' : '#8a97a8', fontSize: 11, marginTop: 4, fontFamily: 'Georgia' },
  });
};
