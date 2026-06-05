import { useEffect, useMemo, useState } from "react";
import {
  createPaymentNotification,
  createPaymentRequest,
  createPasswordResetRequest,
  emptyPortalData,
  getCurrentUser,
  isSupabaseConfigured,
  loadCustomerPortal,
  signInCustomer,
  signOutCustomer
} from "./lib/portalRepository";

function formatKes(amount) {
  return `KES ${Number(amount || 0).toLocaleString("en-KE")}`;
}

function formatValue(value, fallback = "Not set") {
  return value || fallback;
}

function App() {
  const [page, setPage] = useState("dashboard");
  const [portalData, setPortalData] = useState(emptyPortalData);
  const [isLoading, setIsLoading] = useState(true);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [setupError, setSetupError] = useState("");
  const [authError, setAuthError] = useState("");

  async function refreshPortal() {
    setIsLoading(true);
    try {
      const result = await loadCustomerPortal();
      setPortalData(result.data);
      setSetupError(result.error || "");
    } catch (error) {
      setSetupError(error.message);
      setPortalData(emptyPortalData());
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    async function checkAuth() {
      if (!isSupabaseConfigured) {
        setSetupError("Supabase is not configured. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY.");
        setIsLoading(false);
        return;
      }

      const user = await getCurrentUser();
      if (!user) {
        setIsAuthenticated(false);
        setIsLoading(false);
        return;
      }

      setIsAuthenticated(true);
      await refreshPortal();
    }

    checkAuth();
  }, []);

  async function handleLogin({ email, password }) {
    setAuthError("");
    setIsLoading(true);

    try {
      await signInCustomer({ email, password });
      setIsAuthenticated(true);
      setPage("dashboard");
      await refreshPortal();
    } catch (error) {
      setAuthError(error.message);
      setIsAuthenticated(false);
      setIsLoading(false);
    }
  }

  async function handleLogout() {
    await signOutCustomer();
    setPortalData(emptyPortalData());
    setIsAuthenticated(false);
    setPage("dashboard");
  }

  if (isLoading) {
    return <SystemState title="Loading portal" text="Preparing customer records from Supabase." />;
  }

  if (!isAuthenticated) {
    return <LoginPage onLogin={handleLogin} errorMessage={authError || setupError} />;
  }

  if (setupError) {
    return <SystemState title="Supabase setup required" text={setupError} />;
  }

  const customer = portalData.customer;

  if (!customer) {
    return <SystemState title="No customer record" text="Add a customer and bike record in Supabase to open this portal." />;
  }

  const sharedProps = {
    customer,
    portalData,
    onNavigate: setPage,
    onRefresh: refreshPortal,
    onLogout: handleLogout
  };

  if (page === "payment") return <PaymentPage {...sharedProps} />;
  if (page === "history") return <PaymentHistoryPage {...sharedProps} />;
  if (page === "rider") return <RiderPage {...sharedProps} />;
  if (page === "notifications") return <NotificationsPage {...sharedProps} />;
  if (page === "profile") return <ProfilePage {...sharedProps} />;
  if (page === "settings") return <SettingsPage {...sharedProps} />;

  return <DashboardPage {...sharedProps} />;
}

function SystemState({ title, text }) {
  return (
    <main className="auth-page">
      <section className="auth-panel">
        <p className="brand-kicker">Bumu PayGo</p>
        <h1>{title}</h1>
        <p>{text}</p>
      </section>
    </main>
  );
}

function LoginPage({ onLogin, errorMessage }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [resetEmail, setResetEmail] = useState("");
  const [resetPhone, setResetPhone] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [mode, setMode] = useState("login");
  const [localError, setLocalError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const isResetMode = mode === "reset";

  async function handleSubmit(event) {
    event.preventDefault();
    setLocalError("");
    setSuccessMessage("");

    if (!email.trim() || !password) {
      setLocalError("Enter your email and password.");
      return;
    }

    setIsSubmitting(true);
    await onLogin({ email: email.trim(), password });
    setIsSubmitting(false);
  }

  async function handleResetSubmit(event) {
    event.preventDefault();
    setLocalError("");
    setSuccessMessage("");

    if (!resetEmail.trim() || !resetPhone.trim()) {
      setLocalError("Enter your email address and phone number.");
      return;
    }

    setIsSubmitting(true);
    try {
      await createPasswordResetRequest({
        email: resetEmail.trim(),
        phone: resetPhone.trim()
      });
      setSuccessMessage("Request sent. Admin will send your OTP before your new password is created.");
      setResetEmail("");
      setResetPhone("");
    } catch (error) {
      setLocalError(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  function switchMode(nextMode) {
    setMode(nextMode);
    setLocalError("");
    setSuccessMessage("");
  }

  return (
    <main className="auth-page auth-page-blue">
      <section className="auth-panel" aria-labelledby="loginTitle">
        <div className="brand-block">
          <p className="brand-kicker">Bumu PayGo</p>
          <h1 id="loginTitle">{isResetMode ? "Forgot Password" : "Customer Portal"}</h1>
          <p>
            {isResetMode
              ? "Request an OTP from admin before receiving a new password."
              : "Log in with your approved customer account to view payments, bike details, and alerts."}
          </p>
        </div>

        {isResetMode ? (
          <form className="login-form" noValidate onSubmit={handleResetSubmit}>
            <div className="field-group">
              <label htmlFor="resetEmail">Email address</label>
              <input
                id="resetEmail"
                name="resetEmail"
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                value={resetEmail}
                onChange={(event) => setResetEmail(event.target.value)}
                required
              />
            </div>

            <div className="field-group">
              <label htmlFor="resetPhone">Phone number</label>
              <input
                id="resetPhone"
                name="resetPhone"
                type="tel"
                autoComplete="tel"
                placeholder="+254..."
                value={resetPhone}
                onChange={(event) => setResetPhone(event.target.value)}
                required
              />
            </div>

            <p className="otp-note">Admin must send the OTP before the customer receives a new password.</p>

            <p className={`form-message ${successMessage ? "success-message" : "error-message"}`} role="status" aria-live="polite">
              {successMessage || localError}
            </p>

            <button className="primary-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Sending Request..." : "Request OTP"}
            </button>

            <button className="link-button" type="button" onClick={() => switchMode("login")}>
              Back to login
            </button>
          </form>
        ) : (
          <form className="login-form" noValidate onSubmit={handleSubmit}>
            <div className="field-group">
              <label htmlFor="email">Email address</label>
              <input
                id="email"
                name="email"
                type="email"
                autoComplete="email"
                placeholder="name@example.com"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
              />
            </div>

            <div className="field-group">
              <label htmlFor="password">Password</label>
              <div className="password-row">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  required
                />
                <button className="small-button" type="button" onClick={() => setShowPassword((value) => !value)}>
                  {showPassword ? "Hide" : "Show"}
                </button>
              </div>
            </div>

            <button className="link-button forgot-button" type="button" onClick={() => switchMode("reset")}>
              Forgot password?
            </button>

            <p className="form-message error-message" role="status" aria-live="polite">
              {localError || errorMessage}
            </p>

            <button className="primary-button" type="submit" disabled={isSubmitting}>
              {isSubmitting ? "Logging In..." : "Log In"}
            </button>
          </form>
        )}
      </section>
    </main>
  );
}

function PortalShell({ activePage, title, subtitle, customer, portalData, onNavigate, onLogout, children }) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(() => localStorage.getItem("bumuAppInstalled") !== "true");
  const unreadCount = portalData.notifications.filter((notification) => notification.unread).length;
  const links = [
    ["dashboard", "Dashboard"],
    ["payment", "Make Payment"],
    ["history", "Payment History"],
    ["rider", "Rider"],
    ["notifications", "Notifications"],
    ["profile", "Profile"],
    ["settings", "Settings"]
  ];

  useEffect(() => {
    function handleBeforeInstallPrompt(event) {
      event.preventDefault();
      setInstallPrompt(event);
      setShowInstallButton(localStorage.getItem("bumuAppInstalled") !== "true");
    }

    function handleAppInstalled() {
      localStorage.setItem("bumuAppInstalled", "true");
      setShowInstallButton(false);
      setInstallPrompt(null);
    }

    window.addEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
    window.addEventListener("appinstalled", handleAppInstalled);

    return () => {
      window.removeEventListener("beforeinstallprompt", handleBeforeInstallPrompt);
      window.removeEventListener("appinstalled", handleAppInstalled);
    };
  }, []);

  async function handleInstallClick() {
    if (!installPrompt) return;
    installPrompt.prompt();
    await installPrompt.userChoice;
    setInstallPrompt(null);
  }

  return (
    <main className="portal-page">
      <aside className="portal-sidebar">
        <div className="sidebar-brand">
          <span>Bumu</span>
          <strong>PayGo</strong>
        </div>
        <button
          className="menu-toggle nav-menu-toggle"
          type="button"
          aria-label={menuOpen ? "Close customer menu" : "Open customer menu"}
          aria-expanded={menuOpen}
          onClick={() => setMenuOpen((value) => !value)}
        >
          <span></span>
          <span></span>
          <span></span>
        </button>
        <nav className={`portal-nav ${menuOpen ? "menu-open" : "menu-hidden"}`} aria-label="Customer portal navigation">
          {links.map(([page, label]) => (
            <button
              key={page}
              className={activePage === page ? "active" : ""}
              type="button"
              onClick={() => {
                onNavigate(page);
                setMenuOpen(false);
              }}
            >
              {label}
            </button>
          ))}
          <button className="logout-nav-button" type="button" onClick={onLogout}>
            Log Out
          </button>
        </nav>
      </aside>

      <section className="portal-content">
        <header className="app-header">
          <div className="header-title">
            <p className="brand-kicker">Bumu PayGo</p>
            <h1>{title}</h1>
            <p>{subtitle}</p>
          </div>
          <div className="header-actions">
            <button className="notification-button" type="button" aria-label="Notifications" onClick={() => onNavigate("notifications")}>
              <span aria-hidden="true">!</span>
              <strong>{unreadCount}</strong>
            </button>
          </div>
        </header>
        {children}
        {showInstallButton && (
          <footer className="portal-footer">
            <button className="install-button" type="button" onClick={handleInstallClick}>
              Install Bumu
            </button>
          </footer>
        )}
      </section>
    </main>
  );
}

function DashboardPage({ customer, portalData, onNavigate, onLogout }) {
  const { bike, summary, payments, notifications } = portalData;
  const progress = summary.progress || 0;

  return (
    <PortalShell
      activePage="dashboard"
      title="Customer Dashboard"
      subtitle={`Welcome back, ${customer.name}.`}
      customer={customer}
      portalData={portalData}
      onNavigate={onNavigate}
      onLogout={onLogout}
    >
      <DashboardPaymentNotice portalData={portalData} />

      <section className="welcome-panel customer-welcome-panel">
        <div>
          <span>Customer account</span>
          <strong>{customer.name}</strong>
          <small>{customer.phone} | {formatValue(customer.email)}</small>
        </div>
        <button className="primary-button" type="button" onClick={() => onNavigate("payment")}>Pay Now</button>
      </section>

      <section className="stats dashboard-stats" aria-label="Payment summary">
        <StatCard label="Paid" value={formatKes(summary.totalPaid)} letter="P" tone="blue" />
        <StatCard label="Balance" value={formatKes(summary.balance)} letter="B" tone="green" />
        <StatCard label="Total Price" value={formatKes(bike?.totalPrice)} letter="T" tone="blue" />
        <StatCard label="Next Due" value={formatValue(bike?.nextDueDate)} letter="D" tone="green" />
      </section>

      <section className="dashboard-layout" aria-label="Customer account summary">
        <article className="bike-card">
          <div className="bike-card-header">
            <div>
              <span className="card-label">Bike Account</span>
              <h2>{formatValue(bike?.model)}</h2>
              <p>Serial: {formatValue(bike?.serialNumber)}</p>
            </div>
            <span className="status-badge">{formatValue(bike?.status, "No bike")}</span>
          </div>

          <div
            className="progress-ring"
            style={{ "--progress": `${progress}%` }}
            aria-label={`${progress} percent paid`}
          >
            <span>{progress}%</span>
            <small>paid</small>
          </div>

          <button className="primary-button wide-button" type="button" onClick={() => onNavigate("payment")}>Pay Now</button>
        </article>

        <section className="side-stack">
          <SummaryCard label="Installment Plan" title={formatKes(bike?.dailyInstallment)} text="Daily repayment amount from the active bike plan." />
          <SummaryCard
            label="Last Payment"
            title={payments[0] ? formatKes(payments[0].amount) : "No payments"}
            text={payments[0] ? `${formatValue(payments[0].receipt)} on ${payments[0].date}` : "Payment records will appear after Supabase receives them."}
          />
          <SummaryCard
            label="Notifications"
            title={`${notifications.filter((item) => item.unread).length} unread`}
            text="Payment reminders and account alerts from Supabase."
          />
        </section>
      </section>

      <section className="dashboard-grid lower-grid" aria-label="Customer quick views">
        <article className="summary-card">
          <div className="section-title-row">
            <div>
              <span className="card-label">Payment History</span>
              <h2>Recent Payments</h2>
            </div>
            <button className="link-button" type="button" onClick={() => onNavigate("history")}>View All</button>
          </div>
          <div className="table-list" role="table" aria-label="Recent payments">
            {payments.slice(0, 3).map((payment) => (
              <PaymentRow key={payment.id} date={payment.date} amount={formatKes(payment.amount)} status={payment.status} />
            ))}
            {!payments.length && <p>No payment records yet.</p>}
          </div>
        </article>

        <article className="summary-card">
          <div className="section-title-row">
            <div>
              <span className="card-label">Notifications</span>
              <h2>Account Alerts</h2>
            </div>
            <button className="link-button" type="button" onClick={() => onNavigate("notifications")}>Open</button>
          </div>
          <ul className="notification-list">
            {notifications.slice(0, 3).map((notification) => <li key={notification.id}>{notification.message}</li>)}
            {!notifications.length && <li>No alerts yet.</li>}
          </ul>
        </article>
      </section>
    </PortalShell>
  );
}

function DashboardPaymentNotice({ portalData }) {
  const { bike, summary, payments } = portalData;

  return (
    <section className="dashboard-payment-notice" aria-label="Customer payment reminder">
      <div className="notice-track">
        <p>
          <span className="notice-green">You have paid <strong>{formatKes(summary.totalPaid)}</strong>.</span>{" "}
          <span className="notice-blue">Your remaining balance is <strong>{formatKes(summary.balance)}</strong>.</span>{" "}
          <span className="notice-white">Daily installment: <strong>{formatKes(bike?.dailyInstallment)}</strong>.</span>{" "}
          <span className="notice-green">Expected final payment date: <strong>{formatValue(bike?.finalPaymentDate)}</strong>.</span>{" "}
          <span className="notice-blue">Latest payment: <strong>{payments[0]?.date || "No payment yet"}</strong>.</span>
        </p>
      </div>
    </section>
  );
}

function PaymentPage({ customer, portalData, onNavigate, onRefresh, onLogout }) {
  const { bike, paymentPlan } = portalData;
  const [amount, setAmount] = useState("");
  const [amountError, setAmountError] = useState("");
  const [message, setMessage] = useState("");
  const [messageType, setMessageType] = useState("");
  const [isSending, setIsSending] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState({
    title: "Ready",
    text: "No payment request has been sent yet."
  });
  const formattedAmount = useMemo(() => Number(amount || 0).toLocaleString("en-KE"), [amount]);
  const suggestedAmounts = paymentPlan.suggestedAmounts.length ? paymentPlan.suggestedAmounts : [paymentPlan.dailyInstallment].filter(Boolean);

  async function handleSubmit(event) {
    event.preventDefault();
    const numericAmount = Number(amount);
    setAmountError("");
    setMessage("");
    setMessageType("");

    if (!numericAmount || numericAmount <= 0) {
      setAmountError("Enter a valid amount.");
      return;
    }

    setIsSending(true);
    setPaymentStatus({
      title: "Processing",
      text: "Creating the Supabase payment request."
    });

    try {
      await createPaymentRequest({
        customerId: customer.id,
        bikeId: bike?.id,
        amount: numericAmount,
        phone: customer.phone
      });
      await createPaymentNotification({
        customerId: customer.id,
        title: "Payment Request Created",
        message: `A payment request for ${formatKes(numericAmount)} was created.`,
        type: "payment"
      });
      setPaymentStatus({
        title: "Payment Request Sent",
        text: "The backend can now process STK Push and update payment status."
      });
      setMessage("Payment request saved in Supabase.");
      setMessageType("success-message");
      await onRefresh();
    } catch (error) {
      setPaymentStatus({
        title: "Payment Failed",
        text: error.message
      });
      setMessage("Payment request failed. Check Supabase configuration and policies.");
      setMessageType("error-message");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <PortalShell
      activePage="payment"
      title="Make Payment"
      subtitle={`${customer.name}, create an M-Pesa payment request.`}
      customer={customer}
      portalData={portalData}
      onNavigate={onNavigate}
      onLogout={onLogout}
    >
      <section className="payment-layout">
        <article className="payment-panel">
          <div className="payment-panel-heading">
            <div>
              <span className="card-label">M-Pesa STK Push</span>
              <h2>Payment Details</h2>
              <p>Enter the amount to send to the backend payment flow.</p>
            </div>
            <span className="status-badge">Secure</span>
          </div>

          <form className="payment-form" noValidate onSubmit={handleSubmit}>
            <div className="field-group">
              <label htmlFor="paymentAmount">Amount in KES</label>
              <input
                id="paymentAmount"
                name="paymentAmount"
                type="number"
                min="1"
                step="1"
                placeholder="Enter amount"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                required
              />
              <small className="field-error">{amountError}</small>
            </div>

            {!!suggestedAmounts.length && (
              <div>
                <span className="metric-label">Suggested amounts</span>
                <div className="suggested-amounts" aria-label="Suggested payment amounts">
                  {suggestedAmounts.map((suggestedAmount) => (
                    <button key={suggestedAmount} type="button" onClick={() => setAmount(String(suggestedAmount))}>
                      {formatKes(suggestedAmount)}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="payment-confirm">
              <div>
                <span className="metric-label">Phone receiving STK Push</span>
                <strong>{customer.phone}</strong>
              </div>
              <div>
                <span className="metric-label">Amount to send</span>
                <strong>{amount ? `KES ${formattedAmount}` : "KES 0"}</strong>
              </div>
            </div>

            <div className="payment-note">
              The STK Push provider should be connected on the backend after this request is created.
            </div>

            <p className={`form-message ${messageType}`} role="status" aria-live="polite">
              {message}
            </p>
            <button className="primary-button wide-button" type="submit" disabled={isSending}>
              {isSending && <span className="button-spinner" aria-hidden="true"></span>}
              {isSending ? "Creating Request..." : "Send Payment Request"}
            </button>
          </form>
        </article>

        <aside className="payment-summary-panel">
          <span className="card-label">Payment Summary</span>
          <SummaryLine label="Account balance" value={formatKes(portalData.summary.balance)} />
          <SummaryLine label="Next due amount" value={formatKes(bike?.dailyInstallment)} />
          <SummaryLine label="Due date" value={formatValue(bike?.nextDueDate)} />
          <SummaryLine label="Bike account" value={formatValue(bike?.model)} />
          <div className="payment-status-box">
            <span className="card-label">Payment Status</span>
            <h2>{paymentStatus.title}</h2>
            <p>{paymentStatus.text}</p>
          </div>
        </aside>
      </section>
    </PortalShell>
  );
}

function PaymentHistoryPage({ customer, portalData, onNavigate, onLogout }) {
  const pageSize = 5;
  const [currentPage, setCurrentPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(portalData.payments.length / pageSize));
  const visiblePayments = portalData.payments.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  function handleDownloadReceipt(payment) {
    const receiptText = [
      "Bumu PayGo Payment Receipt",
      `Customer: ${customer.name}`,
      `Date: ${payment.date}`,
      `Phone Number Used: ${payment.phone}`,
      `Amount Paid: ${formatKes(payment.amount)}`,
      `M-Pesa Receipt: ${payment.receipt}`,
      `Status: ${payment.status}`
    ].join("\n");
    const blob = new Blob([receiptText], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `receipt-${payment.receipt || payment.id}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  }

  return (
    <PortalShell
      activePage="history"
      title="Payment History"
      subtitle={`${customer.name}, review payment dates, receipts, and status.`}
      customer={customer}
      portalData={portalData}
      onNavigate={onNavigate}
      onLogout={onLogout}
    >
      <section className="history-panel">
        <div className="section-title-row">
          <div>
            <span className="card-label">Payment Records</span>
            <h2>All Payments</h2>
          </div>
          <button className="secondary-button" type="button" onClick={() => onNavigate("payment")}>Make Payment</button>
        </div>

        <div className="payment-history-table" role="table" aria-label="Customer payment history">
          {visiblePayments.map((payment) => (
            <div className="history-table-row" role="row" key={payment.id}>
              <span role="cell" data-label="Payment Date">{formatValue(payment.date)}</span>
              <span role="cell" data-label="Month">{formatValue(payment.month)}</span>
              <span role="cell" data-label="Phone Number Used">{formatValue(payment.phone)}</span>
              <strong role="cell" data-label="Amount Paid">{formatKes(payment.amount)}</strong>
              <strong role="cell" data-label="Remaining Balance">{payment.remainingBalance === null ? "Calculated by summary" : formatKes(payment.remainingBalance)}</strong>
              <span role="cell" data-label="M-Pesa Receipt">{formatValue(payment.receipt)}</span>
              <span role="cell" data-label="Status">
                <em className={payment.status === "Completed" ? "status-success" : "status-pending"}>{payment.status}</em>
              </span>
              <span role="cell" data-label="Receipt" className="receipt-cell">
                <button
                  className="receipt-icon-button"
                  type="button"
                  disabled={payment.status !== "Completed"}
                  onClick={() => handleDownloadReceipt(payment)}
                >
                  Receipt
                </button>
              </span>
            </div>
          ))}
          {!visiblePayments.length && <p>No payment records found.</p>}
        </div>

        <div className="pagination-row" aria-label="Payment history pagination">
          <button className="secondary-button" type="button" disabled={currentPage === 1} onClick={() => setCurrentPage((page) => Math.max(1, page - 1))}>
            Previous
          </button>
          <span>Page {currentPage} of {totalPages}</span>
          <button className="secondary-button" type="button" disabled={currentPage === totalPages} onClick={() => setCurrentPage((page) => Math.min(totalPages, page + 1))}>
            Next
          </button>
        </div>
      </section>
    </PortalShell>
  );
}

function RiderPage({ customer, portalData, onNavigate, onLogout }) {
  const { bike, summary } = portalData;
  const progress = summary.progress || 0;

  return (
    <PortalShell
      activePage="rider"
      title="Rider"
      subtitle={`${customer.name}, view your motorcycle account and ownership progress.`}
      customer={customer}
      portalData={portalData}
      onNavigate={onNavigate}
      onLogout={onLogout}
    >
      <section className="rider-layout">
        <article className="rider-panel">
          <div className="bike-card-header">
            <div>
              <span className="card-label">Bike Account</span>
              <h2>{formatValue(bike?.serialNumber)}</h2>
              <p>Active repayment account linked to {customer.name}.</p>
            </div>
            <span className="status-badge">{formatValue(bike?.status, "No bike")}</span>
          </div>

          <div className="rider-detail-grid">
            <DetailItem label="Motorcycle Model" value={formatValue(bike?.model)} />
            <DetailItem label="Serial / Chassis Number" value={formatValue(bike?.serialNumber)} />
            <DetailItem label="Assigned Date" value={formatValue(bike?.assignedDate)} />
            <DetailItem label="Installment Plan" value={formatKes(bike?.dailyInstallment)} />
            <DetailItem label="Total Price" value={formatKes(bike?.totalPrice)} />
            <DetailItem label="Amount Paid" value={formatKes(summary.totalPaid)} />
            <DetailItem label="Remaining Balance" value={formatKes(summary.balance)} />
            <DetailItem label="Account Status" value={formatValue(bike?.status, "No bike")} />
          </div>
        </article>

        <aside className="rider-progress-panel">
          <span className="card-label">Ownership Progress</span>
          <div className="progress-ring" style={{ "--progress": `${progress}%` }} aria-label={`${progress} percent ownership progress`}>
            <span>{progress}%</span>
            <small>paid</small>
          </div>
          <p>{formatKes(summary.totalPaid)} paid out of {formatKes(bike?.totalPrice)}.</p>
          <button className="primary-button wide-button" type="button" onClick={() => onNavigate("payment")}>Make Payment</button>
        </aside>
      </section>
    </PortalShell>
  );
}

function NotificationsPage({ customer, portalData, onNavigate, onLogout }) {
  return (
    <PortalShell
      activePage="notifications"
      title="Notifications"
      subtitle={`${customer.name}, view payment reminders and account alerts.`}
      customer={customer}
      portalData={portalData}
      onNavigate={onNavigate}
      onLogout={onLogout}
    >
      <section className="notifications-panel">
        <div className="section-title-row">
          <div>
            <span className="card-label">Account Alerts</span>
            <h2>Payment Notifications</h2>
          </div>
          <button className="secondary-button" type="button" onClick={() => onNavigate("payment")}>Make Payment</button>
        </div>

        <div className="notification-timeline">
          {portalData.notifications.map((notification) => (
            <article
              className={[
                "notification-item",
                notification.unread ? "unread" : "",
                notification.type === "overdue" ? "overdue" : ""
              ].filter(Boolean).join(" ")}
              key={notification.id}
            >
              <div>
                <span className="metric-label">{notification.date}</span>
                <h3>{notification.title}</h3>
                <p>{notification.message}</p>
              </div>
              {notification.unread && <span className="status-badge">New</span>}
            </article>
          ))}
          {!portalData.notifications.length && <p>No notifications found.</p>}
        </div>
      </section>
    </PortalShell>
  );
}

function ProfilePage({ customer, portalData, onNavigate, onLogout }) {
  const supportLink = customer.supportPhone ? `tel:${customer.supportPhone}` : customer.supportEmail ? `mailto:${customer.supportEmail}` : "";

  return (
    <PortalShell
      activePage="profile"
      title="Profile"
      subtitle="View your customer profile information."
      customer={customer}
      portalData={portalData}
      onNavigate={onNavigate}
      onLogout={onLogout}
    >
      <section className="profile-layout">
        <article className="profile-panel">
          <div className="profile-photo-row">
            <div className="profile-avatar profile-avatar-large" aria-label="Customer profile photo">
              <span>{customer.name.charAt(0)}</span>
            </div>
            <div>
              <span className="card-label">Customer Profile</span>
              <h2>{customer.name}</h2>
              <p>Personal details are loaded from Supabase.</p>
            </div>
          </div>

          <div className="rider-detail-grid">
            <DetailItem label="Full Name" value={customer.name} />
            <DetailItem label="Email" value={formatValue(customer.email)} />
            <DetailItem label="Phone Number" value={customer.phone} />
            <DetailItem label="National ID" value={formatValue(customer.nationalId)} />
            <DetailItem label="Support Phone" value={formatValue(customer.supportPhone)} />
            <DetailItem label="Support Email" value={formatValue(customer.supportEmail)} />
          </div>

          {supportLink && (
            <div className="profile-support-row">
              <a className="support-link" href={supportLink}>Contact Support</a>
            </div>
          )}
        </article>
      </section>
    </PortalShell>
  );
}

function SettingsPage({ customer, portalData, onNavigate, onLogout }) {
  return (
    <PortalShell
      activePage="settings"
      title="Settings"
      subtitle="Manage your account preferences."
      customer={customer}
      portalData={portalData}
      onNavigate={onNavigate}
      onLogout={onLogout}
    >
      <section className="settings-layout">
        <article className="settings-panel">
          <span className="card-label">Security</span>
          <h2>Password Management</h2>
          <p>Use Supabase Auth password recovery or update flows from your backend to manage customer passwords.</p>
        </article>
      </section>
    </PortalShell>
  );
}

function SummaryLine({ label, value }) {
  return (
    <div className="summary-line">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function StatCard({ label, value, letter, tone }) {
  return (
    <article className="stat-card">
      <span className={`stat-icon ${tone}`}>{letter}</span>
      <span className="stat-label">{label}</span>
      <strong className="stat-value">{value}</strong>
    </article>
  );
}

function DetailItem({ label, value }) {
  return (
    <div>
      <span className="metric-label">{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function SummaryCard({ label, title, text }) {
  return (
    <article className="summary-card">
      <span className="card-label">{label}</span>
      <h2>{title}</h2>
      <p>{text}</p>
    </article>
  );
}

function PaymentRow({ date, amount, status }) {
  return (
    <div role="row">
      <span role="cell">{date}</span>
      <strong role="cell">{amount}</strong>
      <em role="cell">{status}</em>
    </div>
  );
}

export default App;
