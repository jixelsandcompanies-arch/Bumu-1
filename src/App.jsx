import React, { useEffect, useMemo, useState } from 'react';
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
import { useInstallPrompt } from './hooks/useInstallPrompt.js';
import { Toast } from './components/ui/Toast.jsx';
import { agentPortalService } from './services/agentPortalService.js';
import { authService } from './services/authService.js';
import { getAuthToken } from './services/api.js';

export function App() {
  const [authenticated, setAuthenticated] = useState(() => Boolean(getAuthToken()));
  const [authChecked, setAuthChecked] = useState(false);
  const [activeScreen, setActiveScreen] = useState(
    () => window.localStorage.getItem('bumu-active-screen') || 'dashboard'
  );
  const [profilePhoto, setProfilePhoto] = useState(
    () => window.localStorage.getItem('bumu-profile-photo') || ''
  );
  const [themeMode, setThemeMode] = useState('light');
  const [appLayout, setAppLayout] = useState('App view');
  const [toastMessage, setToastMessage] = useState('');
  const [notifications, setNotifications] = useState([]);
  const { canInstall, install } = useInstallPrompt();

  useEffect(() => {
    document.documentElement.dataset.theme = themeMode;
    document.documentElement.style.colorScheme = themeMode;
  }, [themeMode]);

  useEffect(() => {
    window.localStorage.setItem('bumu-active-screen', activeScreen);
  }, [activeScreen]);

  useEffect(() => {
    if (profilePhoto) {
      window.localStorage.setItem('bumu-profile-photo', profilePhoto);
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
        setAuthenticated(user.role === 'finance');
      })
      .catch(() => {
        authService.logout();
        setAuthenticated(false);
      })
      .finally(() => setAuthChecked(true));
  }, []);

  useEffect(() => {
    if (!authenticated) return;

    agentPortalService.healthCheck().then((health) => {
      if (health.ok) return;

      setNotifications((items) => {
        if (items.some((item) => item.id === 'SYS-AGENT-PORTAL-SYNC')) {
          return items;
        }

        return [
          {
            id: 'SYS-AGENT-PORTAL-SYNC',
            type: 'integration',
            title: 'Supabase connection issue',
            message: 'Finance could not reach the secured backend database. Check Vercel environment variables and Supabase availability.',
            createdAt: new Date().toISOString(),
            isRead: false,
            relatedEntityType: 'system',
            sourcePortal: 'Supabase',
            issue: health.error,
            followUp: 'Check SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in the backend environment, plus Supabase availability.'
          },
          ...items
        ];
      });
    });
  }, [authenticated]);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications]
  );

  function handleLogout() {
    authService.logout();
    window.localStorage.removeItem('bumu-active-screen');
    setAuthenticated(false);
    setActiveScreen('dashboard');
  }

  function handleLogin() {
    setAuthenticated(true);
  }

  if (!authChecked) {
    return null;
  }

  if (!authenticated) {
    return <LoginScreen onLogin={handleLogin} />;
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
      data-theme={themeMode}
      data-layout={appLayout === 'Compact view' ? 'compact' : 'app'}
      style={{ height: '100dvh', width: '100vw', overflow: 'hidden', backgroundColor: 'var(--app-bg)' }}
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
      >
        {activeScreen === 'dashboard' && (
          <DashboardScreen onNavigate={setActiveScreen} notifications={notifications} />
        )}
        {activeScreen === 'payments' && <PaymentsScreen />}
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
