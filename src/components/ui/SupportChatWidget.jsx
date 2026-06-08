import React, { useMemo, useState } from 'react';
import { Bot, MessageCircle, Send, X, Trash2 } from 'lucide-react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Text } from './Text.jsx';
import { colors } from '../../theme/colors.js';

const starterMessage = {
  id: 'welcome',
  from: 'assistant',
  text: 'Hi, I can help with Bumu Paygo portals, OTPs, M-PESA payments, customer registration, commissions, reports, and approvals.'
};

function hasAny(text, words) {
  return words.some((word) => text.includes(word));
}

function simpleReply(input) {
  const text = String(input || '').toLowerCase();

  if (hasAny(text, ['otp', 'code', 'sms', 'africa', 'africastalking', 'africa\'s talking'])) {
    return 'Bumu uses Africa\'s Talking for SMS messages and OTPs. Enter the correct phone number, request the OTP, then wait a minute before resending. Customer activation OTPs are sent after approval.';
  }

  if (hasAny(text, ['login', 'password', 'sign in', 'signin', 'reset'])) {
    return 'Use the email and password for your portal. Finance, admin, agent, and customer accounts are separate. If you forgot your password, request an OTP and use the latest code before it expires.';
  }

  if (hasAny(text, ['register customer', 'customer registration', 'new customer', 'application'])) {
    return 'Agents register customers with KYC, product details, next-of-kin, deposit amount, and customer phone. The system sends next-of-kin SMS, creates a deposit M-PESA prompt, and sends activation OTP after approval.';
  }

  if (hasAny(text, ['register', 'account', 'approval', 'approve'])) {
    return 'Create the account in the correct portal, then wait for admin or back-office approval where required. Approved users receive the right SMS or activation flow before they can continue.';
  }

  if (hasAny(text, ['payment', 'mpesa', 'm-pesa', 'daraja', 'stk', 'paybill', 'c2b', 'b2c', 'pay'])) {
    return 'Bumu uses Safaricom Daraja for money movement. Customer payment requests send an M-PESA STK prompt, Paybill C2B confirmations update balances, and B2C can pay approved commissions.';
  }

  if (hasAny(text, ['agent', 'dealer', 'field'])) {
    return 'Agents can register customers, send deposit prompts, verify next-of-kin OTPs when needed, follow assigned tasks, view customer progress, and track commission status.';
  }

  if (hasAny(text, ['customer', 'balance', 'history', 'portal'])) {
    return 'Customers use the customer portal to view product details, balance, payment history, alerts, and to request an M-PESA payment prompt using their registered phone.';
  }

  if (hasAny(text, ['commission', 'payout', 'earn'])) {
    return 'Commissions are created from qualifying payments and product activation. Finance reviews commissions and sends approved payouts through the backend, not from the browser.';
  }

  if (hasAny(text, ['finance', 'reconciliation', 'report', 'collection'])) {
    return 'Finance reviews payments, reconciliation, commissions, reports, customers, and alerts. Daraja receipts and Paybill confirmations are matched to customer records.';
  }

  if (hasAny(text, ['admin', 'back office', 'screening', 'kyc'])) {
    return 'Admin and back office teams review applications, users, KYC checks, product assignment, OTP status, and approval decisions before customers fully activate.';
  }

  if (hasAny(text, ['next of kin', 'kin', 'guarantor'])) {
    return 'Next-of-kin receives an SMS acceptance link or OTP. Once accepted, the application can continue through screening and customer activation.';
  }

  if (hasAny(text, ['school', 'scan', 'qr', 'student'])) {
    return 'Open the school scan page, tap the camera scanner, scan the student card QR, choose coming in or going out, then save the scan.';
  }

  if (hasAny(text, ['support', 'contact', 'help'])) {
    return 'Tell support the portal you are using, your phone or email, the customer name if relevant, and the exact action that failed: OTP, M-PESA prompt, approval, payout, or login.';
  }

  return 'Tell me what you want to do, for example: request OTP, register customer, send M-PESA prompt, check Paybill payment, approve application, review commission, or fix login.';
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

  function closeChat() {
    startNewChat();
    setOpen(false);
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
            <Text style={styles.title}>Bumu help agent</Text>
            <Text style={styles.subtitle}>Portals, OTPs, payments, and approvals</Text>
          </View>
        </View>
        <View style={styles.headerActions}>
          <Pressable onPress={startNewChat} style={styles.clearButton} accessibilityRole="button" accessibilityLabel="Clear help chat">
            <Trash2 size={15} color={colors.primary} />
            <Text style={styles.clearText}>Clear</Text>
          </Pressable>
          <Pressable onPress={closeChat} style={styles.iconButton} accessibilityRole="button" accessibilityLabel="Close help chat">
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
        {['OTP/SMS', 'M-PESA', 'Register customer', 'Commission'].map((item) => (
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
  clearButton: {
    minHeight: 34,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cfe0fb',
    backgroundColor: '#ffffff',
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    cursor: 'pointer'
  },
  clearText: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '700'
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
