import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  BarChart3,
  Bike,
  CreditCard,
  Database,
  Home,
  LogIn,
  LogOut,
  PackagePlus,
  RefreshCw,
  ShieldCheck,
  UserPlus,
  UsersRound
} from 'lucide-react';
import { Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Button } from '../components/ui/Button.jsx';
import { Text } from '../components/ui/Text.jsx';
import { adminPortalService } from '../services/adminPortalService.js';
import { colors } from '../theme/colors.js';
import bumuLogo from '../../BumuLogo.jpeg';

const emptyPortal = {
  admin: null,
  summary: { agents: 0, customers: 0, pendingApplications: 0, activeProducts: 0, totalBalance: 0, todayCollections: 0, pendingCommissions: 0 },
  agents: [],
  customers: [],
  products: [],
  payments: [],
  commissions: [],
  applications: [],
  audits: []
};

const tabs = [
  ['dashboard', 'Dashboard', Home],
  ['screening', 'Screening', ShieldCheck],
  ['agents', 'Agents', UsersRound],
  ['customers', 'Customers', UserPlus],
  ['products', 'Products', Bike],
  ['finance', 'Finance', CreditCard],
  ['audit', 'Audit', Database]
];

function formatKes(value) {
  return `KES ${Number(value || 0).toLocaleString('en-KE')}`;
}

function fallback(value, text = 'Not set') {
  return value || text;
}

export function AdminPortalScreen() {
  const [authenticated, setAuthenticated] = useState(() => adminPortalService.hasSession());
  const [loading, setLoading] = useState(adminPortalService.hasSession());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [portal, setPortal] = useState(emptyPortal);
  const [message, setMessage] = useState('');

  async function loadPortal() {
    setLoading(true);
    setMessage('');
    try {
      const data = await adminPortalService.loadPortal();
      setPortal({ ...emptyPortal, ...data });
      setAuthenticated(true);
    } catch (error) {
      setMessage(error.message);
      adminPortalService.logout();
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (authenticated) loadPortal();
  }, []);

  function goHome() {
    window.history.pushState(null, '', '#/');
    window.dispatchEvent(new HashChangeEvent('hashchange'));
  }

  function logout() {
    adminPortalService.logout();
    setAuthenticated(false);
    setPortal(emptyPortal);
    setActiveTab('dashboard');
  }

  if (!authenticated) {
    return (
      <AdminAuthScreen
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
      <View style={styles.systemFrame}>
        <Image source={bumuLogo} style={styles.authLogo} />
        <Text style={styles.stateTitle}>Loading admin portal</Text>
        <Text style={styles.stateText}>Reading shared CRM records from Supabase.</Text>
      </View>
    );
  }

  const props = { portal, onRefresh: loadPortal };

  return (
    <ScrollView style={styles.root} contentContainerStyle={styles.rootContent} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
      <View style={styles.workspace}>
        <View style={styles.sidebar}>
          <Pressable onPress={goHome} style={styles.backButton}>
            <ArrowLeft size={16} color={colors.primary} />
            <Text style={styles.backText}>Website</Text>
          </Pressable>
          <View style={styles.brandRow}>
            <Image source={bumuLogo} style={styles.brandLogo} />
            <View style={{ minWidth: 0 }}>
              <Text style={styles.brandTitle}>Bumu Paygo</Text>
              <Text style={styles.brandSubtitle}>Admin portal</Text>
            </View>
          </View>
          <View style={styles.adminCard}>
            <Text style={styles.adminName}>{fallback(portal.admin?.fullName, 'Admin')}</Text>
            <Text style={styles.adminMeta}>{fallback(portal.admin?.email, 'No email')}</Text>
            <Text style={styles.adminMeta}>Shared CRM control</Text>
          </View>
          <View style={styles.navList}>
            {tabs.map(([key, label, Icon]) => (
              <Pressable key={key} onPress={() => setActiveTab(key)} style={[styles.navItem, activeTab === key && styles.navItemActive]}>
                <Icon size={17} color={activeTab === key ? colors.primary : colors.muted} />
                <Text style={[styles.navText, activeTab === key && styles.navTextActive]}>{label}</Text>
              </Pressable>
            ))}
          </View>
          <Button icon={LogOut} variant="secondary" onPress={logout}>Sign out</Button>
        </View>

        <View style={styles.main}>
          <View style={styles.pageHeader}>
            <View style={{ minWidth: 0 }}>
              <Text style={styles.kicker}>Admin workspace</Text>
              <Text style={styles.pageTitle}>Central CRM control</Text>
              <Text style={styles.pageSubtitle}>Manage agents, customers, product inventory, finance visibility, and audit records.</Text>
            </View>
            <Button icon={RefreshCw} variant="secondary" onPress={loadPortal}>Refresh</Button>
          </View>

          {activeTab === 'dashboard' && <DashboardTab {...props} />}
          {activeTab === 'screening' && <ScreeningTab {...props} />}
          {activeTab === 'agents' && <AgentsTab {...props} />}
          {activeTab === 'customers' && <CustomersTab {...props} />}
          {activeTab === 'products' && <ProductsTab {...props} />}
          {activeTab === 'finance' && <FinanceTab {...props} />}
          {activeTab === 'audit' && <AuditTab {...props} />}
        </View>
      </View>
    </ScrollView>
  );
}

function AdminAuthScreen({ onAuthenticated, onBack, message }) {
  const [mode, setMode] = useState('login');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [password, setPassword] = useState('');
  const [setupCode, setSetupCode] = useState('');
  const [notice, setNotice] = useState(message || '');
  const [submitting, setSubmitting] = useState(false);

  async function login() {
    setNotice('');
    if (!email.trim() || !password) {
      setNotice('Enter your admin email and password.');
      return;
    }

    setSubmitting(true);
    try {
      await adminPortalService.login({ email: email.trim(), password });
      onAuthenticated();
    } catch (error) {
      setNotice(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function register() {
    setNotice('');
    if (!fullName.trim() || !email.trim() || !password) {
      setNotice('Enter your name, email, and password.');
      return;
    }

    setSubmitting(true);
    try {
      await adminPortalService.register({ fullName, email, phone, password, setupCode });
      setNotice('Admin account created. Sign in with the same email and password.');
      setMode('login');
      setPassword('');
      setSetupCode('');
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
        <View style={styles.brandRow}>
          <Image source={bumuLogo} style={styles.authLogo} />
          <View>
            <Text style={styles.authBrand}>Bumu Paygo</Text>
            <Text style={styles.brandSubtitle}>Admin account access</Text>
          </View>
        </View>
        <View style={styles.authHeading}>
          <Text style={styles.authTitle}>{mode === 'login' ? 'Admin sign in' : 'Create admin account'}</Text>
          <Text style={styles.authText}>{mode === 'login' ? 'Use your approved admin email.' : 'Create the admin user for the shared Supabase CRM.'}</Text>
        </View>
        <View style={styles.form}>
          {mode === 'register' && (
            <>
              <Field label="Full name" value={fullName} onChangeText={setFullName} placeholder="Admin full name" />
              <Field label="Phone number" value={phone} onChangeText={setPhone} placeholder="Phone number" />
            </>
          )}
          <Field label="Personal email" value={email} onChangeText={setEmail} placeholder="Enter your email" />
          <Field label="Password" value={password} onChangeText={setPassword} placeholder="At least 10 characters" secureTextEntry />
          {mode === 'register' ? (
            <Field label="Admin setup code" value={setupCode} onChangeText={setSetupCode} placeholder="Code from system owner" secureTextEntry />
          ) : null}
          {mode === 'register' ? <Text style={styles.greenText}>Password must include uppercase, lowercase, number, and special character.</Text> : null}
          {notice ? <Text style={styles.greenText}>{notice}</Text> : null}
          <Button icon={mode === 'login' ? LogIn : ShieldCheck} onPress={mode === 'login' ? login : register} disabled={submitting} style={styles.fullButton}>
            {submitting ? 'Working...' : mode === 'login' ? 'Sign in' : 'Create account'}
          </Button>
          {mode === 'login' ? (
            <Pressable onPress={() => setMode('register')} style={styles.inlineLink}>
              <Text style={styles.linkText}>Create account</Text>
            </Pressable>
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

function DashboardTab({ portal }) {
  return (
    <View style={styles.stack}>
      <View style={styles.statsGrid}>
        <StatCard label="Agents" value={portal.summary.agents} />
        <StatCard label="Customers" value={portal.summary.customers} />
        <StatCard label="Pending screening" value={portal.summary.pendingApplications} />
        <StatCard label="Active products" value={portal.summary.activeProducts} />
        <StatCard label="Total balance" value={formatKes(portal.summary.totalBalance)} />
        <StatCard label="Today collections" value={formatKes(portal.summary.todayCollections)} />
        <StatCard label="Pending commission" value={formatKes(portal.summary.pendingCommissions)} />
      </View>
      <View style={styles.twoColumn}>
        <PanelList title="Recent customers" items={portal.customers.slice(0, 5).map((item) => ({ id: item.id, title: item.name, text: `${item.productType} | ${formatKes(item.balance)} balance` }))} emptyText="No customers yet." />
        <PanelList title="Recent audit activity" items={portal.audits.slice(0, 5).map((item) => ({ id: item.id, title: item.action, text: `${item.actorEmail || 'system'} | ${item.createdAt}` }))} emptyText="No audit records yet." />
      </View>
    </View>
  );
}

function ScreeningTab({ portal, onRefresh }) {
  const [reasonById, setReasonById] = useState({});
  const [message, setMessage] = useState('');
  const [submittingId, setSubmittingId] = useState('');

  async function review(id, action) {
    setMessage('');
    setSubmittingId(id);
    try {
      await adminPortalService.reviewApplication(id, {
        action,
        reason: reasonById[id] || ''
      });
      setMessage('Application review saved.');
      await onRefresh();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSubmittingId('');
    }
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Screening queue</Text>
      <Text style={styles.panelText}>Review KYC submissions, duplicate national ID flags, next-of-kin details, and product identifiers.</Text>
      {message ? <Text style={styles.greenText}>{message}</Text> : null}
      <View style={styles.miniList}>
        {portal.applications.map((item) => (
          <View key={item.id} style={styles.miniItem}>
            <Text style={styles.rowTitle}>{item.customerName}</Text>
            <Text style={styles.rowText}>{item.phone} | ID {fallback(item.nationalId)} | {item.productType} {fallback(item.productModel)}</Text>
            <Text style={styles.rowText}>Agent {fallback(item.agentName)} | Next of kin {fallback(item.nextOfKin)} | {item.status}</Text>
            {item.duplicateNationalId ? <Text style={styles.dangerText}>Duplicate national ID flagged.</Text> : null}
            <Field
              label="Review note"
              value={reasonById[item.id] || ''}
              onChangeText={(value) => setReasonById((current) => ({ ...current, [item.id]: value }))}
              placeholder="Reason for reject/info request, or approval note"
            />
            <View style={styles.actionRow}>
              <Button icon={ShieldCheck} onPress={() => review(item.id, 'approve')} disabled={Boolean(submittingId)} style={styles.actionButton}>Approve</Button>
              <Button variant="secondary" onPress={() => review(item.id, 'request_info')} disabled={Boolean(submittingId)} style={styles.actionButton}>Request info</Button>
              <Button variant="danger" onPress={() => review(item.id, 'reject')} disabled={Boolean(submittingId)} style={styles.actionButton}>Reject</Button>
            </View>
          </View>
        ))}
        {!portal.applications.length && <Text style={styles.panelText}>No screening applications yet.</Text>}
      </View>
    </View>
  );
}

function AgentsTab({ portal, onRefresh }) {
  const [form, setForm] = useState({ fullName: '', email: '', phone: '', nationalId: '', region: '' });
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setMessage('');
    setSubmitting(true);
    try {
      await adminPortalService.createAgent(form);
      setForm({ fullName: '', email: '', phone: '', nationalId: '', region: '' });
      setMessage('Agent profile added to the shared CRM.');
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
        <Text style={styles.panelTitle}>Create agent profile</Text>
        <Field label="Full name" value={form.fullName} onChangeText={(value) => setForm((current) => ({ ...current, fullName: value }))} placeholder="Agent full name" />
        <Field label="Email" value={form.email} onChangeText={(value) => setForm((current) => ({ ...current, email: value }))} placeholder="Agent email" />
        <Field label="Phone" value={form.phone} onChangeText={(value) => setForm((current) => ({ ...current, phone: value }))} placeholder="Agent phone" />
        <Field label="National ID" value={form.nationalId} onChangeText={(value) => setForm((current) => ({ ...current, nationalId: value }))} placeholder="National ID" />
        <Field label="Region" value={form.region} onChangeText={(value) => setForm((current) => ({ ...current, region: value }))} placeholder="Branch or region" />
        {message ? <Text style={styles.greenText}>{message}</Text> : null}
        <Button icon={UserPlus} onPress={submit} disabled={submitting} style={styles.fullButton}>{submitting ? 'Saving...' : 'Create agent'}</Button>
      </View>
      <PanelList title="Agents" items={portal.agents.map((item) => ({ id: item.id, title: item.name, text: `${fallback(item.email)} | ${fallback(item.phone)} | ${item.status}` }))} emptyText="No agents yet." />
    </View>
  );
}

function CustomersTab({ portal, onRefresh }) {
  const [form, setForm] = useState({ customerName: '', customerPhone: '', email: '', productType: 'bike', productModel: '', totalPayable: '', paidAmount: '' });
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setMessage('');
    setSubmitting(true);
    try {
      await adminPortalService.createCustomer(form);
      setForm({ customerName: '', customerPhone: '', email: '', productType: 'bike', productModel: '', totalPayable: '', paidAmount: '' });
      setMessage('Customer added to the shared CRM.');
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
        <Text style={styles.panelTitle}>Create customer account</Text>
        <Field label="Customer name" value={form.customerName} onChangeText={(value) => setForm((current) => ({ ...current, customerName: value }))} placeholder="Full name" />
        <Field label="Phone" value={form.customerPhone} onChangeText={(value) => setForm((current) => ({ ...current, customerPhone: value }))} placeholder="Customer phone" />
        <Field label="Email" value={form.email} onChangeText={(value) => setForm((current) => ({ ...current, email: value }))} placeholder="Customer email" />
        <Field label="Product type" value={form.productType} onChangeText={(value) => setForm((current) => ({ ...current, productType: value }))} placeholder="bike or phone" />
        <Field label="Product model" value={form.productModel} onChangeText={(value) => setForm((current) => ({ ...current, productModel: value }))} placeholder="Model" />
        <Field label="Total payable" value={form.totalPayable} onChangeText={(value) => setForm((current) => ({ ...current, totalPayable: value }))} placeholder="Amount" />
        <Field label="Paid amount" value={form.paidAmount} onChangeText={(value) => setForm((current) => ({ ...current, paidAmount: value }))} placeholder="Deposit" />
        {message ? <Text style={styles.greenText}>{message}</Text> : null}
        <Button icon={UserPlus} onPress={submit} disabled={submitting} style={styles.fullButton}>{submitting ? 'Saving...' : 'Create customer'}</Button>
      </View>
      <PanelList title="Customers" items={portal.customers.map((item) => ({ id: item.id, title: item.name, text: `${item.productType} | ${formatKes(item.balance)} | ${item.status}` }))} emptyText="No customers yet." />
    </View>
  );
}

function ProductsTab({ portal, onRefresh }) {
  const [form, setForm] = useState({ productType: 'bike', productModel: '', serialNumber: '', chassisNumber: '', imei: '', branch: '', status: 'available' });
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  async function submit() {
    setMessage('');
    setSubmitting(true);
    try {
      await adminPortalService.createProduct(form);
      setForm({ productType: 'bike', productModel: '', serialNumber: '', chassisNumber: '', imei: '', branch: '', status: 'available' });
      setMessage('Product added to inventory.');
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
        <Text style={styles.panelTitle}>Add product inventory</Text>
        <Field label="Product type" value={form.productType} onChangeText={(value) => setForm((current) => ({ ...current, productType: value }))} placeholder="bike or phone" />
        <Field label="Product model" value={form.productModel} onChangeText={(value) => setForm((current) => ({ ...current, productModel: value }))} placeholder="Model" />
        <Field label="Serial number" value={form.serialNumber} onChangeText={(value) => setForm((current) => ({ ...current, serialNumber: value }))} placeholder="Serial number" />
        <Field label="Chassis number" value={form.chassisNumber} onChangeText={(value) => setForm((current) => ({ ...current, chassisNumber: value }))} placeholder="Bike chassis" />
        <Field label="IMEI" value={form.imei} onChangeText={(value) => setForm((current) => ({ ...current, imei: value }))} placeholder="Phone IMEI" />
        <Field label="Branch" value={form.branch} onChangeText={(value) => setForm((current) => ({ ...current, branch: value }))} placeholder="Branch" />
        {message ? <Text style={styles.greenText}>{message}</Text> : null}
        <Button icon={PackagePlus} onPress={submit} disabled={submitting} style={styles.fullButton}>{submitting ? 'Saving...' : 'Add product'}</Button>
      </View>
      <PanelList title="Products" items={portal.products.map((item) => ({ id: item.id, title: `${item.productType} ${item.productModel}`, text: `${fallback(item.serialNumber)} | ${fallback(item.chassisNumber || item.imei)} | ${item.status}` }))} emptyText="No products yet." />
    </View>
  );
}

function FinanceTab({ portal }) {
  return (
    <View style={styles.twoColumn}>
      <PanelList title="Latest payments" items={portal.payments.map((item) => ({ id: item.id, title: `${formatKes(item.amount)} - ${item.customerName}`, text: `${item.status} | ${fallback(item.receipt)} | ${item.date}` }))} emptyText="No payment records yet." />
      <PanelList title="Commissions" items={portal.commissions.map((item) => ({ id: item.id, title: `${formatKes(item.amount)} - ${item.agentName}`, text: `${item.status} | ${item.customerName}` }))} emptyText="No commission records yet." />
    </View>
  );
}

function AuditTab({ portal }) {
  return <PanelList title="Audit logs" items={portal.audits.map((item) => ({ id: item.id, title: item.action, text: `${item.actorEmail || 'system'} | ${item.targetTable || 'system'} | ${item.createdAt}` }))} emptyText="No audit logs yet." />;
}

function Field({ label, fieldStyle, ...props }) {
  return (
    <View style={[styles.field, fieldStyle]}>
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

function PanelList({ title, items, emptyText }) {
  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <BarChart3 size={20} color={colors.primary} />
        <Text style={styles.panelTitle}>{title}</Text>
      </View>
      <View style={styles.miniList}>
        {items.map((item) => (
          <View key={item.id} style={styles.miniItem}>
            <Text style={styles.rowTitle}>{item.title}</Text>
            <Text style={styles.rowText}>{item.text}</Text>
          </View>
        ))}
        {!items.length && <Text style={styles.panelText}>{emptyText}</Text>}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  root: { height: 'var(--app-vh)', width: '100%', backgroundColor: '#f4f8fb', overflowY: 'auto' },
  rootContent: { minHeight: 'var(--app-vh)', padding: 18 },
  workspace: { width: '100%', maxWidth: 1180, marginHorizontal: 'auto', flexDirection: 'row', gap: 16, alignItems: 'stretch', flexWrap: 'wrap' },
  sidebar: { width: 255, borderWidth: 1, borderColor: '#dbe5ef', borderRadius: 8, backgroundColor: '#ffffff', padding: 14, gap: 14, alignSelf: 'flex-start' },
  main: { flex: 1, minWidth: 300, gap: 14 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandLogo: { width: 44, height: 44, borderRadius: 8, borderWidth: 1, borderColor: colors.primary },
  brandTitle: { fontSize: 18, fontWeight: '600' },
  brandSubtitle: { color: colors.muted, fontSize: 13 },
  backButton: { alignSelf: 'flex-start', minHeight: 30, flexDirection: 'row', alignItems: 'center', gap: 6, cursor: 'pointer' },
  backText: { color: colors.primary, fontWeight: '500' },
  adminCard: { borderWidth: 1, borderColor: '#dbe5ef', borderRadius: 8, padding: 11, backgroundColor: '#f8fbff', gap: 3 },
  adminName: { color: colors.text, fontWeight: '600' },
  adminMeta: { color: colors.muted, fontSize: 12 },
  navList: { gap: 6 },
  navItem: { minHeight: 38, borderRadius: 8, paddingHorizontal: 10, flexDirection: 'row', alignItems: 'center', gap: 9, cursor: 'pointer' },
  navItemActive: { backgroundColor: colors.primarySoft },
  navText: { color: colors.slate, fontWeight: '500' },
  navTextActive: { color: colors.primary },
  pageHeader: { borderWidth: 1, borderColor: '#dbe5ef', borderRadius: 8, backgroundColor: '#ffffff', padding: 18, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  kicker: { color: colors.primary, fontSize: 12, fontWeight: '600', textTransform: 'uppercase' },
  pageTitle: { fontSize: 27, lineHeight: 34, fontWeight: '600', color: colors.text },
  pageSubtitle: { color: colors.slate, marginTop: 4, lineHeight: 21 },
  stack: { gap: 14 },
  statsGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  statCard: { flex: 1, minWidth: 160, borderWidth: 1, borderColor: '#dbe5ef', backgroundColor: '#ffffff', borderRadius: 8, padding: 15, gap: 8 },
  statLabel: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  statValue: { color: colors.text, fontSize: 21, fontWeight: '600' },
  twoColumn: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  panel: { flex: 1, minWidth: 295, borderWidth: 1, borderColor: '#dbe5ef', backgroundColor: '#ffffff', borderRadius: 8, padding: 16, gap: 12 },
  panelHeader: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  panelTitle: { color: colors.text, fontSize: 18, fontWeight: '600' },
  panelText: { color: colors.muted, lineHeight: 21 },
  actionRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  actionButton: { flexGrow: 1 },
  field: { gap: 6, width: '100%' },
  label: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  input: { minHeight: 40, borderWidth: 1, borderColor: '#d5e2ef', borderRadius: 8, paddingHorizontal: 12, color: colors.text, backgroundColor: '#ffffff', outlineStyle: 'none' },
  fullButton: { width: '100%' },
  greenText: { color: colors.success, fontWeight: '500', lineHeight: 20 },
  dangerText: { color: colors.danger, fontWeight: '600', lineHeight: 20 },
  miniList: { gap: 9 },
  miniItem: { borderWidth: 1, borderColor: '#e5edf6', borderRadius: 8, padding: 10, gap: 7 },
  rowTitle: { color: colors.text, fontWeight: '600' },
  rowText: { color: colors.muted, lineHeight: 20 },
  authRoot: { height: 'var(--app-vh)', width: '100%', backgroundColor: 'var(--app-bg)', overflowY: 'auto' },
  authContent: { minHeight: '100%', alignItems: 'center', justifyContent: 'flex-start', padding: 12, paddingTop: 18, paddingBottom: 36 },
  authCard: { width: '100%', maxWidth: 540, borderWidth: 1, borderColor: 'var(--app-border)', borderRadius: 10, backgroundColor: 'var(--app-surface)', padding: 16, gap: 10 },
  authLogo: { width: 42, height: 42, borderRadius: 8, borderWidth: 1, borderColor: colors.primary },
  authBrand: { color: colors.text, fontSize: 19, fontWeight: '600' },
  authHeading: { gap: 4 },
  authTitle: { color: colors.text, fontSize: 22, fontWeight: '600', lineHeight: 28 },
  authText: { color: colors.muted, lineHeight: 20, fontSize: 14 },
  form: { gap: 8 },
  inlineLink: { alignSelf: 'center', minHeight: 32, justifyContent: 'center', cursor: 'pointer' },
  linkText: { color: colors.primary, fontWeight: '500' },
  systemFrame: { height: 'var(--app-vh)', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 20, backgroundColor: '#f4f8fb' },
  stateTitle: { color: colors.text, fontSize: 22, fontWeight: '600', textAlign: 'center' },
  stateText: { color: colors.muted, textAlign: 'center' }
});
