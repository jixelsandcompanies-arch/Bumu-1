import { useEffect, useState } from "react";
import { PageHeader } from "../../uploadedAdmin/components/ui/PageHeader.jsx";
import { StatCard } from "../../uploadedAdmin/components/ui/StatCard.jsx";
import { Save, Bell, ShieldCheck, RefreshCw } from "lucide-react";

const storageKey = "bumu-backoffice-settings";
const defaultSettings = {
  autoRefresh: true,
  emailAlerts: true,
  inAppAlerts: true,
  showCompletedCases: true
};

function loadSettings() {
  try {
    const value = window.localStorage.getItem(storageKey);
    return value ? JSON.parse(value) : defaultSettings;
  } catch {
    return defaultSettings;
  }
}

export default function BackOfficeSettings() {
  const [settings, setSettings] = useState(defaultSettings);
  const [message, setMessage] = useState("");

  useEffect(() => {
    setSettings(loadSettings());
  }, []);

  function updateSetting(key, value) {
    setSettings((current) => ({ ...current, [key]: value }));
  }

  function saveSettings() {
    window.localStorage.setItem(storageKey, JSON.stringify(settings));
    setMessage("Workspace preferences saved.");
  }

  function resetDefaults() {
    setSettings(defaultSettings);
    setMessage("Default preferences restored.");
  }

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Settings"
        title="Workspace preferences"
        description="Configure how the Back Office screening workspace behaves, what notifications you receive, and how cases are grouped." 
      />

      {message ? <div className="alert soft">{message}</div> : null}

      <div className="stats-grid">
        <StatCard icon={ShieldCheck} label="Screening safety" value={settings.showCompletedCases ? "Full" : "Focused"} detail="Case view mode" />
        <StatCard icon={Bell} label="Notifications" value={settings.inAppAlerts ? "Active" : "Muted"} detail="In-app alerts" />
        <StatCard icon={RefreshCw} label="Auto refresh" value={settings.autoRefresh ? "On" : "Off"} detail="Queue refresh" />
        <StatCard icon={Save} label="Save state" value="Local" detail="Browser preferences" />
      </div>

      <article className="panel settings-page">
        <div className="settings-card-header">
          <div>
            <p className="eyebrow">Notifications</p>
            <h3>Alert preferences</h3>
          </div>
        </div>
        <div className="settings-form">
          <label className="field-block">
            <input
              type="checkbox"
              checked={settings.emailAlerts}
              onChange={(event) => updateSetting("emailAlerts", event.target.checked)}
            />
            Receive email alerts when a case is returned for information.
          </label>
          <label className="field-block">
            <input
              type="checkbox"
              checked={settings.inAppAlerts}
              onChange={(event) => updateSetting("inAppAlerts", event.target.checked)}
            />
            Show in-app screening notifications in the Back Office portal.
          </label>
          <label className="field-block">
            <input
              type="checkbox"
              checked={settings.autoRefresh}
              onChange={(event) => updateSetting("autoRefresh", event.target.checked)}
            />
            Refresh the screening queue automatically every 15 seconds.
          </label>
          <label className="field-block">
            <input
              type="checkbox"
              checked={settings.showCompletedCases}
              onChange={(event) => updateSetting("showCompletedCases", event.target.checked)}
            />
            Include completed screening cases in the overview metrics.
          </label>
        </div>
      </article>

      <div className="page-actions">
        <button className="button primary" type="button" onClick={saveSettings}>Save settings</button>
        <button className="button secondary" type="button" onClick={resetDefaults}>Restore defaults</button>
      </div>
    </section>
  );
}
