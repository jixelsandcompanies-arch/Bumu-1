import React, { useMemo, useState } from 'react';
import { Bot, CheckCircle2, Headphones, Mail, MessageCircle, Send, Sparkles, X, Trash2 } from 'lucide-react';
import { Pressable, StyleSheet, TextInput, View } from 'react-native';
import { Text } from './Text.jsx';
import { colors } from '../../theme/colors.js';

const starterMessage = {
  id: 'welcome',
  from: 'assistant',
  text: 'Hi, you are speaking with Bumu Assist. I can help with PAYGO products, customer onboarding, portals, OTPs, M-PESA payments, commissions, reports, or support.'
};

const supportPhone = String(import.meta.env.VITE_SUPPORT_WHATSAPP_NUMBER || '').replace(/\D/g, '');
const supportEmail = String(import.meta.env.VITE_SUPPORT_EMAIL || 'support@bumupay.com').trim();

function hasAny(text, words) {
  return words.some((word) => text.includes(word));
}

function simpleReply(input) {
  const text = String(input || '').toLowerCase();

  if (hasAny(text, ['what is bumu', 'about bumu', 'about', 'bumu paygo', 'who are you', 'what do you do'])) {
    return 'Bumu Paygo helps customers access useful products through lipa mdogo mdogo plans. Customers can start with an approved deposit, use the product, and repay in manageable instalments while agents, finance, and admin teams track the account.';
  }

  if (hasAny(text, ['product', 'products', 'bike', 'motorbike', 'boda', 'phone', 'cooker', 'solar', 'lamp', 'asset'])) {
    return 'Bumu can support PAYGO products such as motorbikes, phones, cookers, solar lamps, and other approved assets. Each product is connected to a customer account, payment plan, balance, agent, and repayment history.';
  }

  if (hasAny(text, ['how it works', 'process', 'workflow', 'paygo', 'lipa mdogo mdogo', 'installment', 'instalment'])) {
    return 'The Bumu flow is: choose a product, submit customer details, verify next-of-kin, approve the account, collect the deposit by M-PESA, activate the customer, then track daily or agreed repayments until the balance is cleared.';
  }

  if (hasAny(text, ['portal', 'portals', 'workspace', 'app'])) {
    return 'Bumu has separate portals for each role: Customer for balances and payments, Agent for registration and follow-up, Finance for collections and reconciliation, Admin for users and oversight, and Back Office for screening.';
  }

  if (hasAny(text, ['otp', 'code', 'sms', 'africa', 'africastalking', 'africa\'s talking'])) {
    return 'Bumu uses Africa\'s Talking for SMS messages and OTPs. OTPs are used for password help, activation, approvals, and next-of-kin flows. Use the correct phone number, wait for the SMS, and resend only after a short delay.';
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
    return 'Bumu uses Safaricom Daraja for money movement. STK Push sends a prompt to the customer phone, Paybill C2B records direct customer payments, and B2C can send approved commission payouts. Confirmed payments update balance, history, reconciliation, and alerts.';
  }

  if (hasAny(text, ['agent', 'dealer', 'field'])) {
    return 'Agents can register customers, send deposit prompts, verify next-of-kin OTPs when needed, follow assigned tasks, view customer progress, and track commission status.';
  }

  if (hasAny(text, ['customer', 'balance', 'history', 'portal'])) {
    return 'Customers use the customer portal to view product details, balance, payment history, alerts, and to request an M-PESA payment prompt using their registered phone.';
  }

  if (hasAny(text, ['commission', 'payout', 'earn'])) {
    return 'Commissions are created from qualifying payments and product activation. Finance reviews earned commissions, approves payouts, and the backend sends B2C payouts where Daraja B2C is configured.';
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
    return 'For support, share the portal you are using, your phone or email, the customer name if relevant, and the exact action that failed: OTP, M-PESA prompt, Paybill confirmation, approval, payout, report, or login.';
  }

  if (hasAny(text, ['location', 'where', 'nairobi', 'kenya'])) {
    return 'Bumu is built for Kenyan PAYGO operations, with Nairobi as the base and support for dealer and agent networks as coverage grows.';
  }

  return 'Ask me about what Bumu does, PAYGO products, customer registration, OTP/SMS, M-PESA STK or Paybill payments, commissions, approvals, reports, or which portal to use.';
}

function transcriptFromMessages(messages) {
  return messages
    .filter((message) => message.from !== 'system')
    .map((message) => `${message.from === 'user' ? 'User' : 'Bumu Assist'}: ${message.text}`)
    .join('\n');
}

function liveAgentMessage(messages, draft = '') {
  const details = draft ? `\n\nCurrent message:\n${draft}` : '';
  return [
    'Hello Bumu support, I need help from a live agent.',
    details,
    '\nChat transcript:',
    transcriptFromMessages(messages)
  ].join('\n').trim();
}

export function SupportChatWidget() {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [messages, setMessages] = useState([starterMessage]);
  const [handoffMode, setHandoffMode] = useState(false);
  const unread = useMemo(() => (!open ? 1 : 0), [open]);

  function startNewChat() {
    setDraft('');
    setHandoffMode(false);
    setMessages([{ ...starterMessage, id: `welcome-${Date.now()}` }]);
  }

  function closeChat() {
    startNewChat();
    setOpen(false);
  }

  function addMessage(text) {
    if (!text) return;

    const now = Date.now();
    if (handoffMode) {
      setMessages((current) => [
        ...current,
        { id: `user-${now}`, from: 'user', text },
        {
          id: `assistant-${now}`,
          from: 'assistant',
          text: 'I have prepared this for a live support agent. Use WhatsApp or email below to continue with a person.'
        }
      ]);
      setDraft('');
      return;
    }

    setMessages((current) => [
      ...current,
      { id: `user-${now}`, from: 'user', text },
      { id: `assistant-${now}`, from: 'assistant', text: simpleReply(text) }
    ]);
    setDraft('');
  }

  function sendMessage() {
    addMessage(draft.trim());
  }

  function requestLiveAgent() {
    const now = Date.now();
    setHandoffMode(true);
    setMessages((current) => [
      ...current,
      {
        id: `system-${now}`,
        from: 'system',
        text: 'Live support handoff started'
      },
      {
        id: `handoff-${now}`,
        from: 'assistant',
        text: 'A Bumu support agent can help with account access, OTP delivery, M-PESA, approvals, or payment issues. Add your phone/email and a short issue summary, then continue through WhatsApp or email.'
      }
    ]);
  }

  function openWhatsappHandoff() {
    const text = encodeURIComponent(liveAgentMessage(messages, draft.trim()));
    if (!supportPhone) return;
    window.open(`https://wa.me/${supportPhone}?text=${text}`, '_blank', 'noopener,noreferrer');
  }

  function openEmailHandoff() {
    const subject = encodeURIComponent('Bumu Paygo support request');
    const body = encodeURIComponent(liveAgentMessage(messages, draft.trim()));
    window.open(`mailto:${supportEmail}?subject=${subject}&body=${body}`, '_blank', 'noopener,noreferrer');
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
            {handoffMode ? <Headphones size={18} color="#ffffff" /> : <Bot size={18} color="#ffffff" />}
          </View>
          <View>
            <Text style={styles.title}>{handoffMode ? 'Bumu support desk' : 'Bumu Assist'}</Text>
            <View style={styles.statusLine}>
              <View style={styles.onlineDot} />
              <Text style={styles.subtitle}>{handoffMode ? 'Live agent handoff ready' : 'AI agent active'}</Text>
            </View>
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
          message.from === 'system' ? (
            <View key={message.id} style={styles.systemEvent}>
              <CheckCircle2 size={13} color="#22a06b" />
              <Text style={styles.systemEventText}>{message.text}</Text>
            </View>
          ) : (
            <View key={message.id} style={message.from === 'user' ? styles.userMessageWrap : styles.assistantMessageWrap}>
              {message.from === 'assistant' ? (
                <View style={styles.messageMeta}>
                  <Sparkles size={12} color={colors.primary} />
                  <Text style={styles.messageMetaText}>{handoffMode ? 'Support desk' : 'Bumu Assist'}</Text>
                </View>
              ) : null}
              <View
                style={[
                  styles.bubble,
                  message.from === 'user' ? styles.userBubble : styles.assistantBubble
                ]}
              >
                <Text style={message.from === 'user' ? styles.userText : styles.assistantText}>{message.text}</Text>
              </View>
            </View>
          )
        ))}
      </View>

      <View style={styles.quickRow}>
        {['What is Bumu?', 'Products', 'PAYGO flow', 'M-PESA', 'OTP/SMS', 'Portals'].map((item) => (
          <Pressable key={item} onPress={() => addMessage(item)} style={styles.quickButton}>
            <Text style={styles.quickText}>{item}</Text>
          </Pressable>
        ))}
        <Pressable onPress={requestLiveAgent} style={[styles.quickButton, styles.liveButton]}>
          <Headphones size={14} color="#ffffff" />
          <Text style={styles.liveText}>Live agent</Text>
        </Pressable>
      </View>

      {handoffMode ? (
        <View style={styles.handoffRow}>
          {supportPhone ? (
            <Pressable onPress={openWhatsappHandoff} style={styles.handoffButton}>
              <MessageCircle size={16} color="#ffffff" />
              <Text style={styles.handoffText}>WhatsApp</Text>
            </Pressable>
          ) : null}
          <Pressable onPress={openEmailHandoff} style={[styles.handoffButton, styles.emailButton]}>
            <Mail size={16} color={colors.primary} />
            <Text style={styles.emailText}>Email agent</Text>
          </Pressable>
        </View>
      ) : null}

      <View style={styles.inputRow}>
        <TextInput
          value={draft}
          onChangeText={setDraft}
          onSubmitEditing={sendMessage}
          placeholder={handoffMode ? 'Add phone/email and issue summary...' : 'Ask for help...'}
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
  statusLine: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6
  },
  onlineDot: {
    width: 8,
    height: 8,
    borderRadius: 999,
    backgroundColor: '#22a06b',
    boxShadow: '0 0 0 3px rgba(34, 160, 107, 0.12)'
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
  assistantMessageWrap: {
    alignSelf: 'stretch',
    gap: 4
  },
  userMessageWrap: {
    alignSelf: 'stretch',
    alignItems: 'flex-end'
  },
  messageMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginLeft: 2
  },
  messageMetaText: {
    color: colors.primary,
    fontSize: 11,
    fontWeight: '700'
  },
  systemEvent: {
    alignSelf: 'center',
    minHeight: 24,
    borderRadius: 999,
    backgroundColor: '#edf9f2',
    borderWidth: 1,
    borderColor: '#ccefdc',
    paddingHorizontal: 9,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5
  },
  systemEventText: {
    color: '#166534',
    fontSize: 11,
    fontWeight: '700'
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
  liveButton: {
    flexDirection: 'row',
    gap: 5,
    backgroundColor: colors.primary,
    borderColor: colors.primary
  },
  liveText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '700'
  },
  handoffRow: {
    borderTopWidth: 1,
    borderTopColor: '#eef2f7',
    paddingHorizontal: 12,
    paddingTop: 10,
    flexDirection: 'row',
    gap: 8
  },
  handoffButton: {
    minHeight: 38,
    flex: 1,
    borderRadius: 8,
    backgroundColor: '#22a06b',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 7,
    cursor: 'pointer'
  },
  handoffText: {
    color: '#ffffff',
    fontSize: 13,
    fontWeight: '700'
  },
  emailButton: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#cfe0fb'
  },
  emailText: {
    color: colors.primary,
    fontSize: 13,
    fontWeight: '700'
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
