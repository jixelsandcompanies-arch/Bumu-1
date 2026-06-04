import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  Bell,
  Bike,
  Camera,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Home,
  LogIn,
  LogOut,
  Menu,
  RefreshCw,
  X,
  UserPlus,
  UsersRound
} from 'lucide-react';
import { Image, Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Button } from '../components/ui/Button.jsx';
import { FloatingInstallButton } from '../components/ui/FloatingInstallButton.jsx';
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

function mediaName(reference) {
  if (!reference) return '';
  return String(reference).split('/').pop() || 'Captured';
}

function useIsCompactLayout() {
  const [compact, setCompact] = useState(() => window.innerWidth <= 760);

  useEffect(() => {
    function update() {
      setCompact(window.innerWidth <= 760);
    }

    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  return compact;
}

export function AgentPortalScreen({ canInstall = false, onInstall }) {
  const [authenticated, setAuthenticated] = useState(() => agentWorkspaceService.hasSession());
  const [loading, setLoading] = useState(agentWorkspaceService.hasSession());
  const [activeTab, setActiveTab] = useState('dashboard');
  const [portal, setPortal] = useState(emptyPortal);
  const [message, setMessage] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const compactLayout = useIsCompactLayout();

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
    setMenuOpen(false);
  }

  function navigateTab(tab) {
    setActiveTab(tab);
    setMenuOpen(false);
  }

  if (!authenticated) {
    return (
      <>
        <AgentAuthScreen
          message={message}
          onBack={goHome}
          onAuthenticated={() => {
            setAuthenticated(true);
            loadPortal();
          }}
        />
        <FloatingInstallButton visible={canInstall} onPress={onInstall} label="Install BUMU app" />
      </>
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

  const props = { portal, onRefresh: loadPortal, onNavigate: navigateTab };

  return (
    <ScrollView style={styles.root} contentContainerStyle={[styles.rootContent, compactLayout && styles.rootContentCompact]} keyboardShouldPersistTaps="handled" showsVerticalScrollIndicator>
      <View style={[styles.workspace, compactLayout && styles.workspaceCompact]}>
        {compactLayout && menuOpen ? <Pressable style={styles.drawerScrim} onPress={() => setMenuOpen(false)} /> : null}
        <View style={[styles.sidebar, compactLayout && styles.sidebarDrawer, compactLayout && menuOpen && styles.sidebarDrawerOpen]}>
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
            {portal.agent?.profileName && portal.agent.profileName !== portal.agent?.name ? (
              <Text style={styles.agentMeta}>{portal.agent.profileName}</Text>
            ) : null}
            <Text style={styles.agentMeta}>{fallback(portal.agent?.code, 'No agent code')}</Text>
            <Text style={styles.agentMeta}>{fallback(portal.agent?.region, 'No region')}</Text>
          </View>
          <View style={styles.navList}>
            {tabs.map(([key, label, Icon]) => (
              <Pressable
                key={key}
                onPress={() => navigateTab(key)}
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
          {compactLayout ? (
            <View style={styles.mobileTopBar}>
              <Pressable onPress={() => setMenuOpen((current) => !current)} style={styles.menuButton}>
                {menuOpen ? <X size={22} color={colors.primary} /> : <Menu size={22} color={colors.primary} />}
              </Pressable>
              <View style={{ minWidth: 0, flex: 1 }}>
                <Text style={styles.mobileTitle}>Agent portal</Text>
                <Text style={styles.mobileSubtitle}>{tabs.find(([key]) => key === activeTab)?.[1]}</Text>
              </View>
            </View>
          ) : null}
          <View style={styles.pageHeader}>
            <View style={{ minWidth: 0 }}>
              <Text style={styles.kicker}>Agent workspace</Text>
              <Text style={styles.pageTitle}>Bumu Paygo</Text>
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
      <FloatingInstallButton visible={canInstall} onPress={onInstall} label="Install BUMU app" />
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
  const [resetOtp, setResetOtp] = useState('');
  const [resetNewPassword, setResetNewPassword] = useState('');
  const [resetConfirmPassword, setResetConfirmPassword] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [notice, setNotice] = useState(message || '');
  const [submitting, setSubmitting] = useState(false);

  async function login() {
    setNotice('');
    if (!email.trim() || !password) {
      setNotice('Enter your agent email and password.');
      return;
    }

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
    if (!fullName.trim() || !email.trim() || !phone.trim() || !password) {
      setNotice('Enter your name, email, phone number, and password.');
      return;
    }

    setSubmitting(true);
    try {
      await agentWorkspaceService.register({ fullName, nationalId, phone, region, email, password });
      setNotice('Agent account submitted. Admin must approve it before you can sign in. You will receive an SMS after approval.');
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
      await agentWorkspaceService.requestPasswordReset({ email: email.trim(), phone: phone.trim() });
      setOtpSent(true);
      setNotice(`OTP sent to ${email.trim()}. If it does not arrive, go back and resend it.`);
    } catch (error) {
      setNotice(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function changePassword() {
    setNotice('');
    if (!/^\d{6}$/.test(resetOtp.trim())) {
      setNotice('Enter the 6-digit OTP.');
      return;
    }
    if (!resetNewPassword || resetNewPassword !== resetConfirmPassword) {
      setNotice('Password and confirmation must match.');
      return;
    }

    setSubmitting(true);
    try {
      await agentWorkspaceService.verifyPasswordResetOtp({ email: email.trim(), otp: resetOtp.trim() });
      await agentWorkspaceService.resetPassword({
        email: email.trim(),
        otp: resetOtp.trim(),
        password: resetNewPassword
      });
      setPassword('');
      setResetOtp('');
      setResetNewPassword('');
      setResetConfirmPassword('');
      setOtpSent(false);
      setNotice('Password changed. Sign in with your new password.');
      setMode('login');
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
          <Text style={styles.authTitle}>
            {mode === 'login' ? 'Agent sign in' : mode === 'register' ? 'Create agent account' : 'Password help'}
          </Text>
          <Text style={styles.authText}>
            {mode === 'login'
              ? 'Use your approved agent email.'
              : mode === 'register'
                ? 'Create an agent profile linked to Supabase Auth and the shared CRM.'
                : 'Enter your email, verify the OTP, and change your password.'}
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
          {mode === 'login' ? (
            <Field label="Password" value={password} onChangeText={setPassword} placeholder="Password" secureTextEntry />
          ) : mode === 'reset' ? (
            <>
              {!otpSent ? (
                <Field label="Phone number" value={phone} onChangeText={setPhone} placeholder="Enter phone number" />
              ) : (
                <>
                  <Field label="OTP" value={resetOtp} onChangeText={setResetOtp} placeholder="Enter 6-digit OTP" />
                  <Field label="New password" value={resetNewPassword} onChangeText={setResetNewPassword} placeholder="At least 10 characters" secureTextEntry />
                  <Field label="Confirm password" value={resetConfirmPassword} onChangeText={setResetConfirmPassword} placeholder="Repeat password" secureTextEntry />
                  <Text style={styles.greenText}>Password must include uppercase, lowercase, number, and special character.</Text>
                </>
              )}
            </>
          ) : (
            <Field label="Password" value={password} onChangeText={setPassword} placeholder="At least 10 characters" secureTextEntry />
          )}
          {notice ? <Text style={styles.greenText}>{notice}</Text> : null}
          {mode === 'login' ? (
            <Button icon={LogIn} onPress={login} disabled={submitting} style={styles.fullButton}>
              {submitting ? 'Signing in...' : 'Sign in'}
            </Button>
          ) : mode === 'reset' ? (
            <Button icon={Bell} onPress={otpSent ? changePassword : requestReset} disabled={submitting} style={styles.fullButton}>
              {submitting ? 'Working...' : otpSent ? 'Change password' : 'Send OTP'}
            </Button>
          ) : (
            <Button icon={UserPlus} onPress={register} disabled={submitting} style={styles.fullButton}>
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
  const steps = ['Customer', 'Customer documents', 'Next of kin', 'Kin documents', 'Product'];
  const [step, setStep] = useState(0);
  const [pendingCustomerId, setPendingCustomerId] = useState('');
  const [nextOfKinOtp, setNextOfKinOtp] = useState('');
  const [form, setForm] = useState({
    customerName: '',
    customerPhone: '',
    nationalId: '',
    email: '',
    dateOfBirth: '',
    gender: '',
    location: '',
    occupation: '',
    passportPhotoUrl: '',
    idFrontUrl: '',
    idBackUrl: '',
    productType: 'bike',
    productModel: '',
    serialNumber: '',
    chassisNumber: '',
    nextOfKinName: '',
    nextOfKinPhone: '',
    nextOfKinRelationship: '',
    nextOfKinNationalId: '',
    nextOfKinGender: '',
    nextOfKinLocation: '',
    nextOfKinOccupation: '',
    nextOfKinPassportPhotoUrl: '',
    nextOfKinIdFrontUrl: '',
    nextOfKinIdBackUrl: '',
    totalPayable: '',
    depositAmount: '',
    dailyInstallment: '',
    dueDate: ''
  });
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  function update(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function resetForm() {
    setForm((current) => Object.fromEntries(Object.keys(current).map((key) => [key, key === 'productType' ? 'bike' : ''])));
    setStep(0);
  }

  async function submit() {
    setMessage('');
    setSubmitting(true);
    try {
      const result = await agentWorkspaceService.createCustomer(form);
      const promptStatus = result.paymentRequest?.status;
      const promptMessage = promptStatus === 'failed'
        ? 'Deposit request was saved but the M-Pesa prompt failed. Check payment provider settings.'
        : promptStatus === 'queued'
          ? 'Deposit request was queued. Configure payment provider settings to send the M-Pesa PIN prompt.'
          : 'Customer M-Pesa PIN prompt was sent for the deposit.';
      if (result.nextOfKinOtpRequired && result.customer?.id) {
        setPendingCustomerId(result.customer.id);
        setMessage(`Next-of-kin OTP was sent. ${promptMessage} Enter the OTP to start automatic screening and customer activation.`);
        return;
      }

      setMessage(`Customer application submitted. ${promptMessage}`);
      resetForm();
      await onRefresh();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  async function verifyNextOfKin() {
    setMessage('');
    setSubmitting(true);
    try {
      await agentWorkspaceService.verifyNextOfKinOtp(pendingCustomerId, nextOfKinOtp.trim());
      setMessage('Next-of-kin accepted. Automatic screening completed and the customer activation OTP was sent.');
      setPendingCustomerId('');
      setNextOfKinOtp('');
      resetForm();
      await onRefresh();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (pendingCustomerId) {
    return (
      <View style={styles.panel}>
        <View style={styles.panelHeader}>
          <Bell size={22} color={colors.success} />
          <View>
            <Text style={styles.panelTitle}>Next-of-kin acceptance</Text>
            <Text style={styles.panelText}>Enter the OTP sent to the next-of-kin phone to run automatic screening and send the customer activation OTP.</Text>
          </View>
        </View>
        <Field label="Next-of-kin OTP" value={nextOfKinOtp} onChangeText={setNextOfKinOtp} placeholder="Enter 6-digit OTP" />
        {message ? <Text style={styles.greenText}>{message}</Text> : null}
        <Button icon={CheckCircle2} onPress={verifyNextOfKin} disabled={submitting} style={styles.fullButton}>
          {submitting ? 'Verifying...' : 'Verify and submit'}
        </Button>
      </View>
    );
  }

  return (
    <View style={styles.panel}>
      <View style={styles.panelHeader}>
        <Bike size={22} color={colors.primary} />
        <View>
          <Text style={styles.panelTitle}>Register customer and product</Text>
          <Text style={styles.panelText}>Capture KYC, customer documents, next-of-kin acceptance, and PAYGO product details.</Text>
        </View>
      </View>
      <View style={styles.stepRow}>
        {steps.map((label, index) => (
          <Pressable key={label} onPress={() => setStep(index)} style={[styles.stepPill, step === index && styles.stepPillActive]}>
            <Text style={[styles.stepPillText, step === index && styles.stepPillTextActive]}>{label}</Text>
          </Pressable>
        ))}
      </View>
      <View style={styles.formGrid}>
        {step === 0 && (
          <>
            <Field fieldStyle={styles.gridField} label="Customer name" value={form.customerName} onChangeText={(value) => update('customerName', value)} placeholder="Full name" />
            <Field fieldStyle={styles.gridField} label="Phone number" value={form.customerPhone} onChangeText={(value) => update('customerPhone', value)} placeholder="Customer phone" />
            <Field fieldStyle={styles.gridField} label="National ID" value={form.nationalId} onChangeText={(value) => update('nationalId', value)} placeholder="National ID" />
            <Field fieldStyle={styles.gridField} label="Email" value={form.email} onChangeText={(value) => update('email', value)} placeholder="Customer email" />
            <Field fieldStyle={styles.gridField} label="Date of birth" value={form.dateOfBirth} onChangeText={(value) => update('dateOfBirth', value)} placeholder="YYYY-MM-DD" />
            <Field fieldStyle={styles.gridField} label="Gender" value={form.gender} onChangeText={(value) => update('gender', value)} placeholder="Gender" />
            <Field fieldStyle={styles.gridField} label="Location" value={form.location} onChangeText={(value) => update('location', value)} placeholder="Customer location" />
            <Field fieldStyle={styles.gridField} label="Occupation" value={form.occupation} onChangeText={(value) => update('occupation', value)} placeholder="Occupation" />
          </>
        )}
        {step === 1 && (
          <>
            <MediaCapture field="passportPhotoUrl" label="Open camera for customer passport photo" value={form.passportPhotoUrl} onUploaded={(value) => update('passportPhotoUrl', value)} />
            <MediaCapture field="idFrontUrl" label="Scan customer ID/passport front" value={form.idFrontUrl} onUploaded={(value) => update('idFrontUrl', value)} />
            <MediaCapture field="idBackUrl" label="Scan customer ID/passport back" value={form.idBackUrl} onUploaded={(value) => update('idBackUrl', value)} />
          </>
        )}
        {step === 2 && (
          <>
            <Field fieldStyle={styles.gridField} label="Next of kin name" value={form.nextOfKinName} onChangeText={(value) => update('nextOfKinName', value)} placeholder="Next of kin" />
            <Field fieldStyle={styles.gridField} label="Next of kin phone" value={form.nextOfKinPhone} onChangeText={(value) => update('nextOfKinPhone', value)} placeholder="Phone number" />
            <Field fieldStyle={styles.gridField} label="Next of kin relationship" value={form.nextOfKinRelationship} onChangeText={(value) => update('nextOfKinRelationship', value)} placeholder="Relationship" />
            <Field fieldStyle={styles.gridField} label="Next of kin national ID" value={form.nextOfKinNationalId} onChangeText={(value) => update('nextOfKinNationalId', value)} placeholder="National ID or passport number" />
            <Field fieldStyle={styles.gridField} label="Next of kin gender" value={form.nextOfKinGender} onChangeText={(value) => update('nextOfKinGender', value)} placeholder="Gender" />
            <Field fieldStyle={styles.gridField} label="Next of kin location" value={form.nextOfKinLocation} onChangeText={(value) => update('nextOfKinLocation', value)} placeholder="Location" />
            <Field fieldStyle={styles.gridField} label="Next of kin occupation" value={form.nextOfKinOccupation} onChangeText={(value) => update('nextOfKinOccupation', value)} placeholder="Occupation" />
          </>
        )}
        {step === 3 && (
          <>
            <MediaCapture field="nextOfKinPassportPhotoUrl" label="Open camera for next-of-kin passport/copy photo" value={form.nextOfKinPassportPhotoUrl} onUploaded={(value) => update('nextOfKinPassportPhotoUrl', value)} />
            <MediaCapture field="nextOfKinIdFrontUrl" label="Scan next-of-kin ID/passport front" value={form.nextOfKinIdFrontUrl} onUploaded={(value) => update('nextOfKinIdFrontUrl', value)} />
            <MediaCapture field="nextOfKinIdBackUrl" label="Scan next-of-kin ID/passport back" value={form.nextOfKinIdBackUrl} onUploaded={(value) => update('nextOfKinIdBackUrl', value)} />
          </>
        )}
        {step === 4 && (
          <>
            <Field fieldStyle={styles.gridField} label="Product type" value={form.productType} onChangeText={(value) => update('productType', value)} placeholder="bike, phone, cooker, solar" />
            <Field fieldStyle={styles.gridField} label="Product model" value={form.productModel} onChangeText={(value) => update('productModel', value)} placeholder="Model name" />
            <Field fieldStyle={styles.gridField} label="Serial number" value={form.serialNumber} onChangeText={(value) => update('serialNumber', value)} placeholder="Serial number" />
            <Field fieldStyle={styles.gridField} label="Chassis number" value={form.chassisNumber} onChangeText={(value) => update('chassisNumber', value)} placeholder="For bikes" />
            <Field fieldStyle={styles.gridField} label="Total payable" value={form.totalPayable} onChangeText={(value) => update('totalPayable', value)} placeholder="Amount" />
            <Field fieldStyle={styles.gridField} label="Deposit amount to prompt" value={form.depositAmount} onChangeText={(value) => update('depositAmount', value)} placeholder="Customer deposit amount" />
            <Field fieldStyle={styles.gridField} label="Daily installment" value={form.dailyInstallment} onChangeText={(value) => update('dailyInstallment', value)} placeholder="Daily amount" />
            <Field fieldStyle={styles.gridField} label="Due date" value={form.dueDate} onChangeText={(value) => update('dueDate', value)} placeholder="YYYY-MM-DD" />
          </>
        )}
      </View>
      {message ? <Text style={styles.greenText}>{message}</Text> : null}
      <View style={styles.stepActions}>
        {step > 0 && <Button variant="secondary" onPress={() => setStep((current) => current - 1)}>Back</Button>}
        {step < steps.length - 1 ? (
          <Button onPress={() => setStep((current) => current + 1)}>Continue</Button>
        ) : (
          <Button icon={UserPlus} onPress={submit} disabled={submitting} style={styles.fullButton}>
            {submitting ? 'Saving...' : 'Save and send OTP'}
          </Button>
        )}
      </View>
    </View>
  );
}

function MediaCapture({ field, label, value, onUploaded }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [uploading, setUploading] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraReady, setCameraReady] = useState(false);
  const [cameraVersion, setCameraVersion] = useState(0);
  const [message, setMessage] = useState('');

  function stopCamera() {
    streamRef.current?.getTracks?.().forEach((track) => track.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setCameraReady(false);
  }

  useEffect(() => () => stopCamera(), []);

  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!cameraOpen || !video || !stream) return undefined;

    let cancelled = false;
    video.srcObject = stream;
    video.muted = true;
    video.playsInline = true;

    const markReady = () => {
      if (!cancelled) setCameraReady(true);
    };

    video.addEventListener('loadedmetadata', markReady);
    video.addEventListener('playing', markReady);
    video.play?.().then(markReady).catch(() => {
      if (!cancelled) setMessage('Tap the camera preview, then allow camera playback.');
    });

    return () => {
      cancelled = true;
      video.removeEventListener('loadedmetadata', markReady);
      video.removeEventListener('playing', markReady);
    };
  }, [cameraOpen, cameraVersion]);

  async function openCamera() {
    setMessage('');
    if (!navigator.mediaDevices?.getUserMedia) {
      setMessage('Camera capture is not supported by this browser. Use Chrome, Edge, or Safari on HTTPS.');
      return;
    }

    try {
      stopCamera();
      setCameraReady(false);
      let stream;
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1280 },
            height: { ideal: 960 }
          }
        });
      } catch {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            width: { ideal: 1280 },
            height: { ideal: 960 }
          }
        });
      }
      streamRef.current = stream;
      setCameraOpen(true);
      setCameraVersion((current) => current + 1);
    } catch {
      setMessage('Camera permission is required to capture this document.');
    }
  }

  async function capturePhoto() {
    setMessage('');
    const video = videoRef.current;
    if (!video?.videoWidth || !video?.videoHeight) {
      setMessage('Camera is still loading. Try again.');
      return;
    }

    const canvas = document.createElement('canvas');
    const maxWidth = 1280;
    const scale = Math.min(1, maxWidth / video.videoWidth);
    canvas.width = Math.round(video.videoWidth * scale);
    canvas.height = Math.round(video.videoHeight * scale);
    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.82);

    setUploading(true);
    try {
      const result = await agentWorkspaceService.uploadCustomerMedia({
        field,
        fileName: `${field}-${Date.now()}.jpg`,
        mimeType: 'image/jpeg',
        dataUrl
      });
      onUploaded(result.reference);
      setMessage('Captured and uploaded.');
      setCameraOpen(false);
      stopCamera();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setUploading(false);
    }
  }

  return (
    <View style={styles.mediaField}>
      <Text style={styles.label}>{label}</Text>
      <View style={styles.mediaBox}>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Text style={value ? styles.mediaName : styles.mediaPlaceholder}>
            {value ? mediaName(value) : 'No image captured'}
          </Text>
          {message ? <Text style={styles.greenText}>{message}</Text> : null}
        </View>
        <Button icon={Camera} variant="secondary" onPress={openCamera} disabled={uploading}>
          {uploading ? 'Uploading...' : value ? 'Retake' : 'Open camera'}
        </Button>
      </View>
      {cameraOpen && (
        <View style={styles.cameraPanel}>
          <View style={styles.cameraPreviewWrap}>
            <video ref={videoRef} playsInline muted autoPlay style={styles.cameraPreview} />
            {!cameraReady ? <Text style={styles.cameraLoading}>Starting camera...</Text> : null}
          </View>
          <View style={styles.cameraActions}>
            <Button icon={Camera} onPress={capturePhoto} disabled={uploading}>
              {uploading ? 'Uploading...' : 'Capture document'}
            </Button>
            <Button variant="secondary" onPress={() => { setCameraOpen(false); stopCamera(); }} disabled={uploading}>
              Cancel
            </Button>
          </View>
        </View>
      )}
    </View>
  );
}

function CustomersTab({ portal, onRefresh }) {
  const [activeCustomerId, setActiveCustomerId] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositPhone, setDepositPhone] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  function openPrompt(customer) {
    const nextId = activeCustomerId === customer.id ? '' : customer.id;
    setActiveCustomerId(nextId);
    setDepositAmount('');
    setDepositPhone(nextId ? customer.phone || '' : '');
    setMessage('');
  }

  async function requestDeposit(customer) {
    setMessage('');
    setSubmitting(true);
    try {
      await agentWorkspaceService.requestCustomerDeposit(customer.id, {
        amount: depositAmount,
        phone: depositPhone || customer.phone
      });
      setMessage('Deposit prompt sent to customer phone.');
      setActiveCustomerId('');
      setDepositAmount('');
      setDepositPhone('');
      await onRefresh();
    } catch (error) {
      setMessage(error.message);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>Assigned customers</Text>
      {message ? <Text style={styles.greenText}>{message}</Text> : null}
      <View style={styles.tableList}>
        {portal.customers.map((customer) => (
          <View key={customer.id} style={styles.customerCard}>
            <View style={styles.tableRow}>
              <View style={{ flex: 1, minWidth: 0 }}>
                <Text style={styles.rowTitle}>{customer.name}</Text>
                <Text style={styles.rowText}>{customer.phone} | {customer.productType} | {fallback(customer.productModel)}</Text>
                <Text style={styles.rowText}>Serial {fallback(customer.serialNumber)} | Chassis {fallback(customer.chassisNumber)}</Text>
              </View>
              <View style={styles.rowRight}>
                <Text style={styles.rowAmount}>{formatKes(customer.balance)}</Text>
                <Text style={styles.rowStatus}>{customer.status}</Text>
                <Button icon={CreditCard} variant="secondary" onPress={() => openPrompt(customer)}>
                  Prompt deposit
                </Button>
              </View>
            </View>
            {activeCustomerId === customer.id && (
              <View style={styles.depositBox}>
                <Field fieldStyle={styles.gridField} label="Deposit amount" value={depositAmount} onChangeText={setDepositAmount} placeholder="KES amount" />
                <Field fieldStyle={styles.gridField} label="Customer M-Pesa phone" value={depositPhone} onChangeText={setDepositPhone} placeholder="+254..." />
                <Button icon={CreditCard} onPress={() => requestDeposit(customer)} disabled={submitting} style={styles.depositButton}>
                  {submitting ? 'Sending...' : 'Send deposit prompt'}
                </Button>
              </View>
            )}
          </View>
        ))}
        {!portal.customers.length && (
          <View style={styles.emptyState}>
            <Text style={styles.panelText}>No assigned customers found.</Text>
          </View>
        )}
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
  rootContentCompact: { padding: 10, paddingBottom: 28 },
  workspace: { width: '100%', maxWidth: 1180, marginHorizontal: 'auto', flexDirection: 'row', gap: 16, alignItems: 'stretch' },
  workspaceCompact: { maxWidth: '100%', flexDirection: 'column', gap: 10 },
  sidebar: { width: 255, borderWidth: 1, borderColor: '#dbe5ef', borderRadius: 8, backgroundColor: '#ffffff', padding: 14, gap: 14, alignSelf: 'flex-start' },
  sidebarDrawer: {
    position: 'fixed',
    top: 0,
    bottom: 0,
    left: -285,
    zIndex: 30,
    width: 275,
    maxWidth: '86vw',
    height: '100dvh',
    borderRadius: 0,
    borderTopWidth: 0,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
    overflowY: 'auto',
    transitionProperty: 'left',
    transitionDuration: '180ms'
  },
  sidebarDrawerOpen: { left: 0 },
  drawerScrim: {
    position: 'fixed',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    zIndex: 20,
    backgroundColor: 'rgba(15, 23, 42, 0.42)'
  },
  main: { flex: 1, minWidth: 0, gap: 14 },
  mobileTopBar: {
    minHeight: 54,
    borderWidth: 1,
    borderColor: '#dbe5ef',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    padding: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10
  },
  menuButton: {
    width: 40,
    height: 40,
    borderWidth: 1,
    borderColor: '#dbe5ef',
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.primarySoft,
    cursor: 'pointer'
  },
  mobileTitle: { color: colors.text, fontSize: 16, fontWeight: '600' },
  mobileSubtitle: { color: colors.muted, fontSize: 12 },
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
  stepRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  stepPill: { minHeight: 34, borderWidth: 1, borderColor: '#dbe5ef', borderRadius: 8, paddingHorizontal: 10, alignItems: 'center', justifyContent: 'center', backgroundColor: '#ffffff', cursor: 'pointer' },
  stepPillActive: { borderColor: colors.primary, backgroundColor: colors.primarySoft },
  stepPillText: { color: colors.slate, fontSize: 12, fontWeight: '600' },
  stepPillTextActive: { color: colors.primary },
  formGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  field: { gap: 6, width: '100%' },
  gridField: { flexGrow: 1, flexBasis: 230, width: 'auto' },
  mediaField: { flexGrow: 1, flexBasis: 230, width: 'auto', gap: 6 },
  mediaBox: { minHeight: 48, borderWidth: 1, borderColor: '#d5e2ef', borderRadius: 8, padding: 8, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 10, backgroundColor: '#ffffff' },
  cameraPanel: { borderWidth: 1, borderColor: '#d5e2ef', borderRadius: 8, padding: 8, gap: 8, backgroundColor: '#f8fbff' },
  cameraPreviewWrap: { position: 'relative', width: '100%', minHeight: 220, aspectRatio: '4 / 3', maxHeight: 360, borderRadius: 8, overflow: 'hidden', backgroundColor: '#0f172a' },
  cameraPreview: { width: '100%', height: '100%', objectFit: 'cover', backgroundColor: '#0f172a', display: 'block' },
  cameraLoading: { position: 'absolute', left: 0, right: 0, top: '45%', textAlign: 'center', color: '#ffffff', fontWeight: '600' },
  cameraActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, justifyContent: 'flex-end' },
  mediaName: { color: colors.text, fontSize: 13, fontWeight: '600' },
  mediaPlaceholder: { color: colors.muted, fontSize: 13 },
  label: { color: colors.muted, fontSize: 12, fontWeight: '600' },
  input: { minHeight: 40, borderWidth: 1, borderColor: '#d5e2ef', borderRadius: 8, paddingHorizontal: 12, color: colors.text, backgroundColor: '#ffffff', outlineStyle: 'none' },
  fullButton: { width: '100%' },
  stepActions: { flexDirection: 'row', flexWrap: 'wrap', gap: 10, justifyContent: 'flex-end', alignItems: 'center' },
  greenText: { color: colors.success, fontWeight: '500', lineHeight: 20 },
  miniList: { gap: 9 },
  miniItem: { borderWidth: 1, borderColor: '#e5edf6', borderRadius: 8, padding: 10, gap: 7 },
  tableList: { gap: 8 },
  customerCard: { borderWidth: 1, borderColor: '#e5edf6', borderRadius: 8, backgroundColor: '#ffffff', overflow: 'hidden' },
  tableRow: { minHeight: 70, padding: 11, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between', gap: 12 },
  depositBox: { borderTopWidth: 1, borderTopColor: '#e5edf6', padding: 11, flexDirection: 'row', flexWrap: 'wrap', alignItems: 'flex-end', gap: 10, backgroundColor: '#f8fbff' },
  depositButton: { flexGrow: 1, flexBasis: 210 },
  emptyState: { borderWidth: 1, borderColor: '#e5edf6', borderRadius: 8, padding: 12, backgroundColor: '#ffffff' },
  rowTitle: { color: colors.text, fontWeight: '600' },
  rowText: { color: colors.muted, lineHeight: 20 },
  rowRight: { alignItems: 'flex-end', gap: 4, flexGrow: 1 },
  rowAmount: { color: colors.text, fontWeight: '600', textAlign: 'right' },
  rowStatus: { color: colors.success, fontSize: 12, fontWeight: '600', textAlign: 'right' },
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
  authLinksRow: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' },
  linkText: { color: colors.primary, fontWeight: '500' },
  systemFrame: { height: 'var(--app-vh)', alignItems: 'center', justifyContent: 'center', gap: 10, padding: 20, backgroundColor: '#f4f8fb' },
  stateTitle: { color: colors.text, fontSize: 22, fontWeight: '600', textAlign: 'center' },
  stateText: { color: colors.muted, textAlign: 'center' }
});
