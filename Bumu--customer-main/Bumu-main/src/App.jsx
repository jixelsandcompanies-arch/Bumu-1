import React, { useEffect, useState, useMemo } from 'react';
import { SafeAreaView, ScrollView, View, Text, TextInput, TouchableOpacity, StyleSheet, useWindowDimensions, Image } from 'react-native';
import Auth from './features/auth/Auth';
import Dashboard from './features/dashboard/Dashboard';
import RegisterRider from './features/register/RegisterRider';
import Customers from './features/customers/Customers';
import Commissions from './features/commissions/Commissions';
import Screening from './features/screening/Screening';
import Notifications from './features/notifications/Notifications';
import Profile from './features/profile/Profile';
import Settings from './features/settings/Settings';
import '../bumu.css';

const routes = [
  { id: 'dashboard', screen: 'dashboard', label: 'Dashboard', detail: 'Targets, follow-ups, alerts, and urgent rider actions' },
  { id: 'register', screen: 'register', label: 'Register Rider', detail: 'Create a clean rider contract with duplicate protection' },
  { id: 'riders', screen: 'customers', label: 'Riders', detail: 'Portfolio, identity checks, documents, and evidence history' },
  { id: 'commissions', screen: 'commissions', label: 'Commissions', detail: 'Commission estimates, finance ledger, and CSV export' },
  { id: 'screening', screen: 'screening', label: 'Screening', detail: 'Back-office queue approval, rejection, and info requests' },
  { id: 'notifications', screen: 'notifications', label: 'Notifications', detail: 'Document updates, rider alerts, and unread notices' },
  { id: 'settings', screen: 'settings', label: 'Settings', detail: 'Defaults, password, theme, and app preferences' },
  { id: 'account', screen: 'profile', label: 'Account', detail: 'Agent profile, identity, approval status, and sign out' },
];

const featureMenus = {
  dashboard: [
    { label: 'Start with priorities', detail: 'Review targets, high-risk riders, and open follow-up tasks.' },
    { label: 'Check collection progress', detail: 'Compare portfolio value, paid amount, remaining debt, and region progress.' },
    { label: 'Work the task queue', detail: 'Open each follow-up, finish the call or visit, then mark it done.' },
    { label: 'Review recent activity', detail: 'Use alerts and activity history to see what changed today.' },
  ],
  register: [
    { label: 'Search identity first', detail: 'Enter National ID, phone, or chassis to catch duplicate contracts.' },
    { label: 'Capture rider profile', detail: 'Record legal name, ID, phone, gender, and location.' },
    { label: 'Attach documents', detail: 'Capture passport, ID front, and ID back references for the rider file.' },
    { label: 'Assign bike and payment plan', detail: 'Add bike model, chassis, deposit, and installment plan.' },
    { label: 'Review and submit', detail: 'Check the full application, then create the rider contract.' },
  ],
  riders: [
    { label: 'Find rider fast', detail: 'Search by name, phone, National ID, card ID, person ID, or contract ID.' },
    { label: 'Open rider summary', detail: 'Check rider identity, agent assignment, balance status, and risk score.' },
    { label: 'Verify evidence', detail: 'Record visit proof, ID scan, chassis check, promise to pay, and evidence logs.' },
    { label: 'Export portfolio', detail: 'Download rider records when reporting is needed.' },
  ],
  commissions: [
    { label: 'Read totals', detail: 'Compare finance ledger totals with estimated commission.' },
    { label: 'Review ledger', detail: 'Check paid, pending, and cancelled commission records.' },
    { label: 'Export report', detail: 'Download commission estimate or finance ledger CSV.' },
  ],
  screening: [
    { label: 'Open queue', detail: 'Review pending applications submitted by agents.' },
    { label: 'Approve application', detail: 'Approve a complete rider application and activate the account.' },
    { label: 'Reject or request info', detail: 'Send a rejection or ask the agent for missing details.' },
  ],
  notifications: [
    { label: 'Open unread first', detail: 'Start from new alerts so rider and document issues are not missed.' },
    { label: 'Check rider reminders', detail: 'Use reminders to decide who needs a call, visit, or follow-up.' },
    { label: 'Review document updates', detail: 'Confirm rider files that changed or need another check.' },
    { label: 'Clear handled alerts', detail: 'Mark all read after the work is checked.' },
  ],
  account: [
    { label: 'Confirm agent identity', detail: 'Check name, unique agent code, phone, email, and region.' },
    { label: 'Update profile', detail: 'Edit agent information without changing rider contracts.' },
    { label: 'Sign out safely', detail: 'Leave the portal when work is done.' },
  ],
  settings: [
    { label: 'Set agent defaults', detail: 'Control default region, bike model, installment plan, and notification behavior.' },
    { label: 'Change password', detail: 'Replace the current login password.' },
  ],
};

const STORAGE_PREFIX = 'bumu-live-v1';

const storageKey = (key) => `${STORAGE_PREFIX}-${key}`;

const loadState = (key, defaultValue) => {
  if (typeof window === 'undefined') return defaultValue;
  try {
    const raw = window.localStorage.getItem(storageKey(key));
    return raw ? JSON.parse(raw) : defaultValue;
  } catch {
    return defaultValue;
  }
};

const saveState = (key, value) => {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(storageKey(key), JSON.stringify(value));
  } catch {
    // Ignore storage errors in private mode.
  }
};

const checksum = (value) => {
  let hash = 0;
  String(value).split('').forEach((char) => {
    hash = (hash * 31 + char.charCodeAt(0)) % 99991;
  });
  return String(hash).padStart(5, '0');
};

const compactDate = (date = new Date()) => date.toISOString().slice(2, 10).replace(/-/g, '');

const generateAgentCode = (seed = {}) => {
  const base = `${seed.email || ''}:${seed.phone || ''}:${Date.now()}:${Math.random()}`;
  return `AG-KE-${compactDate()}-${checksum(base)}`;
};

const generateRiderCardId = (agentCode, seed, existing = []) => {
  let attempt = 0;
  let cardId = '';
  do {
    const base = `${agentCode}:${seed}:${Date.now()}:${Math.random()}:${attempt}`;
    cardId = `RDR-${agentCode || 'AG'}-${checksum(base)}`;
    attempt += 1;
  } while (existing.some((customer) => customer.cardId === cardId));
  return cardId;
};

const generateRiderPersonId = (seed = {}) => {
  const stableSeed = `${seed.nationalId || ''}:${normalizePhone(seed.phone || '')}`;
  return `RID-KE-${checksum(stableSeed || `${Date.now()}:${Math.random()}`)}`;
};

const generateContractId = (agentCode, seed, existing = []) => {
  let attempt = 0;
  let contractId = '';
  do {
    const base = `${agentCode}:${seed}:${Date.now()}:${Math.random()}:${attempt}`;
    contractId = `CTR-${agentCode || 'AG'}-${checksum(base)}`;
    attempt += 1;
  } while (existing.some((customer) => customer.contractId === contractId));
  return contractId;
};

const normalizePhone = (value) => String(value || '').replace(/[\s-]/g, '');

const accountStatus = (customer) => {
  const remaining = Number(customer.remaining || 0);
  if (remaining <= 0) return 'Cleared';
  if (customer.overdue) return `Debt overdue: KES ${remaining.toLocaleString('en-KE')}`;
  return `Debt active: KES ${remaining.toLocaleString('en-KE')}`;
};

const initialCustomers = [];
const initialCommissions = [];
const initialNotifications = [];
const initialTasks = [];

const defaultAgent = {
  fullName: '',
  agentCode: '',
  phone: '',
  email: '',
  region: '',
  password: '',
  agentPhoto: '',
  agentIdFront: '',
  agentIdBack: '',
  approvalStatus: 'Approved',
  profileApprovalStatus: 'Approved',
  pendingProfileUpdate: null,
};

export default function App() {
  const [loggedIn, setLoggedIn] = useState(false);
  const [route, setRoute] = useState('dashboard');
  const [navMenuOpen, setNavMenuOpen] = useState(true);
  const [commandQuery, setCommandQuery] = useState('');
  const [commandRiderId, setCommandRiderId] = useState(null);
  const [theme, setTheme] = useState('light');
  const [agent, setAgent] = useState(() => loadState('agent', defaultAgent));
  const [passwordMessage, setPasswordMessage] = useState('');
  const [customers, setCustomers] = useState(() => loadState('customers', initialCustomers));
  const [commissions, setCommissions] = useState(() => loadState('commissions', initialCommissions));
  const [notifications, setNotifications] = useState(() => loadState('notifications', initialNotifications));
  const [tasks, setTasks] = useState(() => loadState('tasks', initialTasks));
  const [deferredInstallPrompt, setDeferredInstallPrompt] = useState(null);
  const [installStatus, setInstallStatus] = useState('');
  const [appInstalled, setAppInstalled] = useState(() => loadState('app-installed', false));
  const [security, setSecurity] = useState(() => loadState('security', {
    locked: false,
    pin: '',
    unlockPin: '',
    privacyMode: false,
    auditLog: [],
    failedUnlocks: 0,
  }));
  const [settings, setSettings] = useState(() => loadState('settings', {
    smsNotifications: true,
    inAppNotifications: true,
    paymentReminders: true,
    smsAlerts: true,
    simpleMode: false,
    compactTables: false,
    defaultBikeModel: 'Boxer 150',
    defaultInstallment: 'Daily KES 300',
    defaultRegion: 'Nairobi',
    sessionTimeout: '30 minutes',
  }));

  const windowWidth = useWindowDimensions().width;
  const isDesktop = windowWidth >= 900;
  const isCompact = windowWidth < 720;
  const styles = useMemo(() => createStyles(theme, isDesktop, isCompact), [theme, isDesktop, isCompact]);

  useEffect(() => {
    if (typeof document !== 'undefined') {
      document.body.classList.toggle('dark-mode', theme === 'dark');
    }
  }, [theme]);

  useEffect(() => {
    if (typeof window === 'undefined') return undefined;
    const onBeforeInstallPrompt = (event) => {
      event.preventDefault();
      setDeferredInstallPrompt(event);
      setInstallStatus('Ready to install on this device.');
    };
    const onAppInstalled = () => {
      setDeferredInstallPrompt(null);
      setAppInstalled(true);
      saveState('app-installed', true);
      setInstallStatus('BUMU Agent Portal is installed on this device.');
    };
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  useEffect(() => saveState('theme', theme), [theme]);
  useEffect(() => saveState('agent', agent), [agent]);
  useEffect(() => saveState('customers', customers), [customers]);
  useEffect(() => saveState('commissions', commissions), [commissions]);
  useEffect(() => saveState('notifications', notifications), [notifications]);
  useEffect(() => saveState('tasks', tasks), [tasks]);
  useEffect(() => saveState('settings', settings), [settings]);
  useEffect(() => saveState('security', security), [security]);

  useEffect(() => {
    setCustomers((current) => current.map((c, index) => {
      const assignedAgentCode = c.assignedAgentCode || c.agentCode || agent.agentCode;
      const cardId = c.cardId || generateRiderCardId(assignedAgentCode, `${c.nationalId || c.phone || index}`, current);
      const riderAssignmentId = c.riderAssignmentId || `ASN-${assignedAgentCode}-${checksum(`${cardId}:${c.id}`)}`;
      const riderPersonId = c.riderPersonId || generateRiderPersonId(c);
      const contractId = c.contractId || generateContractId(assignedAgentCode, `${cardId}:${c.id}`, current);
      const risk = computeRisk(c);
      const verifiedByDefault = c.status === 'Active' && risk < 60 && !c.flagged;
      const verificationChecklist = {
        idSeen: verifiedByDefault,
        chassisConfirmed: verifiedByDefault,
        passportPhoto: verifiedByDefault,
        idFront: verifiedByDefault,
        idBack: verifiedByDefault,
        idScan: verifiedByDefault,
        ...(c.verificationChecklist || {}),
      };
      return {
        ...c,
        cardId,
        riderPersonId,
        contractId,
        assignedAgentCode,
        agentCode: assignedAgentCode,
        registeredByAgentCode: c.registeredByAgentCode || assignedAgentCode,
        riderAssignmentId,
        contractStatus: c.contractStatus || (Number(c.remaining || 0) > 0 ? 'Active' : 'Cleared'),
        contractSequence: c.contractSequence || 1,
        verificationChecklist,
        risk,
        flagged: risk >= 60,
      };
    }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const computeRisk = (c) => {
    const progress = Number(c.progress || 0);
    let score = Math.max(0, 50 - progress);
    if (c.overdue) score += 25;
    if (c.status === 'Info Required') score += 20;
    const lastPaymentDate = c.transactions?.length ? new Date(c.transactions[c.transactions.length - 1].date) : null;
    if (lastPaymentDate) {
      const days = Math.floor((Date.now() - lastPaymentDate.getTime()) / (1000 * 60 * 60 * 24));
      if (days > 30) score += 15;
    }
    const recentPayments = (c.transactions || []).filter((t) => new Date(t.date) >= new Date(Date.now() - 1000 * 60 * 60 * 24 * 7));
    if (recentPayments.length > 3) score += 10;
    return Math.min(100, Math.max(0, Math.round(score)));
  };

  const markNotificationsRead = () => {
    setNotifications((current) => current.map((item) => ({ ...item, unread: false })));
  };

  const toggleNotificationDetails = (id) => {
    setNotifications((current) => current.map((item) => item.id === id ? { ...item, unread: false } : item));
  };

  const sendRiderMessage = (customerId, message) => {
    const customer = customers.find((item) => item.id === customerId);
    if (!customer || !message || !String(message).trim()) return;
    const notification = {
      id: Date.now(),
      title: `Message sent to ${customer.name}`,
      body: `Text message to ${customer.name} (${customer.phone}): ${message}`,
      unread: true,
      category: 'message',
      customerId,
      target: 'rider',
    };
    setNotifications((current) => [notification, ...current]);
    audit('Rider message sent', `Sent message to ${customer.name}`);
  };

  const createDueReminder = (customer, label, copy) => ({
    id: Date.now() + Math.floor(Math.random() * 10000),
    title: `Payment reminder for ${customer.name}`,
    body: `${copy} (${customer.installment || 'Installment plan'}) - due ${customer.dueDate}`,
    unread: true,
    category: 'reminder',
    customerId: customer.id,
    reminderKey: `${customer.id}-${label}`,
    target: 'rider',
  });

  const parseDueTimestamp = (dueDate) => {
    if (!dueDate) return null;
    const parts = String(dueDate).split('-');
    if (parts.length !== 3) return new Date(dueDate).getTime();
    const [year, month, day] = parts.map((part) => Number(part));
    return new Date(year, month - 1, day, 17, 0, 0).getTime();
  };

  const updateSetting = (key, value) => {
    setSettings((current) => ({ ...current, [key]: value }));
  };

  const runDueReminderChecks = () => {
    const now = Date.now();
    const windows = [
      { label: '2h', min: 60 * 60 * 1000, max: 2 * 60 * 60 * 1000, copy: 'Payment due in about 2 hours' },
      { label: '1h', min: 30 * 60 * 1000, max: 60 * 60 * 1000, copy: 'Payment due in about 1 hour' },
      { label: '30m', min: 10 * 60 * 1000, max: 30 * 60 * 1000, copy: 'Payment due in about 30 minutes' },
      { label: '5m', min: 0, max: 10 * 60 * 1000, copy: 'Payment due in under 5 minutes' },
    ];

    setNotifications((current) => {
      const next = [...current];
      customers.forEach((customer) => {
        const dueTs = parseDueTimestamp(customer.dueDate);
        if (!dueTs) return;
        const delta = dueTs - now;
        if (delta < 0 || delta > 2 * 60 * 60 * 1000) return;
        const window = windows.find((item) => delta <= item.max && delta > item.min);
        if (!window) return;
        const reminderKey = `${customer.id}-${window.label}`;
        if (next.some((item) => item.reminderKey === reminderKey)) return;
        next.unshift(createDueReminder(customer, window.label, window.copy));
      });
      return next;
    });
  };

  useEffect(() => {
    runDueReminderChecks();
    const interval = setInterval(runDueReminderChecks, 60 * 1000);
    return () => clearInterval(interval);
  }, [customers]);

  const handleLogin = (email, password) => {
    if (!agent || !agent.email) return false;
    if (email !== agent.email || password !== agent.password) return false;
    if (agent.approvalStatus && agent.approvalStatus !== 'Approved') return false;
    setLoggedIn(true);
    return true;
  };

  const handleRegisterAgent = (data) => {
    const newAgent = {
      fullName: data.fullName,
      nationalId: data.nationalId,
      phone: data.phone,
      region: data.region,
      agentPhoto: data.agentPhoto,
      agentIdFront: data.agentIdFront,
      agentIdBack: data.agentIdBack,
      email: data.email,
      password: data.password,
      agentCode: generateAgentCode(data),
      approvalStatus: 'Pending',
      profileApprovalStatus: 'Pending',
      pendingProfileUpdate: null,
    };
    setAgent(newAgent);
    setNotifications((current) => [
      { id: Date.now(), title: 'Agent approval pending', body: `${data.fullName} registered and is waiting for admin approval.`, unread: true, category: 'agent' },
      ...current,
    ]);
    audit('Agent registered pending approval', `Registered ${data.fullName}; waiting for admin approval`);
    return { success: true, pending: true, message: 'Agent account created. Status: Pending admin approval.' };
  };

  const handleResetLoginPassword = (email, nextPassword) => {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const agentEmail = String(agent?.email || defaultAgent.email).trim().toLowerCase();
    if (normalizedEmail !== agentEmail) return false;
    setAgent((current) => ({ ...(current || defaultAgent), password: nextPassword }));
    audit('Password reset by admin OTP', `Password reset for ${normalizedEmail}`);
    return true;
  };

  const handleLogout = () => {
    setLoggedIn(false);
    setRoute('dashboard');
    audit('Agent logout', 'Agent logged out');
  };

  const handleUpdateAgent = (updatedAgent) => {
    setAgent((current) => {
      const pendingProfileUpdate = {
        fullName: updatedAgent.fullName ?? current.fullName,
        nationalId: updatedAgent.nationalId ?? current.nationalId,
        phone: updatedAgent.phone ?? current.phone,
        email: updatedAgent.email ?? current.email,
        region: updatedAgent.region ?? current.region,
        requestedAt: new Date().toLocaleString(),
      };
      return {
        ...current,
        agentCode: current.agentCode,
        profileApprovalStatus: 'Pending',
        pendingProfileUpdate,
      };
    });
    setNotifications((current) => [
      { id: Date.now(), title: 'Agent profile change pending', body: `${agent.agentCode} submitted profile changes for admin approval.`, unread: true, category: 'agent' },
      ...current,
    ]);
    audit('Agent profile change pending', 'Agent details were submitted for admin approval');
  };

  const handleChangePassword = (passwordData) => {
    if (passwordData.current !== agent.password) {
      setPasswordMessage('Current password does not match.');
      return;
    }
    if (passwordData.next.length < 6) {
      setPasswordMessage('Use at least 6 characters for the new password.');
      return;
    }
    if (passwordData.next !== passwordData.confirm) {
      setPasswordMessage('New password and confirmation do not match.');
      return;
    }
    setAgent((current) => ({ ...current, password: passwordData.next }));
    setPasswordMessage('Password updated successfully.');
    audit('Password changed', 'Agent password was updated');
  };

  const addCustomerPayment = (customerId, amount, note, proof = {}) => {
    const paymentAmount = Number(String(amount || '').replace(/[^\d.]/g, '')) || 0;
    if (paymentAmount <= 0) return;

    

    setCustomers((current) => current.map((customer) => {
      if (customer.id !== customerId) return customer;
      const total = customer.totalPrice || 0;
      const paid = Number(customer.paid || 0) + paymentAmount;
      const remaining = Math.max(0, total - paid);
      const percent = total ? Math.round((paid / total) * 100) : 0;
      const date = new Date().toISOString().slice(0, 10);
      const transaction = {
        id: Date.now(),
        date,
        amount: paymentAmount,
        type: 'Payment',
        note: note || 'Manual payment',
        mpesaCode: proof.mpesaCode || '',
        payerPhone: proof.payerPhone || '',
        proofFile: proof.proofFile || '',
        duplicateWarning: proof.mpesaCode && (customer.transactions || []).some((tx) => tx.mpesaCode && tx.mpesaCode === proof.mpesaCode),
        balanceAfter: remaining,
      };
      const updated = {
        ...customer,
        paid,
        remaining,
        progress: percent,
        lastPayment: `KES ${paymentAmount.toLocaleString()} on ${date}`,
        overdue: remaining > 0 && new Date(customer.dueDate) < new Date(),
        transactions: [...(customer.transactions || []), transaction],
      };
      const risk = computeRisk(updated);
      return { ...updated, risk, flagged: risk >= 60 };
    }));
    audit('Payment recorded', `Customer ${customerId} paid KES ${paymentAmount}`);
  };

  const addFollowUpTask = (customerId, actionTitle, note) => {
    const customer = customers.find((item) => item.id === customerId);
    if (!customer) return;
    const nextId = Math.max(0, ...tasks.map((task) => task.id), 0) + 1;
    const newTask = {
      id: nextId,
      customerId,
      customerName: customer.name,
      title: actionTitle,
      note: note || 'Follow up with the rider to keep account on track.',
      due: 'Today',
      status: 'Open',
    };
    setTasks((current) => [newTask, ...current]);
    audit('Follow-up task created', `${actionTitle} for ${customer.name}`);
  };

  const addCustomerAgentRecord = (customerId, type, payload = {}) => {
    const time = new Date().toLocaleString();
    const date = new Date().toISOString().slice(0, 10);
    setCustomers((current) => current.map((customer) => {
      if (customer.id !== customerId) return customer;
      const entry = {
        id: Date.now() + Math.floor(Math.random() * 1000),
        type,
        time,
        date,
        agentCode: agent.agentCode,
        ...payload,
      };
      const timelineEntry = {
        ...entry,
        title: payload.title || type,
        detail: payload.detail || payload.note || payload.result || '',
      };
      const next = { ...customer };
      if (type === 'visit') next.visitLogs = [entry, ...(customer.visitLogs || [])];
      if (type === 'promise') next.promiseLogs = [entry, ...(customer.promiseLogs || [])];
      if (type === 'evidence') next.evidenceLogs = [entry, ...(customer.evidenceLogs || [])];
      if (type === 'excuse') next.excuseLogs = [entry, ...(customer.excuseLogs || [])];
      if (type === 'id-scan') next.idScanLogs = [entry, ...(customer.idScanLogs || [])];
      if (type === 'chassis-check') next.chassisChecks = [entry, ...(customer.chassisChecks || [])];
      if (type === 'repair-debt') next.repairDebtRequests = [entry, ...(customer.repairDebtRequests || [])];
      if (type === 'transfer-request') next.transferRequests = [entry, ...(customer.transferRequests || [])];
      next.riskNotes = [timelineEntry, ...(customer.riskNotes || [])].slice(0, 30);
      next.flagged = next.flagged || ['excuse', 'chassis-check', 'id-scan'].includes(type);
      return next;
    }));
    audit(`Agent ${type}`, payload.title || payload.detail || `Updated customer ${customerId}`);
  };

  const handleScreeningDecision = (customerId, decision, reason = '') => {
    const statusMap = {
      approve: { status: 'Active', screeningStatus: 'Approved', title: 'Application approved' },
      reject: { status: 'Rejected', screeningStatus: 'Rejected', title: 'Application rejected' },
      'info-required': { status: 'Info Required', screeningStatus: 'Info Required', title: 'More information required' },
    };
    const next = statusMap[decision];
    if (!next) return;
    const decidedAt = new Date().toLocaleString();
    const decidedDate = new Date().toISOString().slice(0, 10);
    const customer = customers.find((item) => item.id === customerId);
    setCustomers((current) => current.map((item) => {
      if (item.id !== customerId) return item;
      const note = {
        id: Date.now(),
        type: 'screening',
        title: next.title,
        detail: reason || next.title,
        agentCode: agent.agentCode,
        time: decidedAt,
        date: decidedDate,
      };
      return {
        ...item,
        status: next.status,
        screeningStatus: next.screeningStatus,
        screeningDecisionAt: decidedAt,
        screeningDecisionReason: reason,
        backOfficeQueue: item.backOfficeQueue ? {
          ...item.backOfficeQueue,
          status: next.screeningStatus,
          reviewedAt: decidedAt,
        } : item.backOfficeQueue,
        riskNotes: [note, ...(item.riskNotes || [])].slice(0, 30),
        overdue: next.status === 'Active' ? item.overdue : false,
      };
    }));
    setNotifications((current) => [
      {
        id: Date.now(),
        title: next.title,
        body: `${customer?.name || 'Customer'}: ${reason || next.screeningStatus}.`,
        unread: true,
        category: 'screening',
      },
      ...current,
    ]);
    audit(next.title, `${customer?.name || customerId}: ${reason || next.screeningStatus}`);
  };

  const updateCustomerChecklist = (customerId, key, value) => {
    setCustomers((current) => current.map((customer) => {
      if (customer.id !== customerId) return customer;
      const checklist = { ...(customer.verificationChecklist || {}), [key]: value };
      return {
        ...customer,
        verificationChecklist: checklist,
        riskNotes: [
          {
            id: Date.now(),
            type: 'checklist',
            time: new Date().toLocaleString(),
            date: new Date().toISOString().slice(0, 10),
            agentCode: agent.agentCode,
            title: value ? 'Checklist confirmed' : 'Checklist unchecked',
            detail: key,
          },
          ...(customer.riskNotes || []),
        ].slice(0, 30),
      };
    }));
    audit('Verification checklist updated', `${key}: ${value ? 'yes' : 'no'}`);
  };

  const completeFollowUpTask = (taskId) => {
    setTasks((current) => current.map((task) => task.id === taskId ? { ...task, status: 'Done' } : task));
    const task = tasks.find((item) => item.id === taskId);
    if (task) audit('Follow-up task completed', task.title);
  };

  const audit = (action, details = '') => {
    setSecurity((current) => ({
      ...current,
      auditLog: [
        { action, details, agent: agent.agentCode, time: new Date().toLocaleString() },
        ...(current.auditLog || []),
      ].slice(0, 80),
    }));
  };

  const submitRider = (form) => {
    const normalizedPhone = normalizePhone(form.phone);
    const cleanValue = (value) => String(value || '').trim().toLowerCase();
    const duplicateMatches = customers
      .map((customer) => {
        const reasons = [];
        if (form.nationalId && cleanValue(customer.nationalId) === cleanValue(form.nationalId)) reasons.push('National ID');
        if (form.phone && normalizePhone(customer.phone) === normalizedPhone) reasons.push('Phone number');
        if (form.chassis && cleanValue(customer.chassis) === cleanValue(form.chassis)) reasons.push('Chassis number');
        return reasons.length ? { customer, reasons } : null;
      })
      .filter(Boolean);
    const duplicate = duplicateMatches.find((match) => Number(match.customer.remaining || 0) > 0)?.customer || duplicateMatches[0]?.customer;
    const duplicateReasons = duplicateMatches.find((match) => match.customer.id === duplicate?.id)?.reasons || [];
    const duplicateBalance = duplicate ? Number(duplicate.remaining || 0) : 0;
    const duplicateAgent = duplicate?.assignedAgentCode || duplicate?.agentCode || 'another agent';
    const duplicateStatus = duplicate ? accountStatus(duplicate) : '';
    if (duplicate && duplicateBalance > 0) {
      const message = `Blocked: Rider has active debt under ${duplicateAgent}. Balance: KES ${duplicateBalance.toLocaleString('en-KE')}. Matched by ${duplicateReasons.join(', ') || 'identity trace'}.`;
      setCustomers((current) => current.map((customer) => {
        if (customer.id !== duplicate.id) return customer;
        return {
          ...customer,
          flagged: true,
          duplicateAttempts: [
            {
              id: Date.now(),
              agentCode: agent.agentCode,
              time: new Date().toLocaleString(),
              detail: `Duplicate registration attempt by ${form.fullName || 'unknown rider'} using ${duplicateReasons.join(', ') || form.nationalId || form.phone}.`,
            },
            ...(customer.duplicateAttempts || []),
          ],
          riskNotes: [
            {
              id: Date.now() + 1,
              type: 'duplicate-block',
              title: 'Duplicate registration blocked',
              detail: message,
              agentCode: agent.agentCode,
              time: new Date().toLocaleString(),
              date: new Date().toISOString().slice(0, 10),
            },
            ...(customer.riskNotes || []),
          ].slice(0, 30),
        };
      }));
      setNotifications((current) => [
        { id: Date.now(), title: 'Duplicate registration blocked', body: message, unread: true, category: 'risk' },
        ...current,
      ]);
      audit('Duplicate registration blocked', message);
      return { success: false, message };
    }
    const nextId = Math.max(0, ...customers.map((customer) => customer.id)) + 1;
    const totalPrice = form.bikeModel === 'TVS Star' ? 150000 : 180000;
    const depositAmount = Number(String(form.deposit || '').replace(/[^\d.]/g, '')) || 0;
    const remainingAmount = Math.max(0, totalPrice - depositAmount);
    const createdAt = new Date().toISOString();
    const cardId = generateRiderCardId(agent.agentCode, `${form.nationalId}:${form.phone}:${nextId}`, customers);
    const riderAssignmentId = `ASN-${agent.agentCode}-${checksum(`${cardId}:${nextId}`)}`;
    const returningRider = !!duplicate && duplicateBalance <= 0;
    const riderPersonId = duplicate?.riderPersonId || generateRiderPersonId(form);
    const contractId = generateContractId(agent.agentCode, `${riderPersonId}:${nextId}`, customers);
    const screeningQueueId = `SCR-${agent.agentCode}-${checksum(`${contractId}:${createdAt}`)}`;
    const previousContracts = duplicate
      ? customers.filter((customer) => (
        customer.riderPersonId === duplicate.riderPersonId
        || customer.nationalId === duplicate.nationalId
        || normalizePhone(customer.phone) === normalizePhone(duplicate.phone)
      ))
      : [];
    const newCustomer = {
      id: nextId,
      riderPersonId,
      contractId,
      name: form.fullName,
      phone: form.phone,
      nationalId: form.nationalId,
      region: form.location,
      location: form.location,
      status: 'Pending',
      cardId,
      riderAssignmentId,
      assignedAgentCode: agent.agentCode,
      agentCode: agent.agentCode,
      registeredByAgentCode: agent.agentCode,
      previousAgentCode: duplicateAgent !== 'another agent' && returningRider ? duplicateAgent : '',
      linkedPreviousContractId: returningRider ? duplicate?.contractId || duplicate?.cardId || '' : '',
      linkedPreviousAgentCode: duplicateAgent !== 'another agent' && returningRider ? duplicateAgent : '',
      linkedRiderId: duplicate?.cardId || '',
      returningRider,
      screeningQueueId,
      screeningStatus: 'Queued',
      screeningSubmittedAt: createdAt,
      backOfficeQueue: {
        id: screeningQueueId,
        queue: 'screening',
        status: 'Queued',
        submittedAt: createdAt,
        submittedByAgentCode: agent.agentCode,
      },
      customerOtpVerified: true,
      nextOfKinOtpVerified: true,
      nextOfKinConsent: 'yes',
      contractStatus: remainingAmount > 0 ? 'Active' : 'Cleared',
      contractSequence: returningRider ? previousContracts.length + 1 : 1,
      assignmentNote: returningRider ? `Returning rider. Previous account under ${duplicateAgent} is cleared. New contract created for ${agent.agentCode}; old card ${duplicate.cardId} remains linked.` : '',
      bike: form.bikeModel,
      chassis: form.chassis,
      deposit: form.deposit,
      installment: form.installment,
      totalPrice,
      progress: Math.round((depositAmount / totalPrice) * 100),
      lastPayment: depositAmount ? `${form.deposit} deposit captured` : 'No payment yet',
      paid: depositAmount,
      remaining: remainingAmount,
      dueDate: '2026-06-30',
      risk: computeRisk({ progress: Math.round((depositAmount / totalPrice) * 100), overdue: remainingAmount > 0, status: 'Pending', transactions: depositAmount ? [{ id: Date.now(), date: createdAt.slice(0, 10), amount: depositAmount }] : [] }),
      flagged: computeRisk({ progress: Math.round((depositAmount / totalPrice) * 100), overdue: remainingAmount > 0, status: 'Pending', transactions: depositAmount ? [{ id: Date.now(), date: createdAt.slice(0, 10), amount: depositAmount }] : [] }) >= 60,
      overdue: remainingAmount > 0,
      documentFiles: {
        passportPhoto: form.passport,
        passportPreview: form.passportPreview,
        idFront: form.idFront,
        idFrontPreview: form.idFrontPreview,
        idBack: form.idBack,
        idBackPreview: form.idBackPreview,
        idScan: form.idScan,
        idScanPreview: form.idScanPreview,
        idScanText: form.idScanText,
      },
      verificationChecklist: {
        idSeen: false,
        chassisConfirmed: false,
        passportPhoto: !!form.passport,
        idFront: !!form.idFront,
        idBack: !!form.idBack,
        idScan: !!form.idScan,
      },
      idScanLogs: form.idScan ? [{
        id: Date.now() + 3,
        type: 'id-scan',
        result: form.idScanText || 'ID card image captured for OCR-ready review',
        detail: form.idScan,
        agentCode: agent.agentCode,
        time: new Date().toLocaleString(),
        date: createdAt.slice(0, 10),
      }] : [],
      evidenceLogs: [{
        id: Date.now() + 4,
        type: 'registration-documents',
        title: 'Registration documents captured',
        detail: `Passport: ${form.passport}; ID front: ${form.idFront}; ID back: ${form.idBack}; ID scan: ${form.idScan}`,
        agentCode: agent.agentCode,
        time: new Date().toLocaleString(),
        date: createdAt.slice(0, 10),
      }],
      createdAt,
      transactions: depositAmount ? [{ id: Date.now(), date: createdAt.slice(0, 10), amount: depositAmount, type: 'Deposit', note: 'Initial deposit', balanceAfter: remainingAmount }] : [],
      riskNotes: returningRider ? [{
        id: Date.now() + 2,
        type: 'returning-rider',
        title: 'Returning rider new contract',
        detail: `Previous cleared account found under ${duplicateAgent}. New contract opened by ${agent.agentCode}.`,
        agentCode: agent.agentCode,
        time: new Date().toLocaleString(),
        date: createdAt.slice(0, 10),
      }] : [{
        id: Date.now() + 2,
        type: 'screening-queue',
        title: 'Back-office screening queued',
        detail: `Application ${screeningQueueId} submitted by ${agent.agentCode}.`,
        agentCode: agent.agentCode,
        time: new Date().toLocaleString(),
        date: createdAt.slice(0, 10),
      }],
    };
    setCustomers((current) => [newCustomer, ...current]);
    setCommissions((current) => [
      { id: Date.now(), rider: form.fullName, type: 'Registration', amount: 500, status: 'Pending', date: new Date().toISOString().slice(0, 10) },
      ...current,
    ]);
    setNotifications((current) => [
      { id: Date.now(), title: returningRider ? 'Returning rider new contract' : 'New rider pending', body: returningRider ? `${form.fullName} had a cleared previous account under ${duplicateAgent}. New contract ${riderAssignmentId} created and queued for screening.` : `${form.fullName} submitted to back-office screening queue ${screeningQueueId}.`, unread: true, category: returningRider ? 'returning-rider' : 'task' },
      ...current,
    ]);
    audit(returningRider ? 'Returning rider contract created' : 'Application submitted', returningRider ? `${form.fullName} linked from cleared account ${duplicate.cardId} under ${duplicateAgent} to new contract ${cardId}` : `${form.fullName} moved to screening`);
    setRoute('riders');
    return { success: true };
  };

  const installApp = async () => {
    if (!deferredInstallPrompt) {
      setInstallStatus('Open through localhost or HTTPS, then try again. Some browsers also show Install in the address bar.');
      return;
    }
    deferredInstallPrompt.prompt();
    const result = await deferredInstallPrompt.userChoice;
    setDeferredInstallPrompt(null);
    if (result.outcome === 'accepted') {
      setAppInstalled(true);
      saveState('app-installed', true);
      setInstallStatus('Installation started.');
      return;
    }
    setInstallStatus('Installation was dismissed.');
  };

  const lockSession = () => {
    setSecurity((current) => ({ ...current, locked: true, unlockPin: '' }));
    audit('Session locked', 'Agent locked the portal');
  };

  const unlockSession = () => {
    setSecurity((current) => {
      if (current.unlockPin === current.pin) {
        return {
          ...current,
          locked: false,
          unlockPin: '',
          failedUnlocks: 0,
          auditLog: [{ action: 'Session unlocked', details: 'PIN accepted', agent: agent.agentCode, time: new Date().toLocaleString() }, ...(current.auditLog || [])],
        };
      }
      return {
        ...current,
        failedUnlocks: (current.failedUnlocks || 0) + 1,
        auditLog: [{ action: 'Failed unlock', details: 'Wrong secure PIN entered', agent: agent.agentCode, time: new Date().toLocaleString() }, ...(current.auditLog || [])],
      };
    });
  };

  const downloadCsv = (filename, rows) => {
    const csv = rows.map((row) => row.map((cell) => `"${String(cell || '').replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const exportAuditCsv = () => {
    downloadCsv('bumu-audit-trail.csv', [['Time', 'Agent', 'Action', 'Details'], ...(security.auditLog || []).map((entry) => [entry.time, entry.agent, entry.action, entry.details])]);
  };

  const resetLocalPortalData = () => {
    setCustomers(initialCustomers);
    setCommissions(initialCommissions);
    setNotifications(initialNotifications);
    setTasks(initialTasks);
    audit('Local data reset', 'Cleared local rider, commission, notification, and task records');
  };

  const themeStyles = theme === 'dark' ? styles.darkShell : styles.lightShell;
  const activeRoute = routes.find((item) => item.id === route) || routes[0];
  const activeLabel = activeRoute.label || 'Dashboard';
  const commandResults = useMemo(() => {
    const query = commandQuery.trim().toLowerCase();
    if (!query) return [];
    const routeResults = routes
      .filter((item) => `${item.label} ${item.detail} ${item.action || ''}`.toLowerCase().includes(query))
      .map((item) => ({ type: 'Module', label: item.label, detail: item.detail, routeId: item.id }));
    const featureResults = Object.entries(featureMenus).flatMap(([routeId, features]) => features
      .filter((feature) => `${feature.label} ${feature.detail}`.toLowerCase().includes(query))
      .map((feature, index) => ({ type: 'Feature', label: feature.label, detail: feature.detail, routeId, toolIndex: index })));
    const riderResults = customers
      .filter((customer) => `${customer.name} ${customer.phone} ${customer.nationalId || ''} ${customer.cardId || ''} ${customer.contractId || ''}`.toLowerCase().includes(query))
      .slice(0, 6)
      .map((customer) => ({ type: 'Rider', label: customer.name, detail: `${customer.cardId} - ${customer.status} - KES ${Number(customer.remaining || 0).toLocaleString('en-KE')} balance`, routeId: 'riders', riderId: customer.id }));
    const seen = new Set();
    return [...routeResults, ...featureResults, ...riderResults].filter((item) => {
      const key = `${item.type}:${item.label}:${item.routeId}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    }).slice(0, 8);
  }, [commandQuery, customers]);
  const openFeature = (id) => {
    setRoute(id);
    setNavMenuOpen(false);
    setCommandRiderId(null);
  };
  const openHomeAction = (label) => {
    const map = {
      'Register Rider': 'register',
      'Find Rider': 'riders',
      'Verify Rider': 'riders',
      'Record Visit': 'riders',
    };
    setRoute(map[label] || 'dashboard');
    setNavMenuOpen(false);
    setCommandRiderId(null);
  };
  const openCommandResult = (result) => {
    setRoute(result.routeId);
    setNavMenuOpen(false);
    if (result.type === 'Feature') {
      setCommandRiderId(null);
    } else if (result.type === 'Rider') {
      setCommandRiderId(result.riderId);
    } else {
      setCommandRiderId(null);
    }
    setCommandQuery('');
  };
  const activeInsight = useMemo(() => {
    const openTasks = tasks.filter((item) => item.status !== 'Done').length;
    const unreadAlerts = notifications.filter((item) => item.unread).length;
    const flaggedRiders = customers.filter((item) => item.flagged || item.risk >= 60 || item.overdue).length;
    const insights = {
      dashboard: {
        kicker: 'Live desk',
        detail: `${customers.length} riders, ${openTasks} open follow-ups, and ${unreadAlerts} alerts waiting.`,
        metric: `${openTasks} tasks`,
      },
      register: {
        kicker: 'New application',
        detail: `Defaults are ready for ${settings.defaultBikeModel} with ${settings.defaultInstallment}.`,
        metric: settings.defaultRegion,
      },
      riders: {
        kicker: 'Portfolio watch',
        detail: `${flaggedRiders} rider accounts need closer attention before the next review.`,
        metric: `${customers.length} riders`,
      },
      commissions: {
        kicker: 'Commission desk',
        detail: `${commissions.length} finance records are available, with estimates based on rider payment progress.`,
        metric: `KES ${commissions.reduce((sum, item) => sum + Number(item.amount || 0), 0).toLocaleString('en-KE')}`,
      },
      screening: {
        kicker: 'Back office',
        detail: `${customers.filter((item) => item.status === 'Pending' || item.status === 'Info Required' || item.screeningStatus === 'Queued').length} applications need screening attention.`,
        metric: 'Queue',
      },
      notifications: {
        kicker: 'Alert center',
        detail: `${unreadAlerts} unread alerts are available for documents, riders, and tasks.`,
        metric: `${unreadAlerts} unread`,
      },
      settings: {
        kicker: 'Portal settings',
        detail: `${settings.inAppNotifications ? 'In-app alerts are on' : 'In-app alerts are off'} and theme is ${theme === 'dark' ? 'dark' : 'light'}.`,
        metric: settings.defaultRegion,
      },
      account: {
        kicker: 'Agent account',
        detail: `${agent.fullName} uses ${agent.agentCode}. Profile changes wait for admin approval.`,
        metric: agent.agentCode,
      },
    };
    return insights[route] || insights.dashboard;
  }, [agent, commissions, customers, notifications, route, settings, tasks, theme]);
  const portalStatus = useMemo(() => {
    const openTasks = tasks.filter((item) => item.status !== 'Done').length;
    const unreadAlerts = notifications.filter((item) => item.unread).length;
    const riskyRiders = customers.filter((item) => item.flagged || item.overdue || Number(item.risk || 0) >= 60).length;
    return [
      { label: 'Agent', value: agent.agentCode },
      { label: 'Open Tasks', value: openTasks },
      { label: 'Unread Alerts', value: unreadAlerts },
      { label: 'Risk Riders', value: riskyRiders },
    ];
  }, [agent.agentCode, customers, notifications, tasks]);
  const visibleNavItems = navMenuOpen ? routes : [activeRoute];

  if (!loggedIn) {
    return <Auth agent={agent} onLogin={handleLogin} onRegister={handleRegisterAgent} onResetPassword={handleResetLoginPassword} theme={theme} />;
  }

  if (security.locked) {
    return (
      <SafeAreaView style={[styles.shell, themeStyles]}>
        <View style={styles.lockCard}>
          <Text style={[styles.brand, theme === 'dark' ? styles.textLight : styles.textDark]}>Session Locked</Text>
          <Text style={[styles.pageSubtitle, theme === 'dark' ? styles.textMutedLight : styles.textMuted]}>Enter secure PIN to continue.</Text>
          <TextInput
            style={styles.lockInput}
            value={security.unlockPin}
            onChangeText={(value) => setSecurity((current) => ({ ...current, unlockPin: value }))}
            secureTextEntry
            keyboardType="number-pad"
          />
          {!!security.failedUnlocks && <Text style={styles.lockError}>Wrong PIN attempts: {security.failedUnlocks}</Text>}
          <TouchableOpacity style={styles.actionButton} onPress={unlockSession}>
            <Text style={styles.actionText}>Unlock Portal</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={[styles.shell, themeStyles]}>
      <View style={styles.frame}>
        <View style={[styles.topBar, theme === 'dark' ? styles.topBarDark : styles.topBarLight]}>
          <View style={styles.headerAgentWrap}>
            {agent.agentPhoto ? (
              <Image source={{ uri: agent.agentPhoto }} style={styles.headerAgentPhoto} />
            ) : (
              <View style={styles.headerAgentInitial}>
                <Text style={styles.headerAgentInitialText}>{String(agent.fullName || 'A').slice(0, 1).toUpperCase()}</Text>
              </View>
            )}
            <View style={styles.headerAgentBlock}>
              <Text style={styles.headerAgentLabel}>Agent</Text>
              <Text style={styles.headerAgentCode}>{agent.agentCode}</Text>
            </View>
          </View>
        </View>
        <View style={[styles.commandBar, theme === 'dark' ? styles.commandBarDark : styles.commandBarLight]}>
          <TextInput
            style={styles.commandInput}
            value={commandQuery}
            onChangeText={setCommandQuery}
            placeholder={isCompact ? 'Search rider, ID, phone...' : 'Command search: rider, ID, phone, overdue, change password...'}
            placeholderTextColor={theme === 'dark' ? '#7f93a8' : '#8a97a8'}
          />
          {!!commandResults.length && (
            <View style={[styles.commandResults, theme === 'dark' ? styles.commandResultsDark : styles.commandResultsLight]}>
              {commandResults.map((result, index) => (
                <TouchableOpacity key={`${result.type}-${result.label}-${index}`} style={styles.commandResultRow} onPress={() => openCommandResult(result)}>
                  <Text style={styles.commandType}>{result.type}</Text>
                  <View style={styles.commandCopy}>
                    <Text style={[styles.commandTitle, theme === 'dark' ? styles.textLight : styles.textDark]}>{result.label}</Text>
                    <Text style={[styles.commandDetail, theme === 'dark' ? styles.textMutedLight : styles.textMuted]}>{result.detail}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>

        <View style={styles.workspace}>
          <View style={[styles.navShell, theme === 'dark' ? styles.navShellDark : styles.navShellLight]}>
            <View style={styles.navHelpBox}>
              <View style={styles.navMenuHeader}>
                <TouchableOpacity style={styles.hamburgerButton} onPress={() => setNavMenuOpen((open) => !open)} activeOpacity={0.86}>
                  <View style={styles.hamburgerLine} />
                  <View style={styles.hamburgerLine} />
                  <View style={styles.hamburgerLine} />
                </TouchableOpacity>
                <Text style={styles.navEyebrow}>{navMenuOpen ? 'Main tabs' : 'Selected feature'}</Text>
              </View>
              {!navMenuOpen && (
                <TouchableOpacity style={styles.backButton} onPress={() => setNavMenuOpen(true)} activeOpacity={0.86}>
                  <Text style={styles.backIcon}>{'<'}</Text>
                  <Text style={styles.backText}>Back to Main Tabs</Text>
                </TouchableOpacity>
              )}
            </View>
            <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.navBar}>
              <View style={styles.navGroup}>
                {visibleNavItems.map((item, index) => (
                  <TouchableOpacity
                    key={item.id}
                    style={[styles.navItem, styles[`navTone${(index % 6) + 1}`], route === item.id && styles.navItemActive]}
                    onPress={() => openFeature(item.id)}
                    activeOpacity={0.86}
                  >
                    <View style={styles.navCopy}>
                      <Text style={[styles.navText, route === item.id && styles.navTextActive]}>{item.label}</Text>
                    </View>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
          </View>
          <View style={styles.contentPane}>
            <View style={styles.pageHeader}>
              <Text style={[styles.pageTitle, theme === 'dark' ? styles.textLight : styles.textDark]}>{activeLabel}</Text>
              <View style={[styles.insightStrip, theme === 'dark' ? styles.insightStripDark : styles.insightStripLight]}>
                <View style={styles.insightCopy}>
                  <Text style={styles.insightKicker}>{activeInsight.kicker}</Text>
                  <Text style={[styles.insightDetail, theme === 'dark' ? styles.textLight : styles.textDark]}>{activeInsight.detail}</Text>
                </View>
                <Text style={styles.insightMetric}>{activeInsight.metric}</Text>
              </View>
              <View style={[styles.colorLegend, theme === 'dark' ? styles.selectedToolPanelDark : styles.selectedToolPanelLight]}>
                <Text style={styles.legendDone}>Green = done/paid</Text>
                <Text style={styles.legendPending}>Yellow = pending</Text>
                <Text style={styles.legendDanger}>Red = debt/blocked</Text>
                <Text style={styles.legendInfo}>Blue = information</Text>
              </View>
            </View>

            <ScrollView contentContainerStyle={styles.pageContent} showsVerticalScrollIndicator={false}>
              {activeRoute.screen === 'dashboard' && <Dashboard theme={theme} simpleMode={settings.simpleMode} selectedAction={activeRoute.action || ''} customers={customers} commissions={commissions} notifications={notifications} tasks={tasks} onCompleteTask={completeFollowUpTask} onHomeAction={openHomeAction} />}
              {activeRoute.screen === 'register' && <RegisterRider theme={theme} selectedAction={activeRoute.action || ''} settings={settings} customers={customers} agent={agent} onSubmitRider={submitRider} />}
              {activeRoute.screen === 'customers' && <Customers theme={theme} simpleMode={settings.simpleMode} commandRiderId={commandRiderId} selectedAction={activeRoute.action || ''} customers={customers} agent={agent} privacyMode={security.privacyMode} onExportCsv={downloadCsv} onAddPayment={addCustomerPayment} onCreateTask={addFollowUpTask} onSendMessage={sendRiderMessage} onAgentRecord={addCustomerAgentRecord} onChecklistChange={updateCustomerChecklist} />}
              {activeRoute.screen === 'commissions' && <Commissions theme={theme} selectedAction={activeRoute.action || ''} commissions={commissions} customers={customers} onExportCsv={downloadCsv} />}
              {activeRoute.screen === 'screening' && <Screening theme={theme} customers={customers} onDecision={handleScreeningDecision} />}
              {activeRoute.screen === 'notifications' && <Notifications theme={theme} selectedAction={activeRoute.action || ''} notifications={notifications} onMarkAllRead={markNotificationsRead} onOpenNotification={toggleNotificationDetails} />}
              {activeRoute.screen === 'profile' && <Profile theme={theme} selectedAction={activeRoute.action || ''} agent={agent} onUpdateAgent={handleUpdateAgent} onLogout={handleLogout} />}
              {activeRoute.screen === 'settings' && <Settings theme={theme} selectedAction={activeRoute.action || ''} settings={settings} onToggleTheme={() => setTheme(theme === 'dark' ? 'light' : 'dark')} onToggleSetting={updateSetting} onUpdateSetting={updateSetting} onChangePassword={handleChangePassword} passwordMessage={passwordMessage} />}
            </ScrollView>
          </View>
        </View>
      </View>
      {!appInstalled && (
        <View style={styles.installFabWrap}>
          <TouchableOpacity style={styles.installFab} onPress={installApp}>
            <Text style={styles.installFabText}>Install Bumu</Text>
          </TouchableOpacity>
          {!!installStatus && <Text style={styles.installFabStatus}>{installStatus}</Text>}
        </View>
      )}
    </SafeAreaView>
  );
}

const createStyles = (theme, isDesktop, isCompact) => {
  const dark = theme === 'dark';
  return StyleSheet.create({
    shell: {
      flex: 1,
      minHeight: '100vh',
    },
    frame: {
      flex: 1,
      width: '100%',
      maxWidth: isDesktop ? 1260 : '100%',
      alignSelf: 'center',
      paddingBottom: 0,
    },
    lightShell: {
      backgroundColor: '#ffffff',
    },
    darkShell: {
      backgroundColor: '#ffffff',
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: isCompact ? 'center' : 'flex-end',
      paddingHorizontal: isCompact ? 12 : 16,
      paddingTop: isCompact ? 10 : 18,
      paddingBottom: isCompact ? 10 : 14,
      borderBottomWidth: 1,
      gap: isDesktop ? 0 : 12,
    },
    brandBlock: {
      gap: 4,
      flex: isDesktop ? 1 : undefined,
      minWidth: 0,
    },
    headerAgentBlock: {
      alignItems: 'flex-end',
      gap: 3,
      minWidth: 0,
      flexShrink: 1,
    },
    headerAgentWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-end',
      gap: 10,
      maxWidth: '100%',
      minWidth: 0,
    },
    headerAgentPhoto: {
      width: 42,
      height: 42,
      borderRadius: 21,
      borderWidth: 2,
      borderColor: '#8fff55',
      backgroundColor: '#092a75',
    },
    headerAgentInitial: {
      width: 42,
      height: 42,
      borderRadius: 21,
      borderWidth: 2,
      borderColor: '#8fff55',
      backgroundColor: '#092a75',
      alignItems: 'center',
      justifyContent: 'center',
    },
    headerAgentInitialText: {
      color: '#ffffff',
      fontSize: 16,
      fontWeight: '900',
      fontFamily: 'Georgia',
    },
    headerAgentLabel: {
      color: '#d7e7ff',
      fontSize: 11,
      fontWeight: '900',
      fontFamily: 'Georgia',
      textTransform: 'uppercase',
    },
    headerAgentCode: {
      color: '#ffffff',
      fontSize: isCompact ? 12 : 16,
      fontWeight: '900',
      fontFamily: 'Georgia',
      flexShrink: 1,
    },
    brandSubtext: {
      fontSize: 12,
      lineHeight: 17,
      fontFamily: 'Georgia',
      maxWidth: 440,
    },
    portalStatusRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      justifyContent: isDesktop ? 'flex-end' : 'flex-start',
      flex: isDesktop ? 1 : undefined,
    },
    portalStatusCard: {
      minWidth: isCompact ? 92 : 112,
      borderWidth: 1,
      borderRadius: 10,
      paddingVertical: 8,
      paddingHorizontal: 10,
    },
    portalStatusLight: {
      backgroundColor: '#f5f8ff',
      borderColor: '#d8e3f7',
    },
    portalStatusDark: {
      backgroundColor: '#07101f',
      borderColor: '#1a3158',
    },
    portalStatusLabel: {
      color: '#0f5fff',
      fontSize: 10,
      fontWeight: '900',
      fontFamily: 'Georgia',
      textTransform: 'uppercase',
    },
    portalStatusValue: {
      marginTop: 3,
      fontSize: 12,
      fontWeight: '900',
      fontFamily: 'Georgia',
    },
    topBarLight: {
      backgroundColor: '#0b4dcc',
      borderBottomColor: '#2f7cff',
    },
    topBarDark: {
      backgroundColor: '#061a4a',
      borderBottomColor: '#2f7cff',
    },
    brand: {
      fontSize: 20,
      fontWeight: '800',
      fontFamily: 'Georgia',
    },
    actions: {
      flexDirection: 'row',
      gap: 10,
      justifyContent: 'flex-end',
    },
    modeButton: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: dark ? '#29406a' : '#d8e3f7',
      backgroundColor: dark ? '#07101f' : '#f5f8ff',
    },
    modeText: {
      color: dark ? '#f3f6fb' : '#0f5fff',
      fontFamily: 'Georgia',
      fontWeight: '900',
      fontSize: 13,
    },
    actionButton: {
      paddingVertical: 10,
      paddingHorizontal: 14,
      borderRadius: 10,
      backgroundColor: '#0f5fff',
    },
    commandBar: {
      paddingHorizontal: isCompact ? 10 : 16,
      paddingVertical: isCompact ? 8 : 10,
      borderBottomWidth: 1,
      zIndex: 5,
    },
    commandBarLight: {
      backgroundColor: '#ffffff',
      borderBottomColor: '#d8e3f7',
    },
    commandBarDark: {
      backgroundColor: '#ffffff',
      borderBottomColor: '#d8e3f7',
    },
    commandInput: {
      borderWidth: 1,
      borderColor: dark ? '#29406a' : '#d8e3f7',
      borderRadius: isCompact ? 10 : 12,
      paddingVertical: isCompact ? 10 : 12,
      paddingHorizontal: isCompact ? 12 : 14,
      color: '#0b1730',
      backgroundColor: '#f8fafc',
      fontFamily: 'Georgia',
    },
    commandResults: {
      marginTop: 8,
      borderWidth: 1,
      borderRadius: 12,
      overflow: 'hidden',
    },
    commandResultsLight: {
      backgroundColor: '#ffffff',
      borderColor: '#d8e3f7',
    },
    commandResultsDark: {
      backgroundColor: '#07101f',
      borderColor: '#1a3158',
    },
    commandResultRow: {
      flexDirection: 'row',
      gap: 10,
      padding: 12,
      borderBottomWidth: 1,
      borderBottomColor: dark ? '#1a3158' : '#edf2f7',
    },
    commandType: {
      color: '#0f5fff',
      fontSize: 11,
      fontWeight: '900',
      fontFamily: 'Georgia',
      width: 58,
    },
    commandCopy: {
      flex: 1,
      minWidth: 0,
    },
    commandTitle: {
      fontSize: 13,
      fontWeight: '900',
      fontFamily: 'Georgia',
    },
    commandDetail: {
      marginTop: 3,
      fontSize: 12,
      lineHeight: 17,
      fontFamily: 'Georgia',
    },
    actionText: {
      color: '#ffffff',
      fontFamily: 'Georgia',
      fontSize: 13,
    },
    workspace: {
      flex: 1,
      flexDirection: isCompact ? 'column' : 'row',
      alignItems: 'stretch',
      width: '100%',
      backgroundColor: '#ffffff',
    },
    navShell: {
      borderRightWidth: isCompact ? 0 : 1,
      borderBottomWidth: isCompact ? 1 : 0,
      paddingHorizontal: isCompact ? 10 : 14,
      paddingVertical: isCompact ? 10 : 16,
      gap: isCompact ? 10 : 16,
      width: isCompact ? '100%' : 318,
      maxHeight: isCompact ? undefined : 'calc(100vh - 74px)',
      justifyContent: 'space-between',
    },
    insideShell: {
      justifyContent: 'flex-start',
    },
    navShellLight: {
      backgroundColor: '#063b9f',
      borderBottomColor: '#2f7cff',
    },
    navShellDark: {
      backgroundColor: '#063b9f',
      borderBottomColor: '#2f7cff',
    },
    navBar: {
      gap: 8,
      flexDirection: 'column',
      alignItems: 'stretch',
      paddingBottom: isCompact ? 6 : 20,
    },
    navHelpBox: {
      gap: 6,
    },
    navMenuHeader: {
      minHeight: 40,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    hamburgerButton: {
      width: 42,
      height: 38,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: dark ? '#2f7cff' : '#76a5ff',
      backgroundColor: dark ? '#07101f' : '#063b9f',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    hamburgerLine: {
      width: 19,
      height: 2,
      borderRadius: 999,
      backgroundColor: '#ffffff',
    },
    navHelpText: {
      fontSize: 12,
      lineHeight: 17,
      fontFamily: 'Georgia',
    },
    navGroup: {
      gap: isCompact ? 4 : 7,
    },
    navGroupSwitch: {
      gap: 8,
      marginTop: 10,
    },
    navGroupButton: {
      borderWidth: 1,
      borderColor: dark ? '#1a3158' : '#d8e3f7',
      backgroundColor: dark ? '#07101f' : '#ffffff',
      borderRadius: 10,
      paddingVertical: 11,
      paddingHorizontal: 12,
    },
    navGroupButtonActive: {
      backgroundColor: '#0f5fff',
      borderColor: '#0f5fff',
    },
    navGroupButtonText: {
      color: dark ? '#f3f6fb' : '#0b1730',
      fontSize: 13,
      fontWeight: '900',
      fontFamily: 'Georgia',
    },
    navGroupButtonTextActive: {
      color: '#ffffff',
    },
    navGroupTitle: {
      fontSize: 11,
      fontWeight: '900',
      fontFamily: 'Georgia',
      textTransform: 'uppercase',
      paddingHorizontal: 4,
      marginBottom: 2,
    },
    navItem: {
      paddingVertical: isCompact ? 13 : 12,
      paddingHorizontal: isCompact ? 10 : 4,
      borderRadius: 0,
      backgroundColor: 'transparent',
      borderWidth: 0,
      borderBottomWidth: 1,
      borderColor: 'rgba(255,255,255,0.22)',
      minHeight: isCompact ? 48 : 44,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      shadowColor: '#0f1720',
      shadowOpacity: 0,
      shadowRadius: 0,
      shadowOffset: { width: 0, height: 0 },
    },
    navCopy: {
      flex: 1,
      minWidth: 0,
    },
    navTone1: {},
    navTone2: {},
    navTone3: {},
    navTone4: {},
    navTone5: {},
    navTone6: {},
    accountNav: {
      gap: 9,
      paddingTop: 12,
      borderTopWidth: 1,
      borderTopColor: dark ? '#1a3158' : '#d8e3f7',
    },
    accountNavItem: {
      paddingVertical: 13,
      paddingHorizontal: 13,
      borderRadius: 10,
      backgroundColor: dark ? '#11264b' : '#ffffff',
      borderWidth: 1,
      borderColor: dark ? '#29406a' : '#d8e3f7',
      minHeight: 64,
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
    },
    backButton: {
      minHeight: 44,
      borderRadius: 10,
      backgroundColor: '#0f5fff',
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    backIcon: {
      color: '#ffffff',
      fontSize: 18,
      fontWeight: '900',
      fontFamily: 'Georgia',
      lineHeight: 20,
    },
    backText: {
      color: '#ffffff',
      fontSize: 13,
      fontWeight: '900',
      fontFamily: 'Georgia',
    },
    secondaryBackButton: {
      minHeight: 42,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: dark ? '#29406a' : '#d8e3f7',
      backgroundColor: dark ? '#07101f' : '#ffffff',
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 12,
      paddingVertical: 10,
    },
    secondaryBackText: {
      color: dark ? '#f3f6fb' : '#0f5fff',
      fontSize: 13,
      fontWeight: '900',
      fontFamily: 'Georgia',
    },
    insideHeader: {
      borderBottomWidth: 1,
      borderBottomColor: dark ? '#1a3158' : '#d8e3f7',
      paddingBottom: 12,
      gap: 5,
    },
    insideTitle: {
      fontSize: 18,
      fontWeight: '900',
      fontFamily: 'Georgia',
    },
    navItemActive: {
      backgroundColor: 'transparent',
      borderColor: '#8fff55',
      shadowOpacity: 0,
      shadowRadius: 0,
      shadowOffset: { width: 0, height: 0 },
    },
    navText: {
      fontSize: 13,
      fontWeight: '700',
      fontFamily: 'Georgia',
      color: '#ffffff',
      flexShrink: 1,
    },
    navDetail: {
      marginTop: 3,
      fontSize: 11,
      lineHeight: 15,
      fontFamily: 'Georgia',
      color: dark ? '#aebbd0' : '#627083',
      flexShrink: 1,
    },
    navNumber: {
      color: dark ? '#aebbd0' : '#627083',
      fontSize: 11,
      fontWeight: '900',
      fontFamily: 'Georgia',
      width: 24,
    },
    navEyebrow: {
      color: '#d7e7ff',
      fontSize: 11,
      fontWeight: '900',
      fontFamily: 'Georgia',
      textTransform: 'uppercase',
      letterSpacing: 0,
    },
    navTextActive: {
      color: '#8fff55',
    },
    workflowGuide: {
      borderWidth: 1,
      borderRadius: 14,
      padding: 12,
      gap: 9,
      marginTop: 4,
    },
    workflowGuideLight: {
      backgroundColor: '#ffffff',
      borderColor: '#d8e3f7',
    },
    workflowGuideDark: {
      backgroundColor: '#07101f',
      borderColor: '#1a3158',
    },
    workflowHeader: {
      borderBottomWidth: 1,
      borderBottomColor: dark ? '#1a3158' : '#e6eef3',
      paddingBottom: 8,
      marginBottom: 1,
      gap: 3,
    },
    workflowModule: {
      fontSize: 15,
      fontWeight: '900',
      fontFamily: 'Georgia',
    },
    contentPane: {
      flex: 1,
      minWidth: 0,
      backgroundColor: '#ffffff',
    },
    pageHeader: {
      paddingHorizontal: isCompact ? 10 : 16,
      paddingTop: isCompact ? 10 : 16,
      paddingBottom: isCompact ? 12 : 20,
      backgroundColor: '#ffffff',
    },
    pageTitle: {
      fontSize: isDesktop ? 34 : isCompact ? 22 : 28,
      fontWeight: '800',
      fontFamily: 'Georgia',
      maxWidth: isDesktop ? 820 : '100%',
    },
    pageSubtitle: {
      marginTop: 8,
      fontSize: 15,
      lineHeight: 22,
      maxWidth: isDesktop ? 760 : '100%',
      fontFamily: 'Georgia',
      opacity: 0.92,
    },
    insightStrip: {
      marginTop: isCompact ? 10 : 14,
      borderWidth: 1,
      borderRadius: isCompact ? 10 : 14,
      padding: isCompact ? 10 : 14,
      flexDirection: isDesktop ? 'row' : 'column',
      alignItems: isDesktop ? 'center' : 'stretch',
      justifyContent: 'space-between',
      gap: 12,
    },
    insightStripLight: {
      backgroundColor: '#ffffff',
      borderColor: '#d8e3f7',
    },
    insightStripDark: {
      backgroundColor: '#0b1730',
      borderColor: '#29406a',
    },
    insightCopy: {
      flex: 1,
      minWidth: 0,
    },
    insightKicker: {
      color: '#0f5fff',
      fontSize: 12,
      fontWeight: '900',
      fontFamily: 'Georgia',
      textTransform: 'uppercase',
    },
    insightDetail: {
      marginTop: 4,
      fontSize: 15,
      lineHeight: 22,
      fontFamily: 'Georgia',
    },
    insightMetric: {
      color: '#ffffff',
      backgroundColor: '#0f5fff',
      borderRadius: 12,
      overflow: 'hidden',
      paddingVertical: 9,
      paddingHorizontal: 14,
      fontSize: 13,
      fontWeight: '900',
      fontFamily: 'Georgia',
      textAlign: 'center',
      alignSelf: isDesktop ? 'center' : 'flex-start',
    },
    methodHead: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 12,
    },
    methodCount: {
      fontSize: 13,
      fontWeight: '900',
      fontFamily: 'Georgia',
    },
    selectedToolPanelLight: {
      backgroundColor: '#f5f8ff',
      borderColor: '#d8e3f7',
    },
    selectedToolPanelDark: {
      backgroundColor: '#081326',
      borderColor: '#29406a',
    },
    colorLegend: {
      marginTop: isCompact ? 8 : 12,
      borderWidth: 1,
      borderRadius: isCompact ? 10 : 12,
      padding: isCompact ? 8 : 12,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    legendDone: { color: '#0f5fff', fontSize: 11, fontWeight: '900', fontFamily: 'Georgia' },
    legendPending: { color: '#b86800', fontSize: 11, fontWeight: '900', fontFamily: 'Georgia' },
    legendDanger: { color: '#bd2a2a', fontSize: 11, fontWeight: '900', fontFamily: 'Georgia' },
    legendInfo: { color: '#1f6fff', fontSize: 11, fontWeight: '900', fontFamily: 'Georgia' },
    quickActions: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 10,
      marginHorizontal: 16,
      marginBottom: 16,
    },
    quickAction: {
      backgroundColor: '#0f5fff',
      borderRadius: 14,
      paddingVertical: 12,
      paddingHorizontal: 16,
      flexGrow: 1,
      flexBasis: '100%',
    },
    quickActionText: {
      color: '#ffffff',
      fontWeight: '800',
      fontSize: 13,
      fontFamily: 'Georgia',
      textAlign: 'center',
    },
    pageContent: {
      paddingHorizontal: isCompact ? 10 : 16,
      paddingBottom: 32,
      width: '100%',
      backgroundColor: '#ffffff',
    },
    accountStack: {
      gap: 18,
    },
    installFabWrap: {
      position: 'fixed',
      right: isCompact ? 12 : 18,
      bottom: isCompact ? 12 : 18,
      zIndex: 40,
      maxWidth: isCompact ? 240 : 300,
      gap: 6,
      alignItems: 'flex-end',
    },
    installFab: {
      backgroundColor: '#0f5fff',
      borderRadius: 999,
      paddingVertical: 12,
      paddingHorizontal: 18,
      shadowColor: '#003040',
      shadowOpacity: 0.18,
      shadowRadius: 16,
      shadowOffset: { width: 0, height: 8 },
      alignSelf: 'flex-end',
    },
    installFabText: {
      color: '#ffffff',
      fontSize: 13,
      fontWeight: '900',
      fontFamily: 'Georgia',
    },
    installFabStatus: {
      color: '#0b1730',
      backgroundColor: '#ffffff',
      borderRadius: 8,
      borderWidth: 1,
      borderColor: '#d8e3f7',
      paddingVertical: 6,
      paddingHorizontal: 8,
      fontSize: 11,
      fontWeight: '800',
      fontFamily: 'Georgia',
      shadowColor: '#003040',
      shadowOpacity: 0.08,
      shadowRadius: 8,
      shadowOffset: { width: 0, height: 4 },
    },
    textDark: {
      color: '#0b1730',
    },
    textLight: {
      color: '#f3f6fb',
    },
    textMuted: {
      color: '#627083',
    },
    textMutedLight: {
      color: '#aebbd0',
    },
  });
};
