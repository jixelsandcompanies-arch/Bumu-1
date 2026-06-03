import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  Bike,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Home,
  LogIn,
  LogOut,
  RefreshCw,
  UserPlus,
  UsersRound
} from 'lucide-react';
import { Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Button } from '../components/ui/Button.jsx';
import { Text } from '../components/ui/Text.jsx';
import { agentWorkspaceService } from '../services/agentWorkspaceService.js';
import { colors } from '../theme/colors.js';
import bumuLogo from '../../BumuLogo.jpeg';

const emptyPortal = {
  agent: null,
  summary: { assignedCustomers: 0, overdueCustomers: 0, assignedBalance: 0, paidCommissions: 0, pendingCommissions: 0, openTasks: 0 },
  customers: [],
  commissions: [],
  notifications: [],
  tasks: []
};

const tabs = [
  ['dashboard', 'Dashboard', Home],
  ['register', 'Register', UserPlus],
  ['customers', 'Customers', UsersRound],
  ['tasks', 'Tasks', ClipboardList],
  ['commissions', 'Commissions', CreditCard],
  ['alerts', 'Alerts', Bell]
];

function formatKes(value) {
  return `KES ${Number(value || 0).toLocaleString('en-KE')}`;
}

function fallback(value, text = 'Not set') {
  return value || text;
}

export function AgentPortalScreen() {
  const [authenticated, setAuthenticated] = useState(() => agentWorkspaceService.hasSession());
  const [loading, setLoading] = useState(agentWorkspaceService.hasSession());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [portal, setPortal] = useState(emptyPortal);
  const [message, setMessage] = useState('');

  async function loadPortal() {
    setLoading(true);
    setMessage('');
    try {
      const data = await agentWorkspaceService.loadPortal();
      setPortal({ ...emptyPortal, ...data });
      setAuthenticated(true);
    } catch (error) {
      setMessage(error.message);
      agentWorkspaceService.logout();
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
    agentWorkspaceService.logout();
    setAuthenticated(false);
    setPortal(emptyPortal);
    setActiveTab('dashboard');
  }

  if (!authenticated) {
    return (
      <AgentAuthScreen
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
        <Text style={styles.stateTitle}>Loading agent portal</Text>
        <Text style={styles.stateText}>Reading agent records from the shared CRM database.</Text>
      </View>
    );
  }

  const props = { portal, onRefresh: loadPortal, onNavigate: setActiveTab };

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
              <Text style={styles.brandSubtitle}>Agent portal</Text>
            </View>
          </View>
          <View style={styles.agentCard}>
            <Text style={styles.agentName}>{fallback(portal.agent?.name, 'Agent')}</Text>
            <Text style={styles.agentMeta}>{fallback(portal.agent?.code, 'No agent code')}</Text>
            <Text style={styles.agentMeta}>{fallback(portal.agent?.region, 'No region')}</Text>
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
          <Button icon={LogOut} variant="secondary" onPress={logout}>Sign out</Button>
        </View>

        <View style={styles.main}>
          <View style={styles.pageHeader}>
            <View style={{ minWidth: 0 }}>
              <Text style={styles.kicker}>Agent workspace</Text>
              <Text style={styles.pageTitle}>{fallback(portal.agent?.name, 'Agent account')}</Text>
              <Text style={styles.pageSubtitle}>Register customers, track follow-up, and view commissions from the centralized CRM.</Text>
            </View>
            <Button icon={RefreshCw} variant="secondary" onPress={loadPortal}>Refresh</Button>
          </View>

          {activeTab === 'dashboard' && <DashboardTab {...props} />}
          {activeTab === 'register' && <RegisterTab {...props} />}
          {activeTab === 'customers' && <CustomersTab {...props} />}
          {activeTab === 'tasks' && <TasksTab {...props} />}
          {activeTab === 'commissions' && <CommissionsTab {...props} />}
          {activeTab === 'alerts' && <AlertsTab {...props} />}
        </View>
      </View>
    </ScrollView>
  );
}

function AgentAuthScreen({ onAuthenticated, onBack, message }) {
  const [mode, setMode] = useState('login');
  const [fullName, setFullName] = useState('');
  const [nationalId, setNationalId] = useState('');
  const [phone, setPhone] = useState('');
  const [region, setRegion] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [notice, setNotice] = useState(message || '');
  const [submitting, setSubmitting] = useState(false);

  async function login() {
    setNotice('');
    setSubmitting(true);
    try {
      await agentWorkspaceService.login({ email: email.trim(), password });
      onAuthenticated();
    } catch (error) {
      setNotice(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function register() {
    setNotice('');
    setSubmitting(true);
    try {
      await agentWorkspaceService.register({ fullName, nationalId, phone, region, email, password });
      setNotice('Agent account created. Sign in with the same email and password.');
      setMode('login');
      setPassword('');
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
            <Text style={styles.brandSubtitle}>Agent account access</Text>
          </View>
        </View>
        <View style={styles.authHeading}>
          <Text style={styles.authTitle}>{mode === 'login' ? 'Agent sign in' : 'Create agent account'}</Text>
          <Text style={styles.authText}>
            {mode === 'login' ? 'Use your approved agent email.' : 'Create an agent profile linked to Supabase Auth and the shared CRM.'}
          </Text>
        </View>
        <View style={styles.form}>
          {mode === 'register' && (
            <>
              <Field label="Full name" value={fullName} onChangeText={setFullName} placeholder="Agent full name" />
              <Field label="National ID" value={nationalId} onChangeText={setNationalId} placeholder="National ID number" />
              <Field label="Phone number" value={phone} onChangeText={setPhone} placeholder="Agent phone" />
              <Field label="Region" value={region} onChangeText={setRegion} placeholder="Branch or region" />
            </>
          )}
          <Field label="Personal email" value={email} onChangeText={setEmail} placeholder="Enter your email" />
          <Field label="Password" value={password} onChangeText={setPassword} placeholder="At least 10 characters" secureTextEntry />
          {notice ? <Text style={styles.greenText}>{notice}</Text> : null}
          <Button icon={mode === 'login' ? LogIn : UserPlus} onPress={mode === 'login' ? login : register} disabled={submitting} style={styles.fullButton}>
            {submitting ? 'Please wait...' : mode === 'login' ? 'Sign in' : 'Create account'}
          </Button>
          <Pressable onPress={() => setMode(mode === 'login' ? 'register' : 'login')} style={styles.inlineLink}>
            <Text style={styles.linkText}>{mode === 'login' ? 'New agent? Register here' : 'Back to sign in'}</Text>
          </Pressable>
        </View>
      </View>
    </ScrollView>
  );
}

function DashboardTab({ portal, onNavigate }) {
  return (
    <View style={styles.stack}>
      <View style={styles.statsGrid}>
        <StatCard label="Assigned customers" value={portal.summary.assignedCustomers} />
        <StatCard label="Overdue" value={portal.summary.overdueCustomers} />
        <StatCard label="Assigned balance" value={formatKes(portal.summary.assignedBalance)} />
        <StatCard label="Pending commission" value={formatKes(portal.summary.pendingCommissions)} />
      </View>
      <View style={styles.twoColumn}>
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Today focus</Text>
          <MiniList
            emptyText="No open tasks."
            items={portal.tasks.filter((task) => task.status === 'open').slice(0, 4).map((task) => ({
              id: task.id,
              title: task.title,
              text: `${task.dueLabel || 'Today'} | ${task.note || 'No note'}`
            }))}
          />
          <Button icon={ClipboardList} onPress={() => onNavigate('tasks')} style={styles.fullButton}>Open tasks</Button>
        </View>
        <View style={styles.panel}>
          <Text style={styles.panelTitle}>Recent customers</Text>
          <MiniList
            emptyText="No assigned customers."
            items={portal.customers.slice(0, 4).map((customer) => ({
              id: customer.id,
              title: customer.name,
              text: `${customer.productType} | ${formatKes(customer.balance)} balance`
            }))}
          />
          <Button icon={UserPlus} onPress={() => onNavigate('register')} style={styles.fullButton}>Register customer</Button>
        </View>
      </View>
    </View>
  );
}

function RegisterTab({ onRefresh }) {
  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    nationalId: '',
    email: '',
    productType: 'bike',
    productModel: '',
    serialNumber: '',
    chassisNumber: '',
    imei: '',
    totalPayable: '',
    paidAmount: '',
    dailyInstallment: '',
    dueDate: ''
  });
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function submit() {
    setMessage('');
    setSubmitting(true);
    try {
      await agentWorkspaceService.createCustomer(form);
      setMessage('Customer registered into the shared CRM.');
      setForm((current) => ({ ...current, customerName: '', customerPhone: '', nationalId: '', email: '', serialNumber: '', chassisNumber: '', imei: '' }));
      await onRefresh();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <Bike size={22} color={colors.primary} />
        <View>
          <Text style={styles.panelTitle}>Register customer and product</Text>
          <Text style={styles.panelText}>This writes into the same customer table finance and customer portals use.</Text>
        </View>
      </View>
      <View style={styles.formGrid}>
        <Field label="Customer name" value={form.customerName} onChangeText={(value) => update('customerName', value)} placeholder="Full name" />
        <Field label="Phone number" value={form.customerPhone} onChangeText={(value) => update('customerPhone', value)} placeholder="Customer phone" />
        <Field label="National ID" value={form.nationalId} onChangeText={(value) => update('nationalId', value)} placeholder="National ID" />
        <Field label="Email" value={form.email} onChangeText={(value) => update('email', value)} placeholder="Customer email" />
        <Field label="Product type" value={form.productType} onChangeText={(value) => update('productType', value)} placeholder="bike or phone" />
        <Field label="Product model" value={form.productModel} onChangeText={(value) => update('productModel', value)} placeholder="Model name" />
        <Field label="Serial number" value={form.serialNumber} onChangeText={(value) => update('serialNumber', value)} placeholder="Serial number" />
        <Field label="Chassis number" value={form.chassisNumber} onChangeText={(value) => update('chassisNumber', value)} placeholder="For bikes" />
        <Field label="IMEI" value={form.imei} onChangeText={(value) => update('imei', value)} placeholder="For phones" />
        <Field label="Total payable" value={form.totalPayable} onChangeText={(value) => update('totalPayable', value)} placeholder="Amount" />
        <Field label="Paid amount" value={form.paidAmount} onChangeText={(value) => update('paidAmount', value)} placeholder="Deposit paid" />
        <Field label="Daily installment" value={form.dailyInstallment} onChangeText={(value) => update('dailyInstallment', value)} placeholder="Daily amount" />
        <Field label="Due date" value={form.dueDate} onChangeText={(value) => update('dueDate', value)} placeholder="YYYY-MM-DD" />
      </View>
      {message ? <Text style={styles.greenText}>{message}</Text> : null}
      <Button icon={UserPlus} onPress={submit} disabled={submitting} style={styles.fullButton}>
        {submitting ? 'Saving...' : 'Save customer'}
      </Button>
    </View>
  );
}

function CustomersTab({ portal }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Assigned customers</Text>
      <View style={styles.tableList}>
        {portal.customers.map((customer) => (
          <View key={customer.id} style={styles.tableRow}>
            <View style={{ flex: 1, minWidth: 0 }}>
              <Text style={styles.rowTitle}>{customer.name}</Text>
              <Text style={styles.rowText}>{customer.phone} | {customer.productType} | {fallback(customer.productModel)}</Text>
              <Text style={styles.rowText}>Serial {fallback(customer.serialNumber)} | Chassis {fallback(customer.chassisNumber)} | IMEI {fallback(customer.imei)}</Text>
            </View>
            <View style={styles.rowRight}>
              <Text style={styles.rowAmount}>{formatKes(customer.balance)}</Text>
              <Text style={styles.rowStatus}>{customer.status}</Text>
            </View>
          </View>
        ))}
        {!portal.customers.length && <Text style={styles.panelText}>No assigned customers found.</Text>}
      </View>
    </View>
  );
}

function TasksTab({ portal, onRefresh }) {
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState('');

  async function addTask() {
    setMessage('');
    try {
      await agentWorkspaceService.createTask({ title, note });
      setTitle('');
      setNote('');
      setMessage('Task added.');
      await onRefresh();
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function complete(id) {
    setMessage('');
    try {
      await agentWorkspaceService.completeTask(id);
      await onRefresh();
    } catch (error) {
      setMessage(error.message);
    }
  }

  return (
    <View style={styles.twoColumn}>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Add follow-up task</Text>
        <Field label="Task title" value={title} onChangeText={setTitle} placeholder="Call customer / visit / collect document" />
        <Field label="Note" value={note} onChangeText={setNote} placeholder="Task details" />
        {message ? <Text style={styles.greenText}>{message}</Text> : null}
        <Button icon={ClipboardList} onPress={addTask} style={styles.fullButton}>Add task</Button>
      </View>
      <View style={styles.panel}>
        <Text style={styles.panelTitle}>Task queue</Text>
        <View style={styles.miniList}>
          {portal.tasks.map((task) => (
            <View key={task.id} style={styles.miniItem}>
              <Text style={styles.rowTitle}>{task.title}</Text>
              <Text style={styles.rowText}>{task.status} | {task.note || 'No note'}</Text>
              {task.status === 'open' && (
                <Button icon={CheckCircle2} variant="secondary" onPress={() => complete(task.id)}>Mark done</Button>
              )}
            </View>
          ))}
          {!portal.tasks.length && <Text style={styles.panelText}>No tasks yet.</Text>}
        </View>
      </View>
    </View>
  );
}

function CommissionsTab({ portal }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Commissions</Text>
      <View style={styles.statsGrid}>
        <StatCard label="Paid" value={formatKes(portal.summary.paidCommissions)} />
        <StatCard label="Pending" value={formatKes(portal.summary.pendingCommissions)} />
      </View>
      <MiniList
        emptyText="No commission records found."
        items={portal.commissions.map((commission) => ({
          id: commission.id,
          title: `${commission.customerName || 'Customer'} | ${formatKes(commission.amount)}`,
          text: `${commission.productType} ${commission.productModel || ''} | ${commission.status} | ${commission.earnedAt}`
        }))}
      />
    </View>
  );
}

function AlertsTab({ portal }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Agent notifications</Text>
      <MiniList
        emptyText="No notifications yet."
        items={portal.notifications.map((item) => ({
          id: item.id,
          title: item.title,
          text: `${item.message} | ${item.date}`
        }))}
      />
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
  root: { height: 'var(--app-vh)', width: '100%', backgroundColor: '#f4f8fb', overflowY: 'auto' },
  rootContent: { minHeight: 'var(--app-vh)', padding: 18 },
  workspace: { width: '100%', maxWidth: 1180, marginHorizontal: 'auto', flexDirection: 'row', gap: 16, alignItems: 'stretch' },
  sidebar: { width: 255, borderWidth: 1, borderColor: '#dbe5ef', borderRadius: 8, backgroundColor: '#ffffff', padding: 14, gap: 14, alignSelf: 'flex-start' },
  main: { flex: 1, minWidth: 0, gap: 14 },
  brandRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  brandLogo: { width: 44, height: 44, borderRadius: 8, borderWidth: 1, borderColor: colors.primary },
  brandTitle: { fontSize: 18, fontWeight: '600' },
  brandSubtitle: { color: colors.muted, fontSize: 13 },
  backButton: { alignSelf: 'flex-start', minHeight: 30, flexDirection: 'row', alignItems: 'center', gap: 6, cursor: 'pointer' },
  backText: { color: colors.primary, fontWeight: '500' },
  agentCard: { borderWidth: 1, borderColor: '#dbe5ef', borderRadius: 8, padding: 11, backgroundColor: '#f8fbff', gap: 3 },
  agentName: { color: colors.text, fontWeight: '600' },
  agentMeta: { color: colors.muted, fontSize: 12 },
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
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  field: { gap: 6, flexGrow: 1, flexBasis: 230 },
  label: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  input: { minHeight: 42, borderWidth: 1, borderColor: '#d5e2ef', borderRadius: 8, paddingHorizontal: 12, color: colors.text, backgroundColor: '#ffffff', outlineStyle: 'none' },
  fullButton: { width: '100%' },
  greenText: { color: colors.success, fontWeight: '500', lineHeight: 20 },
  miniList: { gap: 9 },
  miniItem: { borderWidth: 1, borderColor: '#e5edf6', borderRadius: 8, padding: 10, gap: 7 },
  tableList: { gap: 8 },
  tableRow: { minHeight: 70, borderWidth: 1, borderColor: '#e5edf6', borderRadius: 8, padding: 11, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  rowTitle: { color: colors.text, fontWeight: '600' },
  rowText: { color: colors.muted, lineHeight: 20 },
  rowRight: { alignItems: 'flex-end', gap: 4 },
  rowAmount: { color: colors.text, fontWeight: '600', textAlign: 'right' },
  rowStatus: { color: colors.success, fontSize: 12, fontWeight: '600', textAlign: 'right' },
  authRoot: { height: 'var(--app-vh)', width: '100%', backgroundColor: 'var(--app-bg)', overflowY: 'auto' },
  authContent: { minHeight: 'var(--app-vh)', alignItems: 'center', justifyContent: 'center', padding: 14, paddingTop: 34, paddingBottom: 32 },
  authCard: { width: '100%', maxWidth: 500, borderWidth: 1, borderColor: 'var(--app-border)', borderRadius: 10, backgroundColor: 'var(--app-surface)', padding: 16, gap: 14 },
  authLogo: { width: 44, height: 44, borderRadius: 8, borderWidth: 1, borderColor: colors.primary },
  authBrand: { color: colors.text, fontSize: 20, fontWeight: '600' },
  authHeading: { gap: 6 },
  authTitle: { color: colors.text, fontSize: 23, fontWeight: '600' },
  authText: { color: colors.muted, lineHeight: 21 },
  form: { gap: 11 },
  inlineLink: { alignSelf: 'center', minHeight: 32, justifyContent: 'center', cursor: 'pointer' },
  linkText: { color: colors.primary, fontWeight: '500' },
  systemFrame: { height: 'var(--app-vh)', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 20, backgroundColor: '#f4f8fb' },
  stateTitle: { color: colors.text, fontSize: 22, fontWeight: '600', textAlign: 'center' },
  stateText: { color: colors.muted, textAlign: 'center' }
});
