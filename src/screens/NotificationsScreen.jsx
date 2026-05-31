import React, { useState } from 'react';
import { CheckCheck } from 'lucide-react';
import { View } from 'react-native';
import { NotificationActivityItem } from '../components/notifications/NotificationActivityItem.jsx';
import { NotificationsEmptyState } from '../components/notifications/NotificationsEmptyState.jsx';
import {
  groupNotifications,
  shouldShowNotification
} from '../components/notifications/notificationMeta.js';
import { notificationStyles as styles } from '../components/notifications/notificationStyles.js';
import { Button } from '../components/ui/Button.jsx';
import { Section } from '../components/ui/Section.jsx';
import { Text } from '../components/ui/Text.jsx';
import { Header } from './PaymentsScreen.jsx';

export function NotificationsScreen({ notifications, onNotificationsChange }) {
  const [openId, setOpenId] = useState(null);
  const visibleNotifications = notifications.filter(shouldShowNotification);
  const unreadCount = notifications.filter((item) => !item.isRead).length;
  const groups = groupNotifications(visibleNotifications);

  const markAllRead = () => {
    onNotificationsChange((items) => items.map((item) => ({ ...item, isRead: true })));
  };

  const deleteAllMessages = () => {
    onNotificationsChange([]);
    setOpenId(null);
  };

  const toggleNotification = (id) => {
    setOpenId((current) => (current === id ? null : id));
    onNotificationsChange((items) =>
      items.map((item) => (item.id === id ? { ...item, isRead: true } : item))
    );
  };

  const toggleRead = (id) => {
    onNotificationsChange((items) =>
      items.map((item) => (item.id === id ? { ...item, isRead: !item.isRead } : item))
    );
  };

  const dismissNotification = (id) => {
    onNotificationsChange((items) => items.filter((item) => item.id !== id));
    setOpenId((current) => (current === id ? null : current));
  };

  return (
    <View style={styles.page}>
      <View style={styles.activityShell}>
        <Header
          eyebrow="Alert activity"
          title="Alerts"
          action={
            <View style={styles.headerActions}>
              <Button icon={CheckCheck} variant="secondary" onPress={markAllRead}>Mark all read</Button>
              <Button variant="secondary" onPress={deleteAllMessages} style={styles.deleteAllButton}>
                Delete all messages
              </Button>
            </View>
          }
        />

        <Section
          title="Notification history"
          action={
            unreadCount > 0 ? (
              <View style={styles.unreadBadge}>
                <Text style={styles.unreadBadgeText}>{unreadCount} new</Text>
              </View>
            ) : null
          }
        >
          {visibleNotifications.length === 0 ? (
            <NotificationsEmptyState />
          ) : (
            groups.map((group) => (
              <View key={group.label} style={styles.activityGroup}>
                <Text style={styles.groupTitle}>{group.label}</Text>
                {group.items.map((notification) => (
                  <NotificationActivityItem
                    key={notification.id}
                    notification={notification}
                    isOpen={openId === notification.id}
                    onToggle={() => toggleNotification(notification.id)}
                    onClose={() => setOpenId(null)}
                    onToggleRead={() => toggleRead(notification.id)}
                    onDismiss={() => dismissNotification(notification.id)}
                  />
                ))}
              </View>
            ))
          )}
        </Section>
      </View>
    </View>
  );
}
