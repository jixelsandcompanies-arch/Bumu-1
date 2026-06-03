import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  CreditCard,
  History,
  Home,
  LogIn,
  LogOut,
  RefreshCw,
  Smartphone,
  UserRound
} from 'lucide-react';
import { Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Button } from '../components/ui/Button.jsx';
import { Text } from '../components/ui/Text.jsx';
import { customerPortalService } from '../services/customerPortalService.js';
import { colors } from '../theme/colors.js';
import bumuLogo from '../../BumuLogo.jpeg';

const tabs = [
  ['dashboard', 'Dashboard', Home],
  ['pay', 'Pay', CreditCard],
  ['history', 'History', History],
  ['alerts', 'Alerts', Bell],
  ['profile', 'Profile', UserRound]
];

const emptyPortal = {
  customer: null,
  product: {},
  summary: { totalPaid: 0, balance: 0, progress: 0, overdueDays: 0, pendingRequests: 0 },
  payments: [],
  notifications: [],
  paymentRequests: []
};

function formatKes(value) {
  return `KES ${Number(value || 0).toLocaleString('en-KE')}`;
}

function fallback(value, text = 'Not set') {
  return value || text;
}

export function CustomerPortalScreen() {
  const [authenticated, setAuthenticated] = useState(() => customerPortalService.hasSession());
  const [loading, setLoading] = useState(customerPortalService.hasSession());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [portal, setPortal] = useState(emptyPortal);
  const [message, setMessage] = useState('');

  async function loadPortal() {
    setLoading(true);
    setMessage('');
    try {
      const data = await customerPortalService.loadPortal();
      setPortal({ ...emptyPortal, ...data });
      setAuthenticated(true);
    } catch (error) {
      setMessage(error.message);
      customerPortalService.logout();
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authenticated) {
      loadPortal();
    }
  }, []);

  function goHome() {
    window.history.pushState(null, '', '#/');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }

  function handleLogout() {
    customerPortalService.logout();
    setAuthenticated(false);
    setPortal(emptyPortal);
    setActiveTab('dashboard');
  }

  if (!authenticated) {
    return (
      <CustomerAuthScreen
        message={message}
        onBack={goHome}
        onAuthenticated={() => {
          setAuthenticated(true);
          loadPortal();
        }}
      />
    );
  }

  if (loading) {
    return (
      <SystemFrame>
        <Text style={styles.stateTitle}>Loading customer portal</Text>
        <Text style={styles.stateText}>Reading your account from the shared Bumu Paygo database.</Text>
      </SystemFrame>
    );
  }

  const props = {
    portal,
    onRefresh: loadPortal,
    onNavigate: setActiveTab
  };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.rootContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
      <View style={styles.workspace}>
        <View style={styles.sidebar}>
          <Pressable onPress={goHome} style={styles.backButton}>
            <ArrowLeft size={16} color={colors.primary} />
            <Text style={styles.backText}>Website</Text>
          </Pressable>
          <View style={styles.customerBrand}>
            <Image source={bumuLogo} style={styles.brandLogo} />
            <View style={{ minWidth: 0 }}>
              <Text style={styles.brandTitle}>Bumu Paygo</Text>
              <Text style={styles.brandSubtitle}>Customer portal</Text>
            </View>
          </View>
          <View style={styles.navList}>
            {tabs.map(([key, label, Icon]) => (
              <Pressable
                key={key}
                onPress={() => setActiveTab(key)}
                style={[styles.navItem, activeTab === key && styles.navItemActive]}
              >
                <Icon size={17} color={activeTab === key ? colors.primary : colors.muted} />
                <Text style={[styles.navText, activeTab === key && styles.navTextActive]}>{label}</Text>
              </Pressable>
            ))}
          </View>
          <Button icon={LogOut} variant="secondary" onPress={handleLogout} style={styles.logoutButton}>Sign out</Button>
        </View>

        <View style={styles.main}>
          <View style={styles.pageHeader}>
            <View style={{ minWidth: 0 }}>
              <Text style={styles.kicker}>Customer workspace</Text>
              <Text style={styles.pageTitle}>{fallback(portal.customer?.name, 'Customer account')}</Text>
              <Text style={styles.pageSubtitle}>Payments, balance, product details, and alerts from the centralized CRM.</Text>
            </View>
            <Button icon={RefreshCw} variant="secondary" onPress={loadPortal}>Refresh</Button>
          </View>

          {activeTab === 'dashboard' && <DashboardTab {...props} />}
          {activeTab === 'pay' && <PaymentTab {...props} />}
          {activeTab === 'history' && <HistoryTab {...props} />}
          {activeTab === 'alerts' && <AlertsTab {...props} />}
          {activeTab === 'profile' && <ProfileTab {...props} />}
        </View>
      </View>
    </ScrollView>
  );
}

function CustomerAuthScreen({ onAuthenticated, onBack, message }) {
  const [mode, setMode] = useState('login');
  const [fullName, setFullName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [notice, setNotice] = useState(message || '');
  const [submitting, setSubmitting] = useState(false);

  async function login() {
    setNotice('');
    if (!email.trim() || !password) {
      setNotice('Enter your customer email and password.');
      return;
    }

    setSubmitting(true);
    try {
      await customerPortalService.login({ email: email.trim(), password });
      onAuthenticated();
    } catch (error) {
      setNotice(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function register() {
    setNotice('');
    if (!fullName.trim() || !email.trim() || !phone.trim() || !password) {
      setNotice('Enter your name, email, phone number, and password.');
      return;
    }

    setSubmitting(true);
    try {
      await customerPortalService.register({
        fullName: fullName.trim(),
        nationalId: nationalId.trim(),
        phone: phone.trim(),
        email: email.trim(),
        password
      });
      setNotice('Customer account created. Sign in with the same email and password.');
      setMode('login');
      setPassword('');
    } catch (error) {
      setNotice(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function requestReset() {
    setNotice('');
    if (!email.trim() || !phone.trim()) {
      setNotice('Enter your email and phone number.');
      return;
    }

    setSubmitting(true);
    try {
      await customerPortalService.requestPasswordReset({ email: email.trim(), phone: phone.trim() });
      setNotice('Password reset request sent. Admin will continue the OTP process from the backend.');
    } catch (error) {
      setNotice(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <ScrollView style={styles.authRoot} contentContainerStyle={styles.authContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
      <View style={styles.authCard}>
        <Pressable onPress={onBack} style={styles.backButton}>
          <ArrowLeft size={16} color={colors.primary} />
          <Text style={styles.backText}>Back to site</Text>
        </Pressable>
        <View style={styles.customerBrand}>
          <Image source={bumuLogo} style={styles.authLogo} />
          <View>
            <Text style={styles.authBrand}>Bumu Paygo</Text>
            <Text style={styles.brandSubtitle}>Customer account access</Text>
          </View>
        </View>
        <View style={styles.authHeading}>
          <Text style={styles.authTitle}>
            {mode === 'login' ? 'Customer sign in' : mode === 'register' ? 'Create customer account' : 'Password help'}
          </Text>
          <Text style={styles.authText}>
            {mode === 'login'
              ? 'Use the email linked to your customer record.'
              : mode === 'register'
                ? 'Create your customer account. Admin or an agent can attach product details after registration.'
                : 'Submit your email and phone. The backend/admin flow handles OTP and password changes.'}
          </Text>
        </View>

        <View style={styles.form}>
          {mode === 'register' && (
            <>
              <Field label="Full name" value={fullName} onChangeText={setFullName} placeholder="Your full name" />
              <Field label="National ID" value={nationalId} onChangeText={setNationalId} placeholder="National ID number" />
              <Field label="Phone number" value={phone} onChangeText={setPhone} placeholder="Phone number" />
            </>
          )}
          <Field label="Personal email" value={email} onChangeText={setEmail} placeholder="Enter your email" />
          {mode === 'login' ? (
            <Field label="Password" value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry />
          ) : mode === 'reset' ? (
            <Field label="Phone number" value={phone} onChangeText={setPhone} placeholder="Enter phone number" />
          ) : (
            <Field label="Password" value={password} onChangeText={setPassword} placeholder="At least 10 characters" secureTextEntry />
          )}
          {notice ? <Text style={styles.greenText}>{notice}</Text> : null}
          {mode === 'login' ? (
            <Button icon={LogIn} onPress={login} disabled={submitting} style={styles.fullButton}>
              {submitting ? 'Signing in...' : 'Sign in'}
            </Button>
          ) : mode === 'reset' ? (
            <Button icon={Bell} onPress={requestReset} disabled={submitting} style={styles.fullButton}>
              {submitting ? 'Sending...' : 'Request reset'}
            </Button>
          ) : (
            <Button icon={UserRound} onPress={register} disabled={submitting} style={styles.fullButton}>
              {submitting ? 'Creating...' : 'Create account'}
            </Button>
          )}
          {mode === 'login' ? (
            <View style={styles.authLinksRow}>
              <Pressable onPress={() => setMode('register')} style={styles.inlineLink}>
                <Text style={styles.linkText}>Create account</Text>
              </Pressable>
              <Pressable onPress={() => setMode('reset')} style={styles.inlineLink}>
                <Text style={styles.linkText}>Forgot password?</Text>
              </Pressable>
            </View>
          ) : (
            <Pressable onPress={() => setMode('login')} style={styles.inlineLink}>
              <Text style={styles.linkText}>Back to sign in</Text>
            </Pressable>
          )}
        </View>
      </View>
    </ScrollView>
  );
}

function DashboardTab({ portal, onNavigate }) {
  const { summary, product, payments, notifications } = portal;

  return (
    <View style={styles.sectionStack}>
      <View style={styles.noticeBand}>
        <Text style={styles.noticeText}>
          Balance {formatKes(summary.balance)}. Paid {formatKes(summary.totalPaid)}. Progress {summary.progress}%.
        </Text>
      </View>
      <View style={styles.statsGrid}>
        <StatCard label="Paid" value={formatKes(summary.totalPaid)} />
        <StatCard label="Balance" value={formatKes(summary.balance)} />
        <StatCard label="Progress" value={`${summary.progress}%`} />
        <StatCard label="Pending requests" value={summary.pendingRequests} />
      </View>
      <View style={styles.twoColumn}>
        <View style={styles.panel}>
          <View style={styles.panelHeader}>
            <Smartphone size={22} color={colors.primary} />
            <View style={{ minWidth: 0 }}>
              <Text style={styles.panelTitle}>Product account</Text>
              <Text style={styles.panelText}>{fallback(product.model, 'Product model not set')}</Text>
            </View>
          </View>
          <Detail label="Type" value={fallback(product.type)} />
          <Detail label="Serial number" value={fallback(product.serialNumber)} />
          <Detail label="Chassis number" value={fallback(product.chassisNumber)} />
          <Detail label="IMEI" value={fallback(product.imei)} />
          <Detail label="Next due date" value={fallback(product.dueDate)} />
          <Button icon={CreditCard} onPress={() => onNavigate('pay')} style={styles.fullButton}>Make payment request</Button>
        </View>
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Latest activity</Text>
          <MiniList
            emptyText="No payment records yet."
            items={payments.slice(0, 3).map((payment) => ({
              id: payment.id,
              title: formatKes(payment.amount),
              text: `${payment.status} | ${fallback(payment.receipt, 'No receipt')} | ${payment.date}`
            }))}
          />
          <MiniList
            emptyText="No alerts yet."
            items={notifications.slice(0, 2).map((item) => ({
              id: item.id,
              title: item.title,
              text: item.message
            }))}
          />
        </View>
      </View>
    </View>
  );
}

function PaymentTab({ portal, onRefresh }) {
  const [amount, setAmount] = useState('');
  const [phone, setPhone] = useState(portal.customer?.phone || '');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const suggestions = useMemo(() => {
    const daily = Number(portal.product?.dailyInstallment || 0);
    return [daily, daily * 3, daily * 7].filter(Boolean);
  }, [portal.product?.dailyInstallment]);

  async function submit() {
    setMessage('');
    setSubmitting(true);
    try {
      await customerPortalService.createPaymentRequest({ amount: Number(amount), phone });
      setMessage('Payment request sent to the backend queue.');
      setAmount('');
      await onRefresh();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.twoColumn}>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Payment request</Text>
        <Text style={styles.panelText}>The backend will handle Paybill, STK, provider callbacks, and balance updates.</Text>
        <View style={styles.suggestionRow}>
          {suggestions.map((value) => (
            <Pressable key={value} onPress={() => setAmount(String(value))} style={styles.amountChip}>
              <Text style={styles.amountChipText}>{formatKes(value)}</Text>
            </Pressable>
          ))}
        </View>
        <Field label="Amount in KES" value={amount} onChangeText={setAmount} placeholder="Enter amount" keyboardType="numeric" />
        <Field label="Payment phone" value={phone} onChangeText={setPhone} placeholder="Enter M-Pesa phone" />
        {message ? <Text style={styles.greenText}>{message}</Text> : null}
        <Button icon={CreditCard} onPress={submit} disabled={submitting} style={styles.fullButton}>
          {submitting ? 'Sending...' : 'Send payment request'}
        </Button>
      </View>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Account summary</Text>
        <Detail label="Balance" value={formatKes(portal.summary.balance)} />
        <Detail label="Total paid" value={formatKes(portal.summary.totalPaid)} />
        <Detail label="Daily installment" value={formatKes(portal.product?.dailyInstallment)} />
        <Detail label="Product" value={fallback(portal.product?.model)} />
      </View>
    </View>
  );
}

function HistoryTab({ portal }) {
  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <History size={21} color={colors.primary} />
        <View>
          <Text style={styles.panelTitle}>Payment history</Text>
          <Text style={styles.panelText}>Confirmed backend and Paybill records appear here.</Text>
        </View>
      </View>
      <View style={styles.tableList}>
        {portal.payments.map((payment) => (
          <View key={payment.id} style={styles.tableRow}>
            <View style={{ minWidth: 0, flex: 1 }}>
              <Text style={styles.rowTitle}>{payment.date}</Text>
              <Text style={styles.rowText}>{fallback(payment.receipt, 'No receipt')} | {payment.method}</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.rowAmount}>{formatKes(payment.amount)}</Text>
              <Text style={styles.rowStatus}>{payment.status}</Text>
            </View>
          </View>
        ))}
        {!portal.payments.length && <Text style={styles.panelText}>No payment records yet.</Text>}
      </View>
    </View>
  );
}

function AlertsTab({ portal }) {
  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <Bell size={21} color={colors.primary} />
        <View>
          <Text style={styles.panelTitle}>Notifications</Text>
          <Text style={styles.panelText}>Payment reminders and account updates from the backend.</Text>
        </View>
      </View>
      <MiniList
        emptyText="No notifications yet."
        items={portal.notifications.map((item) => ({
          id: item.id,
          title: `${item.title}${item.unread ? ' | New' : ''}`,
          text: `${item.message} ${item.date ? `| ${item.date}` : ''}`
        }))}
      />
    </View>
  );
}

function ProfileTab({ portal }) {
  const { customer, product } = portal;

  return (
    <View style={styles.twoColumn}>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Customer details</Text>
        <Detail label="Name" value={fallback(customer?.name)} />
        <Detail label="Email" value={fallback(customer?.email)} />
        <Detail label="Phone" value={fallback(customer?.phone)} />
        <Detail label="National ID" value={fallback(customer?.nationalId)} />
      </View>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Product identifiers</Text>
        <Detail label="Product type" value={fallback(product?.type)} />
        <Detail label="Model" value={fallback(product?.model)} />
        <Detail label="Serial number" value={fallback(product?.serialNumber)} />
        <Detail label="Chassis number" value={fallback(product?.chassisNumber)} />
        <Detail label="IMEI" value={fallback(product?.imei)} />
      </View>
    </View>
  );
}

function SystemFrame({ children }) {
  return (
    <View style={styles.systemFrame}>
      <Image source={bumuLogo} style={styles.authLogo} />
      {children}
    </View>
  );
}

function Field({ label, ...props }) {
  return (
    <View style={styles.field}>
      <Text style={styles.label}>{label}</Text>
      <TextInput style={styles.input} placeholderTextColor={colors.muted} {...props} />
    </View>
  );
}

function StatCard({ label, value }) {
  return (
    <View style={styles.statCard}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function Detail({ label, value }) {
  return (
    <View style={styles.detailRow}>
      <Text style={styles.detailLabel}>{label}</Text>
      <Text style={styles.detailValue}>{value}</Text>
    </View>
  );
}

function MiniList({ items, emptyText }) {
  return (
    <View style={styles.miniList}>
      {items.map((item) => (
        <View key={item.id} style={styles.miniItem}>
          <Text style={styles.rowTitle}>{item.title}</Text>
          <Text style={styles.rowText}>{item.text}</Text>
        </View>
      ))}
      {!items.length && <Text style={styles.panelText}>{emptyText}</Text>}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    height: 'var(--app-vh)',
    width: '100%',
    backgroundColor: '#f4f8fb',
    overflowY: 'auto'
  },
  rootContent: {
    minHeight: 'var(--app-vh)',
    padding: 18
  },
  workspace: {
    width: '100%',
    maxWidth: 1180,
    marginHorizontal: 'auto',
    flexDirection: 'row',
    gap: 16,
    alignItems: 'stretch'
  },
  sidebar: {
    width: 250,
    borderWidth: 1,
    borderColor: '#dbe5ef',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    padding: 14,
    gap: 14,
    alignSelf: 'flex-start'
  },
  main: {
    flex: 1,
    minWidth: 0,
    gap: 14
  },
  customerBrand: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  brandLogo: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary
  },
  brandTitle: {
    fontSize: 18,
    fontWeight: '600'
  },
  brandSubtitle: {
    color: colors.muted,
    fontSize: 13
  },
  backButton: {
    alignSelf: 'flex-start',
    minHeight: 30,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    cursor: 'pointer'
  },
  backText: {
    color: colors.primary,
    fontWeight: '500'
  },
  navList: {
    gap: 6
  },
  navItem: {
    minHeight: 38,
    borderRadius: 8,
    paddingHorizontal: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 9,
    cursor: 'pointer'
  },
  navItemActive: {
    backgroundColor: colors.primarySoft
  },
  navText: {
    color: colors.slate,
    fontWeight: '500'
  },
  navTextActive: {
    color: colors.primary
  },
  logoutButton: {
    marginTop: 6
  },
  pageHeader: {
    borderWidth: 1,
    borderColor: '#dbe5ef',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    padding: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap'
  },
  kicker: {
    color: colors.primary,
    fontSize: 12,
    fontWeight: '600',
    textTransform: 'uppercase'
  },
  pageTitle: {
    fontSize: 27,
    lineHeight: 34,
    fontWeight: '600',
    color: colors.text
  },
  pageSubtitle: {
    color: colors.slate,
    marginTop: 4,
    lineHeight: 21
  },
  sectionStack: {
    gap: 14
  },
  noticeBand: {
    borderWidth: 1,
    borderColor: '#bde8d5',
    backgroundColor: colors.successSoft,
    borderRadius: 8,
    padding: 12
  },
  noticeText: {
    color: colors.success,
    fontWeight: '500'
  },
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12
  },
  statCard: {
    flex: 1,
    minWidth: 160,
    borderWidth: 1,
    borderColor: '#dbe5ef',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 15,
    gap: 8
  },
  statLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600'
  },
  statValue: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '600'
  },
  twoColumn: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 14
  },
  panel: {
    flex: 1,
    minWidth: 290,
    borderWidth: 1,
    borderColor: '#dbe5ef',
    backgroundColor: '#ffffff',
    borderRadius: 8,
    padding: 16,
    gap: 12
  },
  panelHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  panelTitle: {
    color: colors.text,
    fontSize: 18,
    fontWeight: '600'
  },
  panelText: {
    color: colors.muted,
    lineHeight: 21
  },
  detailRow: {
    borderTopWidth: 1,
    borderTopColor: '#edf2f7',
    paddingTop: 9,
    gap: 4
  },
  detailLabel: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600'
  },
  detailValue: {
    color: colors.text,
    fontWeight: '500'
  },
  miniList: {
    gap: 9
  },
  miniItem: {
    borderWidth: 1,
    borderColor: '#e5edf6',
    borderRadius: 8,
    padding: 10,
    gap: 4
  },
  rowTitle: {
    color: colors.text,
    fontWeight: '600'
  },
  rowText: {
    color: colors.muted,
    lineHeight: 20
  },
  rowAmount: {
    color: colors.text,
    fontWeight: '600',
    textAlign: 'right'
  },
  rowStatus: {
    color: colors.success,
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'right'
  },
  rowRight: {
    alignItems: 'flex-end',
    gap: 4
  },
  tableList: {
    gap: 8
  },
  tableRow: {
    minHeight: 58,
    borderWidth: 1,
    borderColor: '#e5edf6',
    borderRadius: 8,
    padding: 11,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    gap: 12
  },
  form: {
    gap: 11
  },
  field: {
    gap: 6
  },
  label: {
    color: colors.muted,
    fontSize: 12,
    fontWeight: '600'
  },
  input: {
    minHeight: 42,
    borderWidth: 1,
    borderColor: '#d5e2ef',
    borderRadius: 8,
    paddingHorizontal: 12,
    color: colors.text,
    backgroundColor: '#ffffff',
    outlineStyle: 'none'
  },
  suggestionRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  amountChip: {
    borderWidth: 1,
    borderColor: '#cfe0fb',
    borderRadius: 8,
    paddingHorizontal: 10,
    minHeight: 32,
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    cursor: 'pointer'
  },
  amountChipText: {
    color: colors.primary,
    fontWeight: '600',
    fontSize: 12
  },
  greenText: {
    color: colors.success,
    fontWeight: '500',
    lineHeight: 20
  },
  fullButton: {
    width: '100%'
  },
  authRoot: {
    height: 'var(--app-vh)',
    width: '100%',
    backgroundColor: 'var(--app-bg)',
    overflowY: 'auto'
  },
  authContent: {
    minHeight: 'var(--app-vh)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    paddingTop: 34,
    paddingBottom: 32
  },
  authCard: {
    width: '100%',
    maxWidth: 470,
    borderWidth: 1,
    borderColor: 'var(--app-border)',
    borderRadius: 10,
    backgroundColor: 'var(--app-surface)',
    padding: 16,
    gap: 14
  },
  authLogo: {
    width: 44,
    height: 44,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.primary
  },
  authBrand: {
    color: colors.text,
    fontSize: 20,
    fontWeight: '600'
  },
  authHeading: {
    gap: 6
  },
  authTitle: {
    color: colors.text,
    fontSize: 23,
    fontWeight: '600'
  },
  authText: {
    color: colors.muted,
    lineHeight: 21
  },
  inlineLink: {
    alignSelf: 'center',
    minHeight: 32,
    justifyContent: 'center',
    cursor: 'pointer'
  },
  authLinksRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
    flexWrap: 'wrap'
  },
  linkText: {
    color: colors.primary,
    fontWeight: '500'
  },
  systemFrame: {
    height: 'var(--app-vh)',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 20,
    backgroundColor: '#f4f8fb'
  },
  stateTitle: {
    color: colors.text,
    fontSize: 22,
    fontWeight: '600',
    textAlign: 'center'
  },
  stateText: {
    color: colors.muted,
    textAlign: 'center'
  }
});
