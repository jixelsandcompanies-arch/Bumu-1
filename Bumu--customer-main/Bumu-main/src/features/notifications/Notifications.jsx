import React, { useMemo } from 'react';
import { View, Text, ScrollView, TouchableOpacity, StyleSheet } from 'react-native';
import '../../../features/notifications/notifications.css';

export default function Notifications({ theme, selectedAction = '', notifications = [], onMarkAllRead, onOpenNotification }) {
  const unread = notifications.filter((item) => item.unread).length;
  const styles = useMemo(() => createStyles(theme), [theme]);
  const visibleNotifications = notifications.filter((item) => {
    if (selectedAction === 'Open unread first') return item.unread;
    if (selectedAction === 'Check payment reminders') return item.category === 'payment' || /payment/i.test(`${item.title} ${item.body}`);
    if (selectedAction === 'Review document updates') return item.category === 'document' || /document|ID|photo/i.test(`${item.title} ${item.body}`);
    return true;
  });

  return (
    <ScrollView style={styles.container}>
      <View style={styles.heroCard}>
        <Text style={styles.heroTitle}>{selectedAction || 'Agent Inbox'}</Text>
        <Text style={styles.heroSubtitle}>{selectedAction ? 'Only alerts for the selected sub-tab are shown here.' : 'All recent alerts, payment confirmations, and document requests in one place.'}</Text>
        {(!selectedAction || selectedAction === 'Clear handled alerts') && <TouchableOpacity style={styles.primaryButton} onPress={onMarkAllRead}>
          <Text style={styles.buttonText}>Mark all read</Text>
        </TouchableOpacity>}
      </View>

      {visibleNotifications.map((notification) => (
        <TouchableOpacity key={notification.id} style={[styles.notificationCard, notification.unread && styles.notificationUnread]} onPress={() => onOpenNotification(notification.id)}>
          <View style={styles.notificationHeader}>
            <Text style={styles.notificationTitle}>{notification.title}</Text>
            {notification.unread && <Text style={styles.unreadBadge}>Unread</Text>}
          </View>
          <Text style={styles.notificationBody}>{notification.body}</Text>
        </TouchableOpacity>
      ))}

      {!visibleNotifications.length && <Text style={styles.emptyText}>No notifications available for this selection.</Text>}
    </ScrollView>
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
    heroCard: {
      backgroundColor: dark ? '#092a75' : '#f5f8ff',
      borderRadius: 18,
      padding: 20,
      marginHorizontal: 16,
      marginBottom: 16,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.08,
      shadowRadius: 18,
      elevation: 4,
    },
    heroTitle: {
      fontSize: 22,
      fontWeight: '800',
      color: dark ? '#f3f6fb' : '#0b1730',
      marginBottom: 8,
      fontFamily: 'Georgia',
    },
    heroSubtitle: {
      fontSize: 13,
      color: dark ? '#b8c3d7' : '#627083',
      lineHeight: 20,
      marginBottom: 16,
      fontFamily: 'Georgia',
    },
    primaryButton: {
      backgroundColor: '#0f5fff',
      borderRadius: 14,
      alignItems: 'center',
      paddingVertical: 14,
    },
    buttonText: {
      color: '#ffffff',
      fontSize: 14,
      fontFamily: 'Georgia',
      fontWeight: '700',
    },
    notificationCard: {
      backgroundColor: dark ? '#092a75' : '#f5f8ff',
      borderRadius: 18,
      padding: 18,
      marginHorizontal: 16,
      marginBottom: 14,
      borderWidth: 1,
      borderColor: dark ? '#11264b' : '#e6eef3',
    },
    notificationUnread: {
      borderColor: '#0f5fff',
      shadowColor: '#0f5fff',
      shadowOffset: { width: 0, height: 6 },
      shadowOpacity: 0.08,
      shadowRadius: 14,
      elevation: 3,
    },
    notificationHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: 8,
    },
    notificationTitle: {
      fontSize: 15,
      fontWeight: '700',
      color: dark ? '#f3f6fb' : '#0b1730',
      fontFamily: 'Georgia',
    },
    unreadBadge: {
      fontSize: 11,
      fontWeight: '800',
      color: '#ffffff',
      backgroundColor: '#2f7cff',
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 999,
      fontFamily: 'Georgia',
    },
    notificationBody: {
      fontSize: 13,
      color: dark ? '#b8c3d7' : '#627083',
      lineHeight: 20,
      fontFamily: 'Georgia',
    },
    emptyText: {
      marginTop: 24,
      textAlign: 'center',
      color: dark ? '#aebbd0' : '#627083',
      fontFamily: 'Georgia',
    },
  });
};
