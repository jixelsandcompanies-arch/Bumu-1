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

export function App() {
  const [authenticated, setAuthenticated] = useState(
    () => window.localStorage.getItem('bumu-authenticated') === 'true'
  );
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
            message: 'Finance could not reach the Supabase database. Check the project URL, anon key, and table policies.',
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
  }, []);

  const unreadCount = useMemo(
    () => notifications.filter((notification) => !notification.isRead).length,
    [notifications]
  );

  function handleLogout() {
    window.localStorage.removeItem('bumu-authenticated');
    window.localStorage.removeItem('bumu-active-screen');
    setAuthenticated(false);
    setActiveScreen('dashboard');
  }

  function handleLogin() {
    window.localStorage.setItem('bumu-authenticated', 'true');
    setAuthenticated(true);
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
