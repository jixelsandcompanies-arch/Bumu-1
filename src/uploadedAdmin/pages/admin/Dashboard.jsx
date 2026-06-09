import {
  AlertTriangle,
  BadgeDollarSign,
  Bell,
  Bike,
  ClipboardCheck,
  ClipboardList,
  FileWarning,
  ShieldAlert,
  ReceiptText,
  UserCog,
  UserCheck,
  UserRoundCheck,
  UserRoundX,
  Users,
  WalletCards
} from "lucide-react";
import { createElement } from "react";
import { Link } from "react-router-dom";
import { DataTable } from "../../components/ui/DataTable.jsx";
import { PageHeader } from "../../components/ui/PageHeader.jsx";
import { StatCard } from "../../components/ui/StatCard.jsx";
import { StatusBadge } from "../../components/ui/StatusBadge.jsx";
import { useAdminData } from "../../features/admin/AdminDataContext.jsx";
import { formatKes } from "../../lib/formatting/currency.js";

export default function Dashboard() {
  const {
    agents,
    applications,
    bikes,
    customers,
    notifications = [],
    payments = [],
    users = []
  } = useAdminData();

  const pending = applications.filter((item) => item.status === "pending_screening").length;
  const approved = applications.filter((item) => item.status === "approved").length;
  const infoRequired = applications.filter((item) => item.status === "info_required").length;
  const duplicateFlags = applications.filter((item) => item.duplicateNationalId).length;
  const failedKinOtp = applications.filter((item) => !item.nextOfKinOtpVerified).length;
  const unclearDocuments = applications.filter((item) =>
    (item.documents || []).some((document) => document.status === "unclear")
  ).length;

  const activeAgents = agents.filter((item) => item.status === "active").length;
  const pendingAgents = agents.filter((item) => item.status === "pending_approval").length;
  const suspendedAgents = agents.filter((item) => item.status === "suspended").length;
  const activeUsers = users.filter((item) => item.status === "active").length;
  const adminUsers = users.filter((item) =>
    ["super_admin", "back_office_officer"].includes(item.role)
  ).length;
  const availableBikes = bikes.filter((item) => item.status === "available").length;
  const reservedBikes = bikes.filter((item) => item.status === "reserved").length;
  const assignedBikes = bikes.filter((item) => item.status === "assigned").length;

  const totalDeposits = applications.reduce((sum, application) => sum + application.depositAmount, 0);
  const collectibleCustomers = customers.filter((customer) => customer.applicationStatus !== "rejected" && customer.repaymentStatus !== "rejected");
  const totalBalances = collectibleCustomers.reduce((sum, customer) => sum + customer.balance, 0);
  const unpaidCommissions = agents.reduce((sum, agent) => sum + agent.commissionBalance, 0);
  const totalCollected = payments
    .filter((payment) => payment.status === "success")
    .reduce((sum, payment) => sum + payment.amount, 0);
  const pendingPayments = payments.filter((payment) => payment.status === "pending").length;
  const unmatchedPayments = payments.filter((payment) =>
    ["unmatched", "manual_review"].includes(payment.reconciliationStatus)
  ).length;
  const unreadNotifications = notifications.filter((notification) => notification.status === "unread").length;
  const expectedCollections = totalBalances + totalDeposits;

  const screeningRows = applications
    .filter((item) => ["pending_screening", "info_required"].includes(item.status))
    .concat(applications.filter((item) => item.duplicateNationalId))
    .filter((item, index, list) => list.findIndex((record) => record.id === item.id) === index);

  const reviewColumns = [
    { key: "id", label: "Application" },
    {
      key: "customer",
      label: "Customer",
      render: (row) => customers.find((customer) => customer.id === row.customerId)?.name
    },
    {
      key: "risk",
      label: "Risk",
      render: (row) => (row.duplicateNationalId ? "Duplicate ID" : "Standard review")
    },
    { key: "status", label: "Status", render: (row) => <StatusBadge status={row.status} /> },
    {
      key: "action",
      label: "Action",
      render: (row) => <Link to={`/admin/applications/${row.id}`}>Open review</Link>
    }
  ];

  return (
    <section className="page-stack dashboard-page">
      <div className="dashboard-header-band">
        <PageHeader
          eyebrow="Admin overview"
          title="Operational dashboard"
          description="Control customer screening, agent activity, bike inventory, finance visibility, reports, and audit risk from one Bumu PAYGO admin view."
        />
      </div>

      <section className="dashboard-section">
        <div className="section-title">
          <p className="eyebrow">Overview</p>
          <h3>Control summary</h3>
        </div>
        <div className="stat-grid dashboard-summary-grid">
          <StatCard icon={ClipboardList} label="Pending screening" value={pending} detail="Needs review" tone="warning" to="/admin/applications" />
          <StatCard icon={FileWarning} label="Info required" value={infoRequired} detail="Returned to agent" to="/admin/applications" />
          <StatCard icon={ClipboardCheck} label="Approved" value={approved} detail="Activated cases" tone="success" to="/admin/customers" />
          <StatCard icon={ShieldAlert} label="Duplicate IDs" value={duplicateFlags} detail="Risk flags" tone="danger" to="/admin/applications" />
          <StatCard icon={Users} label="Staff active" value={activeUsers} detail={`${users.length} user records`} to="/admin/agents" />
          <StatCard icon={WalletCards} label="Outstanding" value={formatKes(totalBalances)} detail="Customer balance" to="/admin/customers" />
          <StatCard icon={Bell} label="Unread alerts" value={unreadNotifications} detail="Notifications" to="/admin/notifications" />
        </div>
      </section>

      <section className="dashboard-section">
        <div className="panel priority-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Screening operations</p>
              <h3>KYC approval queue</h3>
            </div>
            <Link to="/admin/applications">View all applications</Link>
          </div>

          <div className="operations-strip">
            <div>
              <strong>{pending}</strong>
              <span>Pending back-office review</span>
            </div>
            <div>
              <strong>{duplicateFlags}</strong>
              <span>Duplicate national ID flags</span>
            </div>
            <div>
              <strong>{unclearDocuments}</strong>
              <span>Document clarity issues</span>
            </div>
            <div>
              <strong>{failedKinOtp}</strong>
              <span>Next-of-kin OTP issues</span>
            </div>
          </div>

          <DataTable columns={reviewColumns} rows={screeningRows} />
        </div>
      </section>

      <div className="dashboard-grid">
        <section className="dashboard-section">
          <div className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Staff operations</p>
                <h3>Users and field agents</h3>
              </div>
              <Link to="/admin/agents">Manage agents</Link>
            </div>

            <div className="metric-list">
              <MetricRow icon={UserCog} label="Admin users" value={adminUsers} />
              <MetricRow icon={Users} label="Active users" value={activeUsers} />
              <MetricRow icon={UserRoundCheck} label="Active agents" value={activeAgents} />
              <MetricRow icon={UserCheck} label="Pending approval" value={pendingAgents} />
              <MetricRow icon={UserRoundX} label="Suspended agents" value={suspendedAgents} tone="danger" />
              <MetricRow icon={BadgeDollarSign} label="Commission balance" value={formatKes(unpaidCommissions)} />
            </div>
          </div>
        </section>

        <section className="dashboard-section">
          <div className="panel">
            <div className="panel-header">
              <div>
                <p className="eyebrow">Customer and bike accounts</p>
                <h3>Portfolio and inventory</h3>
              </div>
              <Link to="/admin/bikes">Open inventory</Link>
            </div>

            <div className="metric-list">
              <MetricRow icon={Users} label="Customer records" value={customers.length} />
              <MetricRow icon={Bike} label="Available bikes" value={availableBikes} />
              <MetricRow icon={Bike} label="Reserved bikes" value={reservedBikes} />
              <MetricRow icon={Bike} label="Assigned bikes" value={assignedBikes} />
            </div>
          </div>
        </section>
      </div>

      <section className="dashboard-section">
        <div className="panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Finance snapshot</p>
              <h3>Collections and commission visibility</h3>
            </div>
          </div>

          <div className="finance-grid">
            <StatCard icon={WalletCards} label="Total collected" value={formatKes(totalCollected)} detail="Successful payments" to="/admin/finance" />
            <StatCard icon={WalletCards} label="Expected collections" value={formatKes(expectedCollections)} detail="Deposits plus balances" to="/admin/finance" />
            <StatCard icon={ReceiptText} label="Pending payments" value={pendingPayments} detail="Payment records pending" tone="warning" to="/admin/finance" />
            <StatCard icon={AlertTriangle} label="Reconciliation flags" value={unmatchedPayments} detail="Unmatched/manual review" tone="warning" to="/admin/finance" />
            <StatCard icon={BadgeDollarSign} label="Unpaid commissions" value={formatKes(unpaidCommissions)} detail="Agent commission balance" to="/admin/finance" />
          </div>
        </div>
      </section>
    </section>
  );
}

function MetricRow({ icon, label, value, tone = "default" }) {
  return (
    <div className={`metric-row metric-${tone}`}>
      {createElement(icon, { size: 21, strokeWidth: 2.4 })}
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}
