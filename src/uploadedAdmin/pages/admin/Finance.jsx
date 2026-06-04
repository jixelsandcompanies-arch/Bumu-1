import { DataTable } from "../../components/ui/DataTable.jsx";
import { PageHeader } from "../../components/ui/PageHeader.jsx";
import { StatCard } from "../../components/ui/StatCard.jsx";
import { StatusBadge } from "../../components/ui/StatusBadge.jsx";
import { useAdminData } from "../../features/admin/AdminDataContext.jsx";
import { findAgent, findCustomer } from "../../lib/admin/lookups.js";
import { formatKes } from "../../lib/formatting/currency.js";
import { AlertTriangle, BadgeDollarSign, ReceiptText, WalletCards } from "lucide-react";

export default function Finance() {
  const { agents, customers, payments = [] } = useAdminData();
  const totalCollected = payments
    .filter((payment) => payment.status === "success")
    .reduce((sum, payment) => sum + payment.amount, 0);
  const pendingPayments = payments.filter((payment) => payment.status === "pending").length;
  const reconciliationFlags = payments.filter((payment) =>
    ["unmatched", "manual_review"].includes(payment.reconciliationStatus)
  ).length;
  const commissionBalance = agents.reduce((sum, agent) => sum + agent.commissionBalance, 0);

  return (
    <section className="page-stack">
      <PageHeader
        eyebrow="Finance management"
        title="Collections and reconciliation"
        description="Monitor payment records, reconciliation state, and agent commission exposure."
      />

      <div className="finance-grid">
        <StatCard icon={WalletCards} label="Total collected" value={formatKes(totalCollected)} detail="Successful payments" />
        <StatCard icon={ReceiptText} label="Pending payments" value={pendingPayments} detail="Awaiting completion" />
        <StatCard icon={AlertTriangle} label="Reconciliation flags" value={reconciliationFlags} detail="Unmatched/manual review" />
        <StatCard icon={BadgeDollarSign} label="Commission balance" value={formatKes(commissionBalance)} detail="Unpaid agent commissions" />
      </div>

      <DataTable
        columns={[
          { key: "receipt", label: "Receipt" },
          {
            key: "customer",
            label: "Customer",
            render: (row) => findCustomer(customers, row.customerId)?.name || "Unknown customer"
          },
          {
            key: "agent",
            label: "Agent",
            render: (row) => findAgent(agents, row.agentId)?.name || "Unassigned"
          },
          { key: "amount", label: "Amount", render: (row) => formatKes(row.amount) },
          { key: "status", label: "Payment", render: (row) => <StatusBadge status={row.status} /> },
          {
            key: "reconciliationStatus",
            label: "Reconciliation",
            render: (row) => <StatusBadge status={row.reconciliationStatus} />
          },
          { key: "paidAt", label: "Date" }
        ]}
        rows={payments}
      />
    </section>
  );
}
