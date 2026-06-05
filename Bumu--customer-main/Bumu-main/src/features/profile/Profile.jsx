import React, { useMemo, useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from 'react-native';
import '../../../features/profile/profile.css';

export default function Profile({ theme, selectedAction = '', agent = {}, onUpdateAgent, onLogout }) {
  const [editing, setEditing] = useState(false);
  const [profile, setProfile] = useState({
    fullName: agent.fullName || '',
    agentCode: agent.agentCode || '',
    phone: agent.phone || '',
    email: agent.email || '',
    region: agent.region || '',
  });

  useEffect(() => {
    setProfile({
      fullName: agent.fullName || '',
      agentCode: agent.agentCode || '',
      phone: agent.phone || '',
      email: agent.email || '',
      region: agent.region || '',
    });
  }, [agent]);

  const styles = useMemo(() => createStyles(theme), [theme]);
  const update = (key, value) => setProfile((current) => ({ ...current, [key]: value }));
  const save = () => {
    const { agentCode, ...editableProfile } = profile;
    onUpdateAgent(editableProfile);
    setEditing(false);
  };
  const pending = agent.profileApprovalStatus === 'Pending' && agent.pendingProfileUpdate;
  const show = (...actions) => !selectedAction || actions.includes(selectedAction);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Profile</Text>
      <View style={styles.profileCard}>
        <View style={styles.avatarContainer}>
          <Text style={styles.avatar}>{profile.fullName.split(' ').map((part) => part[0]).join('').slice(0, 2)}</Text>
        </View>

        {show('Confirm agent identity', 'Update profile') && <View style={styles.statusBox}>
          <Text style={styles.statusTitle}>Agent Code Locked</Text>
          <Text style={styles.statusText}>{profile.agentCode}</Text>
          <Text style={styles.statusNote}>This code is permanent and cannot be changed by the agent.</Text>
        </View>}

        {show('Confirm agent identity', 'Update profile') && <View style={styles.statusBox}>
          <Text style={styles.statusTitle}>Approval Status</Text>
          <Text style={styles.statusText}>{agent.approvalStatus || 'Approved'}</Text>
          <Text style={styles.statusNote}>Profile change status: {agent.profileApprovalStatus || 'Approved'}</Text>
          {!!agent.pendingProfileUpdate?.requestedAt && <Text style={styles.statusNote}>Last submitted change: {agent.pendingProfileUpdate.requestedAt}</Text>}
        </View>}

        {show('Confirm agent identity', 'Update profile') && pending && (
          <View style={styles.pendingBox}>
            <Text style={styles.pendingTitle}>Pending Admin Approval</Text>
            <Text style={styles.statusNote}>Your latest profile changes are waiting for admin approval. Approved details stay active until admin accepts them.</Text>
          </View>
        )}

        {show('Confirm agent identity', 'Update profile') && ['fullName', 'phone', 'email', 'region'].map((key) => (
          <View key={key} style={styles.infoSection}>
            <Text style={styles.label}>{key.replace(/([A-Z])/g, ' $1')}</Text>
            {editing ? (
              <TextInput style={styles.input} value={profile[key]} onChangeText={(value) => update(key, value)} />
            ) : (
              <Text style={styles.value}>{profile[key]}</Text>
            )}
          </View>
        ))}

        {show('Update profile') && <TouchableOpacity style={styles.editButton} onPress={editing ? save : () => setEditing(true)}>
          <Text style={styles.editButtonText}>{editing ? 'Submit for Admin Approval' : 'Edit Profile'}</Text>
        </TouchableOpacity>}
        {show('Sign out safely') && <TouchableOpacity style={styles.logoutButton} onPress={onLogout}>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>}
      </View>
    </View>
  );
}

const createStyles = (theme) => {
  const dark = theme === 'dark';
  return StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: '#ffffff',
      padding: 16,
    },
    title: {
      fontSize: 24,
      fontWeight: '800',
      color: dark ? '#f3f6fb' : '#0b1730',
      marginBottom: 16,
      fontFamily: 'Georgia',
    },
    profileCard: {
      backgroundColor: dark ? '#092a75' : '#f5f8ff',
      borderRadius: 18,
      padding: 24,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 18,
      elevation: 4,
    },
    avatarContainer: {
      width: 88,
      height: 88,
      borderRadius: 44,
      backgroundColor: '#0f5fff',
      justifyContent: 'center',
      alignItems: 'center',
      marginBottom: 24,
      alignSelf: 'center',
    },
    avatar: {
      fontSize: 34,
      color: '#ffffff',
      fontWeight: '800',
      fontFamily: 'Georgia',
    },
    infoSection: {
      marginBottom: 16,
    },
    statusBox: {
      borderWidth: 1,
      borderColor: dark ? '#334155' : '#dce3ea',
      backgroundColor: dark ? '#0f1720' : '#f8fafc',
      borderRadius: 12,
      padding: 14,
      marginBottom: 16,
    },
    pendingBox: {
      borderWidth: 1,
      borderColor: '#f3b949',
      backgroundColor: dark ? '#2a2112' : '#fff8e6',
      borderRadius: 12,
      padding: 14,
      marginBottom: 16,
    },
    statusTitle: {
      color: '#0f5fff',
      fontSize: 12,
      fontWeight: '900',
      fontFamily: 'Georgia',
      marginBottom: 4,
    },
    pendingTitle: {
      color: dark ? '#f8d783' : '#8a5a00',
      fontSize: 13,
      fontWeight: '900',
      fontFamily: 'Georgia',
      marginBottom: 4,
    },
    statusText: {
      color: dark ? '#f3f6fb' : '#0b1730',
      fontSize: 18,
      fontWeight: '900',
      fontFamily: 'Georgia',
      marginBottom: 4,
    },
    statusNote: {
      color: dark ? '#b8c3d7' : '#627083',
      fontSize: 12,
      lineHeight: 18,
      fontFamily: 'Georgia',
    },
    label: {
      fontSize: 12,
      color: dark ? '#b8c3d7' : '#627083',
      marginBottom: 6,
      fontFamily: 'Georgia',
    },
    value: {
      fontSize: 14,
      color: dark ? '#f3f6fb' : '#0b1730',
      fontWeight: '500',
      fontFamily: 'Georgia',
    },
    input: {
      borderWidth: 1,
      borderColor: dark ? '#334155' : '#dce3ea',
      borderRadius: 10,
      padding: 12,
      color: dark ? '#f3f6fb' : '#0b1730',
      backgroundColor: dark ? '#0f1720' : '#f8fafc',
      fontFamily: 'Georgia',
    },
    editButton: {
      backgroundColor: '#0f5fff',
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginTop: 24,
    },
    editButtonText: {
      color: '#ffffff',
      fontSize: 14,
      fontWeight: '700',
      fontFamily: 'Georgia',
    },
    logoutButton: {
      borderRadius: 12,
      padding: 16,
      alignItems: 'center',
      marginTop: 12,
      borderWidth: 1,
      borderColor: '#bd2a2a',
    },
    logoutText: {
      color: '#bd2a2a',
      fontSize: 14,
      fontWeight: '700',
      fontFamily: 'Georgia',
    },
  });
};
