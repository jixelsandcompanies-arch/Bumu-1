import { useEffect, useRef, useState } from "react";
import {
  Bell,
  Gauge,
  LockKeyhole,
  MessageSquareText,
  ShieldCheck,
  WalletCards
} from "lucide-react";
import { PageHeader } from "../../components/ui/PageHeader.jsx";
import { getAdminToken } from "../../features/auth/AuthContext.jsx";

const sections = [
  { id: "admin", label: "Admin system", icon: Gauge },
  { id: "access", label: "Access control", icon: ShieldCheck },
  { id: "security", label: "Security", icon: LockKeyhole },
  { id: "reminders", label: "Reminders", icon: Bell },
  { id: "finance", label: "Finance", icon: WalletCards },
  { id: "messages", label: "Messages", icon: MessageSquareText }
];

const rolePolicies = [
  ["Super admin", "Full admin access, settings, audit, overrides, users, bike inventory"],
  ["Back office", "Screening queue, KYC review, approve, reject, request info"],
  ["Finance", "Payments, reconciliation, reports, commissions"],
  ["Agent", "Customer onboarding, portfolio, commission visibility"]
];

const smsTemplates = [
  ["Application approved", "Congratulations! {Name}'s application has been approved."],
  ["Application rejected", "Application for {Name} was rejected. Reason: {Reason}."],
  ["Info required", "More information is needed for {Name}: {Details}."],
  ["Payment reminder", "Reminder: KES {Amount} is due on {Date}."],
  ["Overdue alert", "Your account is {Days} days overdue. Pay KES {Amount}."],
  ["Commission paid", "Commission of KES {Amount} has been paid. Ref: {Ref}."]
];

const defaultSettings = {
  admin: {
    defaultLandingPage: "/admin/overview",
    dashboardRefreshInterval: "manual",
    auditRetentionPeriod: "immutable",
    showFinanceSummary: true,
    showNotificationCount: true,
    requireAuditNote: true
  },
  access: {
    policies: Object.fromEntries(rolePolicies)
  },
  security: {
    otpExpiryMinutes: "10",
    maximumOtpAttempts: "3",
    sessionTimeoutMinutes: "30",
    otpAtLogin: true,
    otpForCriticalActions: true,
    otpForNextOfKin: true
  },
  reminders: {
    reminderDaysBeforeDueDate: "3",
    overdueAlertFrequencyDays: "1",
    notifyCustomerBeforeDueDate: true,
    notifyAgentWhenOverdue: true,
    notifyCustomerAfterPayment: true
  },
  finance: {
    registrationCommission: "1500",
    activeCustomerCommission: "500",
    commissionApproval: "finance_review"
  },
  messages: {
    templates: Object.fromEntries(smsTemplates)
  }
};

function mergeSectionDefaults(sectionId, values = {}) {
  if (sectionId === "access") {
    return {
      policies: {
        ...defaultSettings.access.policies,
        ...(values.policies || values)
      }
    };
  }

  if (sectionId === "messages") {
    return {
      templates: {
        ...defaultSettings.messages.templates,
        ...(values.templates || values)
      }
    };
  }

  return { ...defaultSettings[sectionId], ...values };
}

async function settingsRequest(section, { method = "GET", values } = {}) {
  const response = await fetch(`/api/admin/settings/${encodeURIComponent(section)}`, {
    method,
    headers: {
      Accept: "application/json",
      ...(values ? { "Content-Type": "application/json" } : {}),
      Authorization: `Bearer ${getAdminToken()}`
    },
    ...(values ? { body: JSON.stringify({ values }) } : {})
  });
  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(data.message || `Settings request failed with HTTP ${response.status}.`);
  }

  return data.setting;
}

export default function Settings() {
  const [activeSection, setActiveSection] = useState("admin");
  const [saveMessage, setSaveMessage] = useState("");
  const [settings, setSettings] = useState(defaultSettings);
  const [loadingSection, setLoadingSection] = useState(false);
  const saveTimers = useRef({});

  function applySettingsImmediately(nextSettings) {
    window.localStorage.setItem("bumu-admin-settings", JSON.stringify(nextSettings));
    window.dispatchEvent(new CustomEvent("bumu-admin-settings-changed", { detail: nextSettings }));
  }

  useEffect(() => {
    let active = true;

    async function loadSection() {
      setLoadingSection(true);

      try {
        const data = await settingsRequest(activeSection);
        if (!active) return;
        if (data?.values) {
          setSettings((current) => {
            const nextSettings = {
              ...current,
              [activeSection]: mergeSectionDefaults(activeSection, data.values)
            };
            applySettingsImmediately(nextSettings);
            return nextSettings;
          });
        }
        setSaveMessage("");
      } catch (error) {
        if (!active) return;
        setSaveMessage(error.message);
      } finally {
        if (active) setLoadingSection(false);
      }
    }

    loadSection();

    return () => {
      active = false;
    };
  }, [activeSection]);

  function updateSection(sectionId, nextValues) {
    setSettings((current) => {
      const mergedSection = {
        ...current[sectionId],
        ...nextValues
      };
      const nextSettings = {
        ...current,
        [sectionId]: mergedSection
      };

      applySettingsImmediately(nextSettings);
      window.clearTimeout(saveTimers.current[sectionId]);
      saveTimers.current[sectionId] = window.setTimeout(async () => {
        try {
          const data = await settingsRequest(sectionId, { method: "PUT", values: mergedSection });
          if (data?.values) {
            setSettings((latest) => {
              const savedSettings = {
                ...latest,
                [sectionId]: mergeSectionDefaults(sectionId, data.values)
              };
              applySettingsImmediately(savedSettings);
              return savedSettings;
            });
          }
          setSaveMessage(`${sections.find((section) => section.id === sectionId)?.label} applied and saved.`);
        } catch (error) {
          setSaveMessage(`${sections.find((section) => section.id === sectionId)?.label} changed locally but could not be saved: ${error.message}`);
        }
      }, 650);

      return nextSettings;
    });
  }

  async function saveActiveSection() {
    const sectionLabel = sections.find((section) => section.id === activeSection)?.label;
    const values = settings[activeSection];

    try {
      const data = await settingsRequest(activeSection, { method: "PUT", values });
      if (data?.values) {
        setSettings((current) => {
          const nextSettings = {
            ...current,
            [activeSection]: mergeSectionDefaults(activeSection, data.values)
          };
          applySettingsImmediately(nextSettings);
          return nextSettings;
        });
      }
      setSaveMessage(`${sectionLabel} saved to system settings.`);
    } catch (error) {
      setSaveMessage(`${sectionLabel} could not be saved: ${error.message}`);
    }
  }

  return (
    <section className="page-stack settings-page">
      <PageHeader
        eyebrow="System settings"
        title="Admin configuration"
        description="Choose a setting category and update only that section."
        actions={
          <button className="button primary" type="button" disabled={loadingSection} onClick={saveActiveSection}>
            Save section
          </button>
        }
      />

      {saveMessage ? <div className="alert soft">{saveMessage}</div> : null}
      {loadingSection ? <div className="alert soft">Loading saved settings...</div> : null}

      <div className="settings-layout">
        <aside className="settings-index panel">
          {sections.map((section) => {
            const Icon = section.icon;
            return (
              <button
                className={`settings-tab ${activeSection === section.id ? "is-active" : ""}`}
                key={section.id}
                type="button"
                onClick={() => setActiveSection(section.id)}
              >
                <Icon size={18} />
                <span>{section.label}</span>
              </button>
            );
          })}
        </aside>

        <div className="settings-stack">
          {activeSection === "admin" ? (
            <AdminSystemSettings values={settings.admin} onChange={(values) => updateSection("admin", values)} />
          ) : null}
          {activeSection === "access" ? (
            <AccessSettings values={settings.access} onChange={(values) => updateSection("access", values)} />
          ) : null}
          {activeSection === "security" ? (
            <SecuritySettings values={settings.security} onChange={(values) => updateSection("security", values)} />
          ) : null}
          {activeSection === "reminders" ? (
            <ReminderSettings values={settings.reminders} onChange={(values) => updateSection("reminders", values)} />
          ) : null}
          {activeSection === "finance" ? (
            <FinanceSettings values={settings.finance} onChange={(values) => updateSection("finance", values)} />
          ) : null}
          {activeSection === "messages" ? (
            <MessageSettings values={settings.messages} onChange={(values) => updateSection("messages", values)} />
          ) : null}
        </div>
      </div>
    </section>
  );
}

function AdminSystemSettings({ values, onChange }) {
  return (
    <article className="settings-card">
      <div className="settings-card-header">
        <div>
          <p className="eyebrow">Admin system</p>
          <h3>Portal behaviour</h3>
        </div>
      </div>

      <div className="settings-form">
        <label>
          Default landing page
          <select
            value={values.defaultLandingPage}
            onChange={(event) => onChange({ defaultLandingPage: event.target.value })}
          >
            <option value="/admin/overview">Overview</option>
            <option value="/admin/applications">Screening queue</option>
            <option value="/admin/finance">Finance</option>
          </select>
        </label>
        <label>
          Dashboard refresh interval
          <select
            value={values.dashboardRefreshInterval}
            onChange={(event) => onChange({ dashboardRefreshInterval: event.target.value })}
          >
            <option value="manual">Manual refresh</option>
            <option value="60">Every 60 seconds</option>
            <option value="300">Every 5 minutes</option>
          </select>
        </label>
        <label>
          Audit retention period
          <select
            value={values.auditRetentionPeriod}
            onChange={(event) => onChange({ auditRetentionPeriod: event.target.value })}
          >
            <option value="immutable">Immutable records</option>
            <option value="365">365 days</option>
            <option value="730">730 days</option>
          </select>
        </label>
      </div>

      <div className="toggle-list">
        <label>
          <input
            type="checkbox"
            checked={values.showFinanceSummary}
            onChange={(event) => onChange({ showFinanceSummary: event.target.checked })}
          />
          Show finance summary on overview
        </label>
        <label>
          <input
            type="checkbox"
            checked={values.showNotificationCount}
            onChange={(event) => onChange({ showNotificationCount: event.target.checked })}
          />
          Show notification count in admin
        </label>
        <label>
          <input
            type="checkbox"
            checked={values.requireAuditNote}
            onChange={(event) => onChange({ requireAuditNote: event.target.checked })}
          />
          Require audit note for critical changes
        </label>
      </div>
    </article>
  );
}

function AccessSettings({ values, onChange }) {
  function updatePolicy(role, access) {
    onChange({
      policies: {
        ...values.policies,
        [role]: access
      }
    });
  }

  return (
    <article className="settings-card">
      <div className="settings-card-header">
        <div>
          <p className="eyebrow">Access control</p>
          <h3>Role permissions</h3>
        </div>
      </div>

      <div className="permission-list">
        {rolePolicies.map(([role, access]) => (
          <div className="permission-row editable-row" key={role}>
            <strong>{role}</strong>
            <input
              value={values.policies[role] || access}
              aria-label={`${role} permissions`}
              onChange={(event) => updatePolicy(role, event.target.value)}
            />
          </div>
        ))}
      </div>
    </article>
  );
}

function SecuritySettings({ values, onChange }) {
  return (
    <article className="settings-card">
      <div className="settings-card-header">
        <div>
          <p className="eyebrow">Security</p>
          <h3>OTP and sessions</h3>
        </div>
      </div>

      <div className="settings-form">
        <label>
          OTP expiry minutes
          <input
            type="number"
            value={values.otpExpiryMinutes}
            min="1"
            max="30"
            onChange={(event) => onChange({ otpExpiryMinutes: event.target.value })}
          />
        </label>
        <label>
          Maximum OTP attempts
          <input
            type="number"
            value={values.maximumOtpAttempts}
            min="1"
            max="5"
            onChange={(event) => onChange({ maximumOtpAttempts: event.target.value })}
          />
        </label>
        <label>
          Session timeout minutes
          <input
            type="number"
            value={values.sessionTimeoutMinutes}
            min="5"
            max="120"
            onChange={(event) => onChange({ sessionTimeoutMinutes: event.target.value })}
          />
        </label>
      </div>

      <div className="toggle-list">
        <label>
          <input
            type="checkbox"
            checked={values.otpAtLogin}
            onChange={(event) => onChange({ otpAtLogin: event.target.checked })}
          />
          OTP at login
        </label>
        <label>
          <input
            type="checkbox"
            checked={values.otpForCriticalActions}
            onChange={(event) => onChange({ otpForCriticalActions: event.target.checked })}
          />
          OTP for critical actions
        </label>
        <label>
          <input
            type="checkbox"
            checked={values.otpForNextOfKin}
            onChange={(event) => onChange({ otpForNextOfKin: event.target.checked })}
          />
          OTP for next-of-kin verification
        </label>
      </div>
    </article>
  );
}

function ReminderSettings({ values, onChange }) {
  return (
    <article className="settings-card">
      <div className="settings-card-header">
        <div>
          <p className="eyebrow">Reminders</p>
          <h3>Payment alerts</h3>
        </div>
      </div>

      <div className="settings-form">
        <label>
          Reminder days before due date
          <input
            type="number"
            value={values.reminderDaysBeforeDueDate}
            min="1"
            max="14"
            onChange={(event) => onChange({ reminderDaysBeforeDueDate: event.target.value })}
          />
        </label>
        <label>
          Overdue alert frequency days
          <input
            type="number"
            value={values.overdueAlertFrequencyDays}
            min="1"
            max="7"
            onChange={(event) => onChange({ overdueAlertFrequencyDays: event.target.value })}
          />
        </label>
      </div>

      <div className="toggle-list">
        <label>
          <input
            type="checkbox"
            checked={values.notifyCustomerBeforeDueDate}
            onChange={(event) => onChange({ notifyCustomerBeforeDueDate: event.target.checked })}
          />
          Notify customer before due date
        </label>
        <label>
          <input
            type="checkbox"
            checked={values.notifyAgentWhenOverdue}
            onChange={(event) => onChange({ notifyAgentWhenOverdue: event.target.checked })}
          />
          Notify agent when customer is overdue
        </label>
        <label>
          <input
            type="checkbox"
            checked={values.notifyCustomerAfterPayment}
            onChange={(event) => onChange({ notifyCustomerAfterPayment: event.target.checked })}
          />
          Notify customer after successful payment
        </label>
      </div>
    </article>
  );
}

function FinanceSettings({ values, onChange }) {
  return (
    <article className="settings-card">
      <div className="settings-card-header">
        <div>
          <p className="eyebrow">Finance</p>
          <h3>Commission defaults</h3>
        </div>
      </div>

      <div className="settings-form">
        <label>
          Registration commission
          <input
            type="number"
            value={values.registrationCommission}
            min="0"
            onChange={(event) => onChange({ registrationCommission: event.target.value })}
          />
        </label>
        <label>
          Active customer commission
          <input
            type="number"
            value={values.activeCustomerCommission}
            min="0"
            onChange={(event) => onChange({ activeCustomerCommission: event.target.value })}
          />
        </label>
        <label>
          Commission approval
          <select
            value={values.commissionApproval}
            onChange={(event) => onChange({ commissionApproval: event.target.value })}
          >
            <option value="finance_review">Finance review required</option>
            <option value="auto">Auto approve after activation</option>
          </select>
        </label>
      </div>
    </article>
  );
}

function MessageSettings({ values, onChange }) {
  function updateTemplate(title, message) {
    onChange({
      templates: {
        ...values.templates,
        [title]: message
      }
    });
  }

  return (
    <article className="settings-card">
      <div className="settings-card-header">
        <div>
          <p className="eyebrow">Messages</p>
          <h3>SMS templates</h3>
        </div>
      </div>

      <div className="message-template-list">
        {smsTemplates.map(([title, message]) => (
          <label className="message-template" key={title}>
            {title}
            <textarea
              rows="3"
              value={values.templates[title] || message}
              onChange={(event) => updateTemplate(title, event.target.value)}
            />
          </label>
        ))}
      </div>
    </article>
  );
}
