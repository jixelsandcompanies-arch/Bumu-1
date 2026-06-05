import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { View } from 'react-native';
import { AppShell } from './components/layout/AppShell.jsx';
import { LoginScreen } from './screens/LoginScreen.jsx';
import { DashboardScreen } from './screens/DashboardScreen.jsx';
import { PaymentsScreen } from './screens/PaymentsScreen.jsx';
import { CustomersScreen } from './screens/CustomersScreen.jsx';
import { CommissionsScreen } from './screens/CommissionsScreen.jsx';
import { ReportsScreen } from './screens/ReportsScreen.jsx';
import { ReconciliationScreen } from './screens/ReconciliationScreen.jsx';
import { NotificationsScreen } from './screens/NotificationsScreen.jsx';
import { SettingsScreen } from './screens/SettingsScreen.jsx';
import { PortalLandingScreen } from './screens/PortalLandingScreen.jsx';
import { CustomerPortalScreen } from './screens/CustomerPortalScreen.jsx';
import { AgentPortalScreen } from './screens/AgentPortalScreen.jsx';
import { UploadedAdminPortalScreen } from './screens/UploadedAdminPortalScreen.jsx';
import { NextOfKinAcceptScreen } from './screens/NextOfKinAcceptScreen.jsx';
import { useInstallPrompt } from './hooks/useInstallPrompt.js';
import { Toast } from './components/ui/Toast.jsx';
import { Text } from './components/ui/Text.jsx';
import { authService } from './services/authService.js';
import { getAuthToken } from './services/authSession.js';
import { notificationService } from './services/notificationService.js';
import { paymentService } from './services/paymentService.js';
import { formatKes } from './utils/currency.js';
import { formatDate } from './utils/dates.js';

function readProfileSettings() {
  try {
    const profile = JSON.parse(window.sessionStorage.getItem('bumu-profile-settings') || '{}');
    const { userCode, ...visibleProfile } = profile;

    return visibleProfile;
  } catch {
    return {};
  }
}

function isAuthRoute() {
  return ['#/login', '#/register', '#/forgot-password'].includes(window.location.hash);
}

function isCustomerRoute() {
  return window.location.hash === '#/customer';
}

function isAgentRoute() {
  return window.location.hash === '#/agent';
}

function isAdminRoute() {
  return window.location.hash.startsWith('#/admin');
}

function isNextOfKinRoute() {
  return window.location.hash.startsWith('#/next-of-kin');
}

function portalMetaForRoute() {
  if (isAgentRoute()) {
    return {
      title: 'Bumu Paygo Agent Portal',
      manifest: '/manifest-agent.webmanifest',
      appleTitle: 'Bumu Agent',
      description: 'Agent workspace for Bumu Paygo customer registration, deposit prompts, follow-up, and commissions.'
    };
  }

  if (isCustomerRoute()) {
    return {
      title: 'Bumu Paygo Customer Portal',
      manifest: '/manifest-customer.webmanifest',
      appleTitle: 'Bumu Customer',
      description: 'Customer app for Bumu Paygo balances, M-Pesa payments, payment history, and account alerts.'
    };
  }

  return {
    title: 'Bumu Paygo',
    manifest: '/manifest.webmanifest',
    appleTitle: 'Bumu Paygo',
    description: 'Bumu Paygo customer and agent PAYGO product portals.'
  };
}

function buildDailyPaymentNotifications(payments) {
  const dailyRecords = payments.reduce((days, payment) => {
    const date = payment.date?.slice(0, 10) || new Date().toISOString().slice(0, 10);
    const current = days.get(date) ?? {
      date,
      recordCount: 0,
      paidCount: 0,
      unpaidCount: 0,
      collected: 0,
      unpaidBalance: 0,
      agents: new Map(),
      customers: []
    };
    const collected = Number(payment.depositCredit || 0) + Number(payment.paygoPayment || 0);
    const agentName = payment.agentName || 'No agent';
    const agentCode = payment.agentId || 'No code';
    const agentKey = `${agentName}-${agentCode}`;
    const agentRecord = current.agents.get(agentKey) ?? {
      agentName,
      agentCode,
      recordCount: 0
    };

    current.recordCount += 1;
    current.collected += collected;
    agentRecord.recordCount += 1;
    current.agents.set(agentKey, agentRecord);
    current.customers.push({
      customerName: payment.customerName || 'No customer name',
      customerPhone: payment.customerPhone || 'No phone',
      status: payment.status === 'paid' ? 'Paid' : 'Unpaid',
      paygoState: payment.paygoState || 'follow_up',
      amount: formatKes(collected),
      receipt: payment.receipt || 'No receipt',
      agentName,
      agentCode
    });

    if (payment.status === 'paid') {
      current.paidCount += 1;
    } else {
      current.unpaidCount += 1;
      current.unpaidBalance += Number(payment.balance ?? payment.totalPayable ?? 0);
    }

    days.set(date, current);
    return days;
  }, new Map());

  return [...dailyRecords.values()]
    .sort((first, second) => second.date.localeCompare(first.date))
    .map((record) => {
      const agentSummary = [...record.agents.values()]
        .map((agent) => `${agent.agentName} / ${agent.agentCode} (${agent.recordCount})`)
        .join('\n');
      const customerSummary = record.customers
        .map((customer) =>
          `${customer.customerName} - ${customer.status} ${customer.amount} (${customer.receipt})`
        )
        .join('\n');
      const customerActivities = record.customers.map((customer) => ({
        label: customer.customerName,
        value: `${customer.status} | Paid today ${customer.amount} | Account ${customer.paygoState.replaceAll('_', ' ')} | ${customer.receipt}`
      }));
      const customerNames = record.customers.map((customer) => customer.customerName).join(', ');

      return {
        id: `payment-daily-${record.date}`,
        type: 'payment_daily',
        title: `Daily payment activity: ${formatDate(record.date)}`,
        message: `${customerNames}: ${record.recordCount} records, ${record.paidCount} paid, ${record.unpaidCount} unpaid.`,
        issue: `Collected ${formatKes(record.collected)}. Unpaid balance ${formatKes(record.unpaidBalance)}.`,
        followUp: record.unpaidCount > 0
          ? 'Follow up unpaid customers and confirm the next collection action.'
          : 'No unpaid payment follow-up needed for this day.',
        paymentDate: formatDate(record.date),
        recordCount: record.recordCount,
        paidCount: record.paidCount,
        unpaidCount: record.unpaidCount,
        paymentStatusSummary: `${record.paidCount} paid, ${record.unpaidCount} unpaid`,
        collectedAmount: formatKes(record.collected),
        unpaidBalance: formatKes(record.unpaidBalance),
        agentSummary,
        customerSummary,
        customerActivities,
        sourcePortal: 'Payment records',
        createdAt: `${record.date}T18:00:00`,
        isRead: false
      };
    });
}

export function App() {
  const [authenticated, setAuthenticated] = useState(() => Boolean(getAuthToken()));
  const [authChecked, setAuthChecked] = useState(false);
  const [authRouteActive, setAuthRouteActive] = useState(isAuthRoute);
  const [customerRouteActive, setCustomerRouteActive] = useState(isCustomerRoute);
  const [agentRouteActive, setAgentRouteActive] = useState(isAgentRoute);
  const [adminRouteActive, setAdminRouteActive] = useState(isAdminRoute);
  const [nextOfKinRouteActive, setNextOfKinRouteActive] = useState(isNextOfKinRoute);
  const [activeScreen, setActiveScreen] = useState(
    () => window.sessionStorage.getItem('bumu-active-screen') || 'dashboard'
  );
  const [profilePhoto, setProfilePhoto] = useState(
    () => window.sessionStorage.getItem('bumu-profile-photo') || ''
  );
  const [profileSettings, setProfileSettings] = useState(() => ({
    name: '',
    role: '',
    phone: '',
    branch: '',
    ...readProfileSettings()
  }));
  const [themeMode, setThemeMode] = useState('light');
  const [appLayout, setAppLayout] = useState('App view');
  const [toastMessage, setToastMessage] = useState('');
  const [notifications, setNotifications] = useState([]);
  const { canInstall, install } = useInstallPrompt();

  const refreshDailyPaymentNotifications = useCallback(() => {
    return Promise.all([
      paymentService.listPayments(),
      notificationService.listNotifications()
    ])
      .then(([payments, backendNotifications]) => {
        const dailyNotifications = buildDailyPaymentNotifications(payments);
        setNotifications((current) => {
          const existingById = new Map(current.map((item) => [item.id, item]));
          const mergedDailyNotifications = dailyNotifications.map((item) => ({
            ...item,
            isRead: existingById.get(item.id)?.isRead ?? item.isRead
          }));
          const mergedBackendNotifications = backendNotifications.map((item) => ({
            ...item,
            isRead: existingById.get(item.id)?.isRead ?? item.isRead
          }));
          const generatedIds = new Set([
            ...mergedDailyNotifications.map((item) => item.id),
            ...mergedBackendNotifications.map((item) => item.id)
          ]);
          const otherNotifications = current.filter((item) => !generatedIds.has(item.id) && item.type !== 'payment_daily');

          return [...mergedBackendNotifications, ...mergedDailyNotifications, ...otherNotifications]
            .sort((first, second) => String(second.createdAt || '').localeCompare(String(first.createdAt || '')));
        });
      })
      .catch(() => {});
  }, []);

  const refreshPaymentActivity = useCallback(() => {
    return refreshDailyPaymentNotifications();
  }, [refreshDailyPaymentNotifications]);

  useEffect(() => {
    function handleHashChange() {
      setAuthRouteActive(isAuthRoute());
      setCustomerRouteActive(isCustomerRoute());
      setAgentRouteActive(isAgentRoute());
      setAdminRouteActive(isAdminRoute());
      setNextOfKinRouteActive(isNextOfKinRoute());
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  useEffect(() => {
    const meta = portalMetaForRoute();
    const manifestLink = document.querySelector('link[rel="manifest"]');
    const appleTitle = document.querySelector('meta[name="apple-mobile-web-app-title"]');
    const description = document.querySelector('meta[name="description"]');

    document.title = meta.title;
    manifestLink?.setAttribute('href', meta.manifest);
    appleTitle?.setAttribute('content', meta.appleTitle);
    description?.setAttribute('content', meta.description);
  }, [customerRouteActive, agentRouteActive, adminRouteActive, nextOfKinRouteActive, authRouteActive]);

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
    document.documentElement.style.colorScheme = themeMode;
  }, [themeMode]);

  useEffect(() => {
    window.sessionStorage.setItem('bumu-active-screen', activeScreen);
  }, [activeScreen]);

  useEffect(() => {
    if (profilePhoto) {
      window.sessionStorage.setItem('bumu-profile-photo', profilePhoto);
    }
  }, [profilePhoto]);

  useEffect(() => {
    if (!getAuthToken()) {
      setAuthChecked(true);
      setAuthenticated(false);
      return;
    }

    authService.currentUser()
      .then((user) => {
        setAuthenticated(user.role === 'finance' || user.role === 'admin');
      })
      .catch(() => {
        authService.logout();
        setAuthenticated(false);
      })
      .finally(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    if (!authenticated) return;

    refreshDailyPaymentNotifications();
  }, [authenticated, refreshDailyPaymentNotifications, refreshPaymentActivity]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications]
  );

  function handleLogout() {
    authService.logout();
    window.sessionStorage.removeItem('bumu-active-screen');
    setAuthenticated(false);
    setActiveScreen('dashboard');
  }

  function handleLogin() {
    setAuthenticated(true);
  }

  if (!authChecked) {
    return (
      <View
        className="app-viewport"
        style={{ alignItems: 'center', justifyContent: 'center', backgroundColor: 'var(--app-bg)' }}
      >
        <Text style={{ color: 'var(--app-muted)' }}>Loading finance portal...</Text>
      </View>
    );
  }

  if (customerRouteActive) {
    return <CustomerPortalScreen canInstall={canInstall} onInstall={install} />;
  }

  if (nextOfKinRouteActive) {
    return <NextOfKinAcceptScreen />;
  }

  if (agentRouteActive) {
    return <AgentPortalScreen canInstall={canInstall} onInstall={install} />;
  }

  if (adminRouteActive) {
    return <UploadedAdminPortalScreen />;
  }

  if (!authenticated) {
    return authRouteActive ? <LoginScreen onLogin={handleLogin} /> : <PortalLandingScreen />;
  }

  function handleThemeModeChange(nextTheme) {
    setThemeMode(nextTheme);
    setToastMessage(`${nextTheme === 'dark' ? 'Dark' : 'Light'} theme applied`);
  }

  function handleAppLayoutChange(nextLayout) {
    setAppLayout(nextLayout);
    setToastMessage(`${nextLayout} applied`);
  }

  return (
    <View
      className="app-viewport"
      data-theme={themeMode}
      data-layout={appLayout === 'Compact view' ? 'compact' : 'app'}
      style={{ backgroundColor: 'var(--app-bg)' }}
    >
      <AppShell
        activeScreen={activeScreen}
        onNavigate={setActiveScreen}
        onLogout={handleLogout}
        unreadCount={unreadCount}
        profilePhoto={profilePhoto}
        appLayout={appLayout}
        canInstall={canInstall}
        onInstall={install}
        profileSettings={profileSettings}
      >
        {activeScreen === 'dashboard' && (
          <DashboardScreen onNavigate={setActiveScreen} notifications={notifications} />
        )}
        {activeScreen === 'payments' && <PaymentsScreen onPaymentRecordsChange={refreshPaymentActivity} />}
        {activeScreen === 'customers' && <CustomersScreen />}
        {activeScreen === 'commissions' && <CommissionsScreen />}
        {activeScreen === 'reports' && <ReportsScreen />}
        {activeScreen === 'reconciliation' && <ReconciliationScreen />}
        {activeScreen === 'notifications' && (
          <NotificationsScreen
            notifications={notifications}
            onNotificationsChange={setNotifications}
          />
        )}
        {activeScreen === 'settings' && (
          <SettingsScreen
            profilePhoto={profilePhoto}
            onProfilePhotoChange={setProfilePhoto}
            onProfileSettingsChange={setProfileSettings}
            onStatusMessage={setToastMessage}
            themeMode={themeMode}
            onThemeModeChange={handleThemeModeChange}
            appLayout={appLayout}
            onAppLayoutChange={handleAppLayoutChange}
            canInstall={canInstall}
            onInstall={install}
          />
        )}
      </AppShell>
      <Toast message={toastMessage} onClose={() => setToastMessage('')} />
    </View>
  );
}
