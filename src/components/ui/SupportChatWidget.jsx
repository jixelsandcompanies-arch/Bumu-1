import React, { useMemo, useState } from 'react';
import { Bot, MessageCircle, Send, X, RotateCcw } from 'lucide-react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Text } from './Text.jsx';
import { colors } from '../../theme/colors.js';

const starterMessage = {
  id: 'welcome',
  from: 'assistant',
  text: 'Hi, I can help with login, registration, OTP, payments, school scanning, and account approval.'
};

function simpleReply(input) {
  const text = String(input || '').toLowerCase();

  if (text.includes('otp') || text.includes('code')) {
    return 'Enter your phone or email, tap send OTP, then check your messages. If it does not arrive, wait a minute and try resend.';
  }

  if (text.includes('login') || text.includes('password') || text.includes('sign in')) {
    return 'Use the same email and password you registered with. If your account is not approved yet, wait for the activation message before signing in.';
  }

  if (text.includes('register') || text.includes('account')) {
    return 'Fill in the required details, submit the form, then wait for approval. You will receive a message after the account is activated.';
  }

  if (text.includes('payment') || text.includes('mpesa') || text.includes('m-pesa') || text.includes('pay')) {
    return 'Open payments, enter the amount, and submit the request. After payment is confirmed, your balance and history will update.';
  }

  if (text.includes('agent')) {
    return 'Agents can register customers, follow tasks, view assigned products, and track customer progress after approval.';
  }

  if (text.includes('school') || text.includes('scan') || text.includes('qr') || text.includes('student')) {
    return 'Open the school scan page, tap the camera scanner, scan the student card QR, choose coming in or going out, then save the scan.';
  }

  if (text.includes('admin') || text.includes('approve') || text.includes('approval')) {
    return 'Admin reviews pending accounts and applications. Once approved, the user receives an activation message and can continue.';
  }

  return 'Tell me what you want to do, for example: login, register, send OTP, make payment, scan student card, or check approval.';
}

export function SupportChatWidget() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState([starterMessage]);
  const unread = useMemo(() => (!open ? 1 : 0), [open]);

  function startNewChat() {
    setDraft('');
    setMessages([{ ...starterMessage, id: `welcome-${Date.now()}` }]);
  }

  function sendMessage() {
    const text = draft.trim();
    if (!text) return;

    const now = Date.now();
    setMessages((current) => [
      ...current,
      { id: `user-${now}`, from: 'user', text },
      { id: `assistant-${now}`, from: 'assistant', text: simpleReply(text) }
    ]);
    setDraft('');
  }

  if (!open) {
    return (
      <Pressable
        onPress={() => setOpen(true)}
        style={styles.fab}
        accessibilityRole="button"
        accessibilityLabel="Open help chat"
      >
        <MessageCircle size={22} color="#ffffff" />
        {unread ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{unread}</Text>
          </View>
        ) : null}
      </Pressable>
    );
  }

  return (
    <View style={styles.panel}>
      <View style={styles.header}>
        <View style={styles.titleRow}>
          <View style={styles.avatar}>
            <Bot size={18} color="#ffffff" />
          </View>
          <View>
            <Text style={styles.title}>Help chat</Text>
            <Text style={styles.subtitle}>Simple answers for using Bumu Paygo</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={startNewChat} style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Start new chat">
            <RotateCcw size={17} color={colors.primary} />
          </Pressable>
          <Pressable onPress={() => setOpen(false)} style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Close help chat">
            <X size={18} color={colors.primary} />
          </Pressable>
        </View>
      </View>

      <View style={styles.messages}>
        {messages.map((message) => (
          <View
            key={message.id}
            style={[
              styles.bubble,
              message.from === 'user' ? styles.userBubble : styles.assistantBubble
            ]}
          >
            <Text style={message.from === 'user' ? styles.userText : styles.assistantText}>{message.text}</Text>
          </View>
        ))}
      </View>

      <View style={styles.quickRow}>
        {['OTP', 'Register', 'Payment', 'School scan'].map((item) => (
          <Pressable key={item} onPress={() => setDraft(item)} style={styles.quickButton}>
            <Text style={styles.quickText}>{item}</Text>
          </Pressable>
        ))}
      </View>

      <View style={styles.inputRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={sendMessage}
          placeholder="Ask for help..."
          placeholderTextColor="#8ba0b8"
          style={styles.input}
        />
        <Pressable onPress={sendMessage} style={styles.sendButton} accessibilityRole="button" accessibilityLabel="Send message">
          <Send size={17} color="#ffffff" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  fab: {
    position: 'fixed',
    right: 18,
    bottom: 18,
    width: 54,
    height: 54,
    borderRadius: 999,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    boxShadow: '0 16px 42px rgba(7, 87, 200, 0.28)',
    zIndex: 1000
  },
  badge: {
    position: 'absolute',
    right: -2,
    top: -2,
    width: 20,
    height: 20,
    borderRadius: 999,
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#ffffff'
  },
  badgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700'
  },
  panel: {
    position: 'fixed',
    right: 18,
    bottom: 18,
    width: 'min(370px, calc(100vw - 28px))',
    maxHeight: 'min(620px, calc(100vh - 28px))',
    borderWidth: 1,
    borderColor: '#cfe0fb',
    borderRadius: 12,
    backgroundColor: '#ffffff',
    overflow: 'hidden',
    boxShadow: '0 24px 70px rgba(15, 23, 42, 0.24)',
    zIndex: 1000
  },
  header: {
    minHeight: 64,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e5edf7',
    backgroundColor: '#f8fbff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 10
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    minWidth: 0,
    flex: 1
  },
  avatar: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center'
  },
  title: {
    color: colors.text,
    fontSize: 15,
    fontWeight: '700'
  },
  subtitle: {
    color: colors.muted,
    fontSize: 12
  },
  headerActions: {
    flexDirection: 'row',
    gap: 6
  },
  iconButton: {
    width: 34,
    height: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cfe0fb',
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer'
  },
  messages: {
    padding: 12,
    gap: 9,
    maxHeight: 330,
    overflowY: 'auto',
    backgroundColor: '#ffffff'
  },
  bubble: {
    maxWidth: '88%',
    borderRadius: 10,
    paddingHorizontal: 11,
    paddingVertical: 9
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: '#eef6ff',
    borderWidth: 1,
    borderColor: '#d5e6ff'
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: colors.primary
  },
  assistantText: {
    color: colors.slate,
    lineHeight: 20,
    fontSize: 14
  },
  userText: {
    color: '#ffffff',
    lineHeight: 20,
    fontSize: 14
  },
  quickRow: {
    borderTopWidth: 1,
    borderTopColor: '#eef2f7',
    paddingHorizontal: 12,
    paddingTop: 10,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 7
  },
  quickButton: {
    minHeight: 30,
    borderWidth: 1,
    borderColor: '#cfe0fb',
    borderRadius: 999,
    paddingHorizontal: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    cursor: 'pointer'
  },
  quickText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600'
  },
  inputRow: {
    padding: 12,
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center'
  },
  input: {
    flex: 1,
    minHeight: 42,
    borderWidth: 1,
    borderColor: '#cfddec',
    borderRadius: 8,
    paddingHorizontal: 11,
    color: colors.text,
    backgroundColor: '#ffffff',
    outlineStyle: 'none',
    fontSize: 14
  },
  sendButton: {
    width: 42,
    height: 42,
    borderRadius: 8,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer'
  }
});
