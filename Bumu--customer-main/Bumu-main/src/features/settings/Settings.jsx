import React, { useMemo } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ScrollView, TextInput } from 'react-native';
import '../../../features/settings/settings.css';

export default function Settings({
  theme,
  selectedAction = '',
  settings = {},
  passwordMessage = '',
  onToggleTheme,
  onToggleSetting,
  onUpdateSetting,
  onChangePassword,
}) {
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [password, setPassword] = React.useState({ current: '', next: '', confirm: '' });

  const toggles = [
    { key: 'smsNotifications', label: 'SMS Notifications', description: 'Receive approval, rejection, payment reminder, and commission SMS alerts.' },
    { key: 'inAppNotifications', label: 'In-app Notifications', description: 'Show activity alerts inside the portal.' },
    { key: 'paymentReminders', label: 'Rider Payment Reminders', description: 'Show reminders for due or overdue rider installments.' },
    { key: 'simpleMode', label: 'Simple Mode', description: 'Show fewer details and bigger work-focused sections for field agents.' },
    { key: 'compactTables', label: 'Compact Tables', description: 'Use denser portfolio tables for faster scanning.' },
  ];

  const updatePassword = (key, value) => setPassword((current) => ({ ...current, [key]: value }));
  const show = (...actions) => !selectedAction || actions.includes(selectedAction);
  const submitPassword = () => {
    onChangePassword(password);
    setPassword({ current: '', next: '', confirm: '' });
  };

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.content}>
      <Text style={styles.title}>Settings</Text>

      {show('Change password') && <View style={styles.sectionCard}>
        <Text style={styles.sectionHeading}>Change Password</Text>
        <TextInput style={styles.input} placeholder="Current password" value={password.current} onChangeText={(value) => updatePassword('current', value)} secureTextEntry />
        <TextInput style={styles.input} placeholder="New password" value={password.next} onChangeText={(value) => updatePassword('next', value)} secureTextEntry />
        <TextInput style={styles.input} placeholder="Confirm new password" value={password.confirm} onChangeText={(value) => updatePassword('confirm', value)} secureTextEntry />
        {!!passwordMessage && <Text style={styles.noteText}>{passwordMessage}</Text>}
        <TouchableOpacity style={styles.optionButton} onPress={submitPassword}>
          <Text style={styles.optionLabel}>Update Password</Text>
        </TouchableOpacity>
      </View>}

      {show('Set agent defaults') && <View style={styles.sectionCard}>
        <Text style={styles.sectionHeading}>Theme</Text>
        <TouchableOpacity style={styles.optionButton} onPress={onToggleTheme}>
          <Text style={styles.optionLabel}>Switch to {theme === 'dark' ? 'Light' : 'Dark'} mode</Text>
        </TouchableOpacity>
      </View>}

      {show('Set agent defaults') && <View style={styles.sectionCard}>
        <Text style={styles.sectionHeading}>Preferences</Text>
        {toggles.map((toggle) => (
          <TouchableOpacity key={toggle.key} style={styles.toggleRow} onPress={() => onToggleSetting(toggle.key, !settings[toggle.key])}>
            <View style={styles.toggleTextWrapper}>
              <Text style={styles.toggleLabel}>{toggle.label}</Text>
              <Text style={styles.toggleDescription}>{toggle.description}</Text>
            </View>
            <View style={[styles.toggleSwitch, settings[toggle.key] ? styles.toggleOn : styles.toggleOff]}>
              <View style={[styles.toggleThumb, settings[toggle.key] && styles.toggleThumbOn]} />
            </View>
          </TouchableOpacity>
        ))}
      </View>}

    </ScrollView>
  );
}

const createStyles = (theme) => {
  const dark = theme === 'dark';
  return StyleSheet.create({
    container: { flex: 1, backgroundColor: '#ffffff' },
    content: { paddingVertical: 16, paddingBottom: 48 },
    title: { fontSize: 24, fontWeight: '800', color: dark ? '#f3f6fb' : '#0b1730', marginBottom: 18, paddingHorizontal: 16, fontFamily: 'Georgia' },
    sectionCard: { backgroundColor: dark ? '#092a75' : '#f5f8ff', borderRadius: 14, padding: 18, marginBottom: 16, marginHorizontal: 16, borderWidth: 1, borderColor: dark ? '#183054' : '#e7eef4' },
    sectionHeading: { fontSize: 16, fontWeight: '800', color: dark ? '#f3f6fb' : '#0b1730', marginBottom: 14, fontFamily: 'Georgia' },
    optionButton: { backgroundColor: '#0f5fff', borderRadius: 10, paddingVertical: 14, paddingHorizontal: 16, alignItems: 'center', alignSelf: 'flex-start' },
    optionLabel: { color: '#ffffff', fontSize: 14, fontWeight: '800', fontFamily: 'Georgia' },
    toggleRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, gap: 12 },
    toggleTextWrapper: { flex: 1 },
    toggleLabel: { fontSize: 14, fontWeight: '800', color: dark ? '#f3f6fb' : '#0b1730', fontFamily: 'Georgia', marginBottom: 4 },
    toggleDescription: { fontSize: 12, color: dark ? '#b8c3d7' : '#627083', lineHeight: 18, fontFamily: 'Georgia' },
    toggleSwitch: { width: 46, height: 26, borderRadius: 999, justifyContent: 'center', backgroundColor: dark ? '#334155' : '#d1d5db' },
    toggleOn: { backgroundColor: '#0f5fff' },
    toggleOff: { backgroundColor: dark ? '#334155' : '#d1d5db' },
    toggleThumb: { width: 18, height: 18, borderRadius: 9, backgroundColor: '#ffffff', marginLeft: 4 },
    toggleThumbOn: { marginLeft: 24 },
    noteText: { fontSize: 13, color: dark ? '#cbd5e1' : '#627083', lineHeight: 20, fontFamily: 'Georgia', marginBottom: 12 },
    field: { marginBottom: 12 },
    fieldLabel: { color: dark ? '#f3f6fb' : '#0b1730', fontSize: 13, fontWeight: '800', fontFamily: 'Georgia', marginBottom: 6 },
    input: { borderWidth: 1, borderColor: dark ? '#334155' : '#dce3ea', borderRadius: 10, padding: 12, color: dark ? '#f8fafc' : '#0f1720', backgroundColor: dark ? '#030814' : '#f8fafc', fontFamily: 'Georgia' },
    reviewBox: { borderWidth: 1, borderColor: dark ? '#27364a' : '#e6eef3', borderRadius: 10, padding: 12, marginTop: 8 },
    lockedCodeBox: { borderWidth: 1, borderColor: dark ? '#27364a' : '#e6eef3', borderRadius: 10, padding: 12, marginBottom: 12, backgroundColor: dark ? '#030814' : '#f8fafc' },
    lockedCode: { color: dark ? '#f3f6fb' : '#0b1730', fontSize: 18, fontWeight: '900', fontFamily: 'Georgia', marginBottom: 5 },
    pendingBox: { borderWidth: 1, borderColor: '#f3b949', borderRadius: 10, padding: 12, marginBottom: 12, backgroundColor: dark ? '#2a2112' : '#fff8e6' },
    reviewTitle: { color: dark ? '#f3f6fb' : '#0b1730', fontWeight: '800', marginBottom: 4, fontFamily: 'Georgia' },
    templateItem: { borderWidth: 1, borderColor: dark ? '#27364a' : '#e6eef3', borderRadius: 10, padding: 12, marginBottom: 10 },
  });
};
